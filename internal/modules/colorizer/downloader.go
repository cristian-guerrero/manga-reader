package colorizer

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const (
	pythonStandaloneURL = "https://github.com/indygreg/python-build-standalone/releases/download/20241206/cpython-3.12.8+20241206-%s-full.tar.zst"
	backendRepoURL      = "https://github.com/cristian-guerrero/Manga-Colorizer/archive/refs/heads/cristian-dev.zip"
	alacganModelURL     = "https://drive.usercontent.google.com/download?id=12cKll-A49Dte4y9nBs9ID2u0W8bAjqQQ&export=download&confirm=t"
)

func (m *Manager) runInstallation() {
	defer func() {
		if r := recover(); r != nil {
			m.setStatus(StatusError, fmt.Sprintf("Installation panic: %v", r), 0)
		}
	}()

	if err := m.installPython(); err != nil {
		m.setStatus(StatusError, fmt.Sprintf("Failed to install Python: %v", err), 0)
		return
	}

	if err := m.installBackend(); err != nil {
		m.setStatus(StatusError, fmt.Sprintf("Failed to install backend: %v", err), 0)
		return
	}

	if err := m.installDependencies(); err != nil {
		m.setStatus(StatusError, fmt.Sprintf("Failed to install dependencies: %v", err), 0)
		return
	}

	m.setStatus(StatusReady, "Installation complete! You can now start the colorizer.", 100)
}

func (m *Manager) installPython() error {
	pyDir := filepath.Join(m.baseDir, "python-runtime")

	if found := findPythonExecutable(pyDir, runtime.GOOS); found != "" {
		m.mu.Lock()
		m.pythonPath = found
		m.mu.Unlock()
		m.setStatus(StatusReady, "Python runtime found", 30)
		return nil
	}

	m.setStatus(StatusDownloadingPy, "Downloading Python runtime...", 10)

	if err := os.MkdirAll(pyDir, 0755); err != nil {
		return fmt.Errorf("failed to create python dir: %w", err)
	}

	arch := runtime.GOARCH
	osName := runtime.GOOS

	// Map to python-build-standalone filenames
	var pyURL string
	switch {
	case osName == "windows" && arch == "amd64":
		pyURL = "https://github.com/indygreg/python-build-standalone/releases/download/20241206/cpython-3.12.8+20241206-x86_64-pc-windows-msvc-shared-install_only.tar.gz"
	case osName == "windows" && arch == "arm64":
		pyURL = "https://github.com/indygreg/python-build-standalone/releases/download/20241206/cpython-3.12.8+20241206-aarch64-pc-windows-msvc-shared-install_only.tar.gz"
	case osName == "linux" && arch == "amd64":
		pyURL = "https://github.com/indygreg/python-build-standalone/releases/download/20241206/cpython-3.12.8+20241206-x86_64-unknown-linux-gnu-install_only.tar.gz"
	case osName == "darwin" && arch == "amd64":
		pyURL = "https://github.com/indygreg/python-build-standalone/releases/download/20241206/cpython-3.12.8+20241206-x86_64-apple-darwin-install_only.tar.gz"
	case osName == "darwin" && arch == "arm64":
		pyURL = "https://github.com/indygreg/python-build-standalone/releases/download/20241206/cpython-3.12.8+20241206-aarch64-apple-darwin-install_only.tar.gz"
	default:
		return fmt.Errorf("unsupported platform: %s/%s", osName, arch)
	}

	m.setStatus(StatusDownloadingPy, fmt.Sprintf("Downloading Python for %s/%s...", osName, arch), 10)

	tmpFile, err := os.CreateTemp("", "python-*.tar.gz")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	dlClient := &http.Client{
		Timeout: 10 * time.Minute,
		Transport: &http.Transport{
			ResponseHeaderTimeout: 30 * time.Second,
		},
	}

	req, err := http.NewRequest("GET", pyURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "Manga-Colorizer-Installer/1.0")

	resp, err := dlClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to download Python: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Python download returned status %d", resp.StatusCode)
	}

	totalSize := resp.ContentLength
	var downloaded int64

	buf := make([]byte, 64*1024)
	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			if _, wErr := tmpFile.Write(buf[:n]); wErr != nil {
				return fmt.Errorf("failed to write: %w", wErr)
			}
			downloaded += int64(n)
			if totalSize > 0 {
				pct := 10.0 + (float64(downloaded)/float64(totalSize))*20.0
				m.setStatus(StatusDownloadingPy, fmt.Sprintf("Downloading Python... %.0f%% (%.1f MB)", pct/30.0*100, float64(downloaded)/1024/1024), pct)
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("download error: %w", err)
		}
	}

	m.setStatus(StatusInstalling, "Extracting Python runtime...", 30)

	tmpFile.Seek(0, io.SeekStart)

	extractDir := filepath.Join(pyDir, "extract")
	if err := extractTarGz(tmpFile, extractDir); err != nil {
		return fmt.Errorf("failed to extract Python: %w", err)
	}

	// Move extracted files to pyDir
	if err := moveDirContents(extractDir, pyDir); err != nil {
		return fmt.Errorf("failed to move Python files: %w", err)
	}
	os.RemoveAll(extractDir)

	// Find python.exe (may be in pyDir/python/python.exe on Windows)
	actualPyExe := findPythonExecutable(pyDir, runtime.GOOS)
	if actualPyExe == "" {
		return fmt.Errorf("could not find python executable after extraction")
	}

	m.pythonPath = actualPyExe
	m.setStatus(StatusReady, "Python runtime installed", 40)
	return nil
}

func findPythonExecutable(root string, goOS string) string {
	candidates := []string{}

	if goOS == "windows" {
		candidates = []string{
			filepath.Join(root, "python", "python.exe"),
			filepath.Join(root, "python.exe"),
			filepath.Join(root, "Python3", "python.exe"),
		}
	} else {
		candidates = []string{
			filepath.Join(root, "bin", "python3"),
			filepath.Join(root, "bin", "python"),
			filepath.Join(root, "python3"),
		}
	}

	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}

	// Last resort: search recursively
	var foundPath string
	filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil || foundPath != "" {
			return nil
		}
		name := strings.ToLower(d.Name())
		if !d.IsDir() && (name == "python.exe" || name == "python3" || name == "python") {
			foundPath = path
			return filepath.SkipDir
		}
		return nil
	})
	return foundPath
}

func (m *Manager) installBackend() error {
	m.setStatus(StatusDownloadingBE, "Downloading colorizer backend...", 40)

	backendDir := filepath.Join(m.baseDir, "colorizer-backend")
	backendSrcDir := filepath.Join(backendDir, "Backend")

	if found := findBackendDir(backendDir); found != "" {
		m.mu.Lock()
		m.backendPath = found
		m.mu.Unlock()
		m.setStatus(StatusReady, "Backend already downloaded", 60)
		return nil
	}

	if err := os.MkdirAll(backendDir, 0755); err != nil {
		return fmt.Errorf("failed to create backend dir: %w", err)
	}

	tmpFile, err := os.CreateTemp("", "backend-*.zip")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	// Use a client with timeout and proper headers to avoid GitHub blocking
	client := &http.Client{
		Timeout: 5 * time.Minute,
		Transport: &http.Transport{
			ResponseHeaderTimeout: 30 * time.Second,
		},
	}

	req, err := http.NewRequest("GET", backendRepoURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "Manga-Colorizer-Installer/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to download backend: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("backend download returned status %d", resp.StatusCode)
	}

	totalSize := resp.ContentLength
	var downloaded int64

	buf := make([]byte, 64*1024)
	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			if _, wErr := tmpFile.Write(buf[:n]); wErr != nil {
				return fmt.Errorf("failed to write: %w", wErr)
			}
			downloaded += int64(n)
			if totalSize > 0 {
				pct := 40.0 + (float64(downloaded)/float64(totalSize))*20.0
				m.setStatus(StatusDownloadingBE, fmt.Sprintf("Downloading backend... %.0f%% (%.1f MB / %.1f MB)", pct/60.0*100, float64(downloaded)/1024/1024, float64(totalSize)/1024/1024), pct)
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("download error: %w", err)
		}
	}

	m.setStatus(StatusInstalling, "Extracting backend...", 60)

	tmpFile.Seek(0, io.SeekStart)
	if err := extractZipToDir(tmpFile, backendDir); err != nil {
		return fmt.Errorf("failed to extract backend: %w", err)
	}

	extractedDir := filepath.Join(backendDir, "Manga-Colorizer-revamp")
	if _, err := os.Stat(extractedDir); err == nil {
		if err := moveDirContents(extractedDir, backendDir); err != nil {
			return fmt.Errorf("failed to move backend files: %w", err)
		}
		os.RemoveAll(extractedDir)
	}

	found := findBackendDir(backendDir)
	if found == "" {
		if _, err := os.Stat(backendSrcDir); err == nil {
			found = backendSrcDir
		} else {
			return fmt.Errorf("could not find Backend folder with app-stream.py")
		}
	}

	m.backendPath = found
	m.setStatus(StatusReady, "Backend downloaded", 70)
	return nil
}

func findBackendDir(root string) string {
	if _, err := os.Stat(filepath.Join(root, "app-stream.py")); err == nil {
		return root
	}

	backendSub := filepath.Join(root, "Backend")
	if _, err := os.Stat(filepath.Join(backendSub, "app-stream.py")); err == nil {
		return backendSub
	}

	entries, _ := os.ReadDir(root)
	for _, entry := range entries {
		if entry.IsDir() {
			if found := findBackendDir(filepath.Join(root, entry.Name())); found != "" {
				return found
			}
		}
	}
	return ""
}

func (m *Manager) installDependencies() error {
	m.setStatus(StatusInstallingDeps, "Installing Python dependencies...", 70)

	requirementsPath := filepath.Join(m.backendPath, "requirements.txt")
	if _, err := os.Stat(requirementsPath); err != nil {
		return fmt.Errorf("requirements.txt not found at %s", requirementsPath)
	}

	// First ensure pip is bootstrapped
	ensureCmd := exec.Command(m.pythonPath, "-m", "ensurepip", "--upgrade")
	ensureCmd.Dir = m.backendPath
	ensureCmd.SysProcAttr = hideConsoleAttr()
	ensureCmd.Env = hideEnv()
	ensureCmd.Run()

	// Install requirements from requirements.txt
	m.setStatus(StatusInstallingDeps, "Installing pip requirements...", 70)
	output, err := runHiddenPythonDir(m.backendPath, m.pythonPath, "-m", "pip", "install", "--no-cache-dir", "--no-warn-conflicts", "-r", requirementsPath)
	if err != nil {
		return fmt.Errorf("pip install failed: %v\n%s", err, string(output))
	}

	// Explicitly install einops (may not have been captured in requirements output)
	m.setStatus(StatusInstallingDeps, "Installing einops...", 75)
	einopsOut, einopsErr := runHiddenPythonDir(m.backendPath, m.pythonPath, "-m", "pip", "install", "--no-cache-dir", "--no-warn-conflicts", "einops")
	if einopsErr != nil {
		return fmt.Errorf("einops install failed: %v\n%s", einopsErr, string(einopsOut))
	}

	// Install PyTorch (CUDA 12.4 version for NVIDIA GPUs)
	m.setStatus(StatusInstallingDeps, "Installing PyTorch (CUDA)...", 85)
	torchOutput, err := runHiddenPythonDir(m.backendPath, m.pythonPath, "-m", "pip", "install", "--no-cache-dir", "--no-warn-conflicts", "torch", "torchvision", "--index-url", "https://download.pytorch.org/whl/cu124")
	if err != nil {
		return fmt.Errorf("torch install failed: %v\n%s", err, string(torchOutput))
	}

	// Verify einops can be imported
	m.setStatus(StatusInstallingDeps, "Verifying einops...", 90)
	verifyOut, verifyErr := runHiddenPythonDir(m.backendPath, m.pythonPath, "-c", "import einops; print('einops', einops.__version__)")
	if verifyErr != nil {
		debugOut, _ := runHiddenPythonDir(m.backendPath, m.pythonPath, "-c", "import sys; print('exe:', sys.executable); print('path:', sys.path)")
		return fmt.Errorf("einops not importable after install.\nDebug info:\n%s\npip output:\n%s", string(debugOut), string(output))
	}

	// Download AlacGAN model weights
	generatorPath := filepath.Join(m.backendPath, "networks", "generator.zip")
	if _, err := os.Stat(generatorPath); os.IsNotExist(err) {
		if err := m.downloadAlacGANModel(generatorPath); err != nil {
			fmt.Printf("[Colorizer] Warning: Failed to download AlacGAN model: %v\n", err)
		}
	}

	m.setStatus(StatusReady, fmt.Sprintf("Dependencies installed (einops %s)", strings.TrimSpace(string(verifyOut))), 95)
	return nil
}

func (m *Manager) downloadAlacGANModel(destPath string) error {
	m.setStatus(StatusInstallingDeps, "Downloading AlacGAN model...", 90)

	// Ensure networks directory exists
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return fmt.Errorf("failed to create networks dir: %w", err)
	}

	// Download to temp file first
	tmpFile, err := os.CreateTemp("", "alacgan-*.zip")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	client := &http.Client{
		Timeout: 30 * time.Minute,
		Transport: &http.Transport{
			ResponseHeaderTimeout: 60 * time.Second,
		},
	}

	req, err := http.NewRequest("GET", alacganModelURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "Manga-Colorizer-Installer/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to download model: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("model download returned status %d", resp.StatusCode)
	}

	totalSize := resp.ContentLength
	var downloaded int64
	buf := make([]byte, 64*1024)

	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			if _, wErr := tmpFile.Write(buf[:n]); wErr != nil {
				return fmt.Errorf("failed to write: %w", wErr)
			}
			downloaded += int64(n)
			if totalSize > 0 {
				m.setStatus(StatusInstallingDeps, fmt.Sprintf("Downloading model... %.0f%% (%.0f MB)", float64(downloaded)/float64(totalSize)*100, float64(downloaded)/1024/1024), 90)
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("download error: %w", err)
		}
	}

	// Move to destination
	if err := os.Rename(tmpFile.Name(), destPath); err != nil {
		// Fallback: copy
		src, _ := os.Open(tmpFile.Name())
		defer src.Close()
		dst, _ := os.Create(destPath)
		defer dst.Close()
		io.Copy(dst, src)
	}

	fmt.Printf("[Colorizer] AlacGAN model downloaded to %s (%d bytes)\n", destPath, downloaded)
	return nil
}

func (m *Manager) runStartServer() {
	m.setStatus(StatusStartingServer, "Starting colorizer server...", 95)

	cmd := exec.Command(
		m.pythonPath,
		"app-stream.py",
		"--no-ssl",
		"--device", "cuda",
		"--colorizer_type", "AlacGAN",
	)
	cmd.Dir = m.backendPath
	cmd.SysProcAttr = hideConsoleAttr()
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	m.mu.Lock()
	m.serverProcess = &managedProcess{cmd: cmd, running: true}
	m.mu.Unlock()

	if err := cmd.Start(); err != nil {
		m.setStatus(StatusError, fmt.Sprintf("Failed to start server: %v", err), 0)
		return
	}

	// Wait briefly to see if the process crashes immediately
	time.Sleep(3 * time.Second)
	if cmd.ProcessState == nil || !cmd.ProcessState.Exited() {
		m.setStatus(StatusRunning, "Colorizer server is running!", 100)
	} else {
		m.setStatus(StatusError, "Server crashed during startup. Check console for details.", 0)
		m.mu.Lock()
		m.serverProcess = nil
		m.mu.Unlock()
		return
	}

	// Wait for process to finish
	cmd.Wait()

	m.mu.Lock()
	if m.serverProcess != nil {
		m.serverProcess = nil
	}
	m.status = StatusReady
	m.mu.Unlock()
}

func extractTarGz(r io.Reader, dest string) error {
	gzr, err := gzip.NewReader(r)
	if err != nil {
		return fmt.Errorf("gzip: %w", err)
	}
	defer gzr.Close()

	tr := tar.NewReader(gzr)
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		target := filepath.Join(dest, header.Name)
		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0755); err != nil {
				return err
			}
		case tar.TypeReg:
			os.MkdirAll(filepath.Dir(target), 0755)
			f, err := os.Create(target)
			if err != nil {
				return err
			}
			if _, err := io.Copy(f, tr); err != nil {
				f.Close()
				return err
			}
			f.Close()
		}
	}
	return nil
}

func extractZipToDir(r io.ReaderAt, dest string) error {
	stat, err := r.(io.Seeker).Seek(0, io.SeekEnd)
	if err != nil {
		return err
	}
	r.(io.Seeker).Seek(0, io.SeekStart)

	zr, err := zip.NewReader(r, stat)
	if err != nil {
		return fmt.Errorf("zip: %w", err)
	}

	for _, f := range zr.File {
		target := filepath.Join(dest, f.Name)
		if f.FileInfo().IsDir() {
			os.MkdirAll(target, 0755)
			continue
		}

		os.MkdirAll(filepath.Dir(target), 0755)
		rc, err := f.Open()
		if err != nil {
			return err
		}

		fw, err := os.Create(target)
		if err != nil {
			rc.Close()
			return err
		}

		if _, err := io.Copy(fw, rc); err != nil {
			rc.Close()
			fw.Close()
			return err
		}
		rc.Close()
		fw.Close()
	}
	return nil
}

func moveDirContents(src, dst string) error {
	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		srcPath := filepath.Join(src, entry.Name())
		dstPath := filepath.Join(dst, entry.Name())

		if err := os.Rename(srcPath, dstPath); err != nil {
			// Cross-device move fallback
			if err := copyPath(srcPath, dstPath); err != nil {
				return err
			}
			os.RemoveAll(srcPath)
		}
	}
	return nil
}

func copyPath(src, dst string) error {
	info, err := os.Stat(src)
	if err != nil {
		return err
	}

	if info.IsDir() {
		os.MkdirAll(dst, info.Mode())
		entries, _ := os.ReadDir(src)
		for _, e := range entries {
			if err := copyPath(filepath.Join(src, e.Name()), filepath.Join(dst, e.Name())); err != nil {
				return err
			}
		}
		return nil
	}

	sf, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sf.Close()

	df, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer df.Close()

	_, err = io.Copy(df, sf)
	return err
}
