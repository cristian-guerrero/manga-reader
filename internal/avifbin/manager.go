// Package avifbin manages downloading and configuring native AVIF libraries
// (libavif.dll / libavif.so / libavif.dylib) for use by gen2brain/avif via FFI.
//
// The libraries are downloaded once from a GitHub Release and cached in
// ~/.manga-visor/avif-bin/. The DLL search path is configured at init() time
// (before gen2brain/avif's own init() runs) so that LoadLibrary finds them.
package avifbin

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
	"sync"
	"syscall"
	"unsafe"
)

// GitHub repository and release tag for the pre-built AVIF binaries.
const (
	repoOwner  = "cristian-guerrero"
	repoName   = "manga-reader"
	releaseTag = "avif-binaries-v1"
)

// DefaultBinDirName is the name of the subdirectory where binaries are stored.
const DefaultBinDirName = "avif-bin"

// Platform describes the native library archive for a given OS/arch.
type Platform struct {
	AssetName   string // Filename in the release (e.g. "avif-windows-x64.zip")
	LibraryName string // The DLL/SO/dylib name gen2brain/avif looks for
}

// platforms maps Go runtime strings to their platform metadata.
var platformMap map[string]Platform

func init() {
	platformMap = map[string]Platform{
		"windows/amd64": {AssetName: "avif-windows-x64.zip", LibraryName: "libavif.dll"},
		"windows/arm64": {AssetName: "avif-windows-arm64.zip", LibraryName: "libavif.dll"},
		"linux/amd64":   {AssetName: "avif-linux-x64.tar.gz", LibraryName: "libavif.so"},
		"linux/arm64":   {AssetName: "avif-linux-arm64.tar.gz", LibraryName: "libavif.so"},
		"darwin/amd64":  {AssetName: "avif-darwin-x64.tar.gz", LibraryName: "libavif.dylib"},
		"darwin/arm64":  {AssetName: "avif-darwin-arm64.tar.gz", LibraryName: "libavif.dylib"},
	}
}

// Manager handles downloading, caching, and configuring AVIF native libraries.
type Manager struct {
	// BaseDir is the parent directory where the "avif-bin" subdirectory
	// will be created. Defaults to ~/.manga-visor.
	BaseDir string

	// DownloadURL is optionally overridden for testing or custom hosting.
	// If empty, the default GitHub release URL is used.
	DownloadURL string

	// HTTPClient used for downloads. Defaults to http.DefaultClient.
	HTTPClient *http.Client

	once sync.Once
	err  error
}

// Ensure downloads (if necessary) and configures the AVIF native library
// for the current platform. It is safe to call multiple times.
func (m *Manager) Ensure() error {
	m.once.Do(func() {
		m.err = m.ensure()
	})
	return m.err
}

// Reset forces a re-download on the next call to Ensure.
func (m *Manager) Reset() {
	m.once = sync.Once{}
	m.err = nil
}

// BinaryDir returns the directory where the native libraries are stored.
func (m *Manager) BinaryDir() string {
	base := m.BaseDir
	if base == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			home = "."
		}
		base = filepath.Join(home, ".manga-visor")
	}
	return filepath.Join(base, "avif-bin")
}

// IsAvailable returns true if the native library is already cached on disk.
func (m *Manager) IsAvailable() bool {
	key := runtime.GOOS + "/" + runtime.GOARCH
	plat, ok := platformMap[key]
	if !ok {
		return false
	}
	_, err := os.Stat(filepath.Join(m.BinaryDir(), plat.LibraryName))
	return err == nil
}

// LibraryPath returns the full path to the native library file.
func (m *Manager) LibraryPath() string {
	key := runtime.GOOS + "/" + runtime.GOARCH
	plat, ok := platformMap[key]
	if !ok {
		return ""
	}
	return filepath.Join(m.BinaryDir(), plat.LibraryName)
}

func (m *Manager) httpClient() *http.Client {
	if m.HTTPClient != nil {
		return m.HTTPClient
	}
	return http.DefaultClient
}

func (m *Manager) ensure() error {
	key := runtime.GOOS + "/" + runtime.GOARCH
	plat, ok := platformMap[key]
	if !ok {
		return fmt.Errorf("unsupported platform for native AVIF: %s", key)
	}

	binDir := m.BinaryDir()
	libPath := filepath.Join(binDir, plat.LibraryName)

	// If the library already exists, just configure the search path
	if _, err := os.Stat(libPath); err == nil {
		return configurePath(binDir)
	}

	// Download and extract
	if err := os.MkdirAll(binDir, 0755); err != nil {
		return fmt.Errorf("failed to create binary directory %s: %w", binDir, err)
	}

	archivePath, err := m.download(plat)
	if err != nil {
		return fmt.Errorf("failed to download AVIF binaries: %w", err)
	}
	defer os.Remove(archivePath)

	if err := extractArchive(archivePath, binDir, plat.AssetName); err != nil {
		return fmt.Errorf("failed to extract AVIF binaries: %w", err)
	}

	// Verify the library was extracted; if not found with the expected name,
	// look for any libavif* file and rename it.
	if _, err := os.Stat(libPath); os.IsNotExist(err) {
		found := false
		entries, _ := os.ReadDir(binDir)
		for _, entry := range entries {
			if !entry.IsDir() && strings.HasPrefix(entry.Name(), "libavif") {
				oldPath := filepath.Join(binDir, entry.Name())
				if err := os.Rename(oldPath, libPath); err == nil {
					found = true
					break
				}
			}
		}
		if !found {
			return fmt.Errorf("library %s not found after extraction", plat.LibraryName)
		}
	}

	return configurePath(binDir)
}

func (m *Manager) download(plat Platform) (string, error) {
	url := m.DownloadURL
	if url == "" {
		url = fmt.Sprintf(
			"https://github.com/%s/%s/releases/download/%s/%s",
			repoOwner, repoName, releaseTag, plat.AssetName,
		)
	}

	tmpFile, err := os.CreateTemp("", "avif-"+plat.AssetName)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	tmpPath := tmpFile.Name()

	resp, err := m.httpClient().Get(url)
	if err != nil {
		tmpFile.Close()
		os.Remove(tmpPath)
		return "", fmt.Errorf("failed to download %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		tmpFile.Close()
		os.Remove(tmpPath)
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return "", fmt.Errorf("download failed with status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	written, err := io.Copy(tmpFile, resp.Body)
	tmpFile.Close()
	if err != nil {
		os.Remove(tmpPath)
		return "", fmt.Errorf("failed to write download: %w", err)
	}

	if written == 0 {
		os.Remove(tmpPath)
		return "", fmt.Errorf("downloaded file is empty")
	}

	return tmpPath, nil
}

// extractArchive extracts a .zip or .tar.gz archive to the destination directory.
// assetName is the original asset filename (used to detect format since
// archivePath may be a temp file with a random suffix, not the original name).
func extractArchive(archivePath, destDir, assetName string) error {
	// Detect by original asset name extension (most reliable)
	if strings.HasSuffix(assetName, ".zip") {
		return extractZip(archivePath, destDir)
	}
	// Fallback: detect by magic bytes
	if isZipFile(archivePath) {
		return extractZip(archivePath, destDir)
	}
	return extractTarGz(archivePath, destDir)
}

// isZipFile checks if the file at path is a ZIP archive by reading its magic bytes.
func isZipFile(path string) bool {
	f, err := os.Open(path)
	if err != nil {
		return false
	}
	defer f.Close()

	header := make([]byte, 4)
	if _, err := io.ReadFull(f, header); err != nil {
		return false
	}
	// ZIP magic: PK\x03\x04 or PK\x05\x06
	return header[0] == 'P' && header[1] == 'K' && (header[2] == 0x03 || header[2] == 0x05) && header[3] == 0x04
}

// extractZip extracts a .zip archive using Go's archive/zip first,
// falling back to system commands if that fails.
func extractZip(zipPath, destDir string) error {
	// Try Go's built-in archive/zip first
	if err := extractZipNative(zipPath, destDir); err == nil {
		return nil
	}

	// Fall back to system commands
	commands := []struct {
		name string
		args []string
	}{
		{"7z", []string{"x", "-y", "-o" + destDir, zipPath}},
		{"unzip", []string{"-o", zipPath, "-d", destDir}},
		{"tar", []string{"-xf", zipPath, "-C", destDir}},
	}
	for _, cmd := range commands {
		if runCmd(cmd.name, cmd.args...) == nil {
			return nil
		}
	}

	return fmt.Errorf("failed to extract zip: no suitable extractor found")
}

// extractZipNative uses Go's archive/zip to extract a ZIP file.
func extractZipNative(zipPath, destDir string) error {
	r, err := os.Open(zipPath)
	if err != nil {
		return err
	}
	defer r.Close()

	stat, err := r.Stat()
	if err != nil {
		return err
	}

	zr, err := zip.NewReader(r, stat.Size())
	if err != nil {
		return err
	}

	for _, f := range zr.File {
		name := filepath.Clean(f.Name)
		if strings.Contains(name, "..") || filepath.IsAbs(name) {
			continue
		}
		target := filepath.Join(destDir, filepath.Base(name))

		if f.FileInfo().IsDir() {
			os.MkdirAll(target, 0755)
			continue
		}

		rc, err := f.Open()
		if err != nil {
			return err
		}

		out, err := os.Create(target)
		if err != nil {
			rc.Close()
			return err
		}

		_, err = io.Copy(out, rc)
		rc.Close()
		out.Close()
		if err != nil {
			return err
		}
	}

	return nil
}

// extractTarGz extracts a .tar.gz archive using Go's archive/tar + compress/gzip.
func extractTarGz(tarGzPath, destDir string) error {
	f, err := os.Open(tarGzPath)
	if err != nil {
		return err
	}
	defer f.Close()

	gzr, err := gzip.NewReader(f)
	if err != nil {
		return fmt.Errorf("failed to create gzip reader: %w", err)
	}
	defer gzr.Close()

	tr := tar.NewReader(gzr)
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to read tar entry: %w", err)
		}

		name := filepath.Clean(header.Name)
		if strings.Contains(name, "..") || filepath.IsAbs(name) {
			continue
		}

		target := filepath.Join(destDir, filepath.Base(name))

		if header.Typeflag == tar.TypeDir {
			os.MkdirAll(target, 0755)
			continue
		}

		out, err := os.Create(target)
		if err != nil {
			return fmt.Errorf("failed to create output file %s: %w", target, err)
		}

		_, err = io.Copy(out, tr)
		out.Close()
		if err != nil {
			return fmt.Errorf("failed to write %s: %w", target, err)
		}

		if header.Mode&0111 != 0 {
			os.Chmod(target, os.FileMode(header.Mode))
		}
	}
	return nil
}

// runCmd runs an external command and returns nil on success.
func runCmd(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = io.Discard
	cmd.Stderr = io.Discard
	return cmd.Run()
}

// configurePath sets up the OS-specific library search path so that
// gen2brain/avif can find the native libraries.
//
// NOTE: On Windows, gen2brain/avif's init() tries to load libavif.dll
// BEFORE our startup() runs (Go package initialization order). This means
// SetDllDirectory is called too late. The only reliable way is to copy
// the DLL to the executable's directory, which IS in LoadLibrary's default
// search path at init time. On first run the DLL is not yet there (WASM
// fallback), but subsequent runs will find it natively.
func configurePath(binDir string) error {
	switch runtime.GOOS {
	case "windows":
		return configureWindowsPath(binDir)
	case "darwin":
		return configureDarwinPath(binDir)
	case "linux":
		return configureLinuxPath(binDir)
	}
	return nil
}

// configureWindowsPath uses SetDllDirectoryW to register our bin dir so that
// LoadLibrary (called by gen2brain/avif's init()) can find libavif.dll there.
// This is called from init() which runs BEFORE gen2brain/avif's init().
func configureWindowsPath(binDir string) error {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	proc := kernel32.NewProc("SetDllDirectoryW")

	dirPtr, err := syscall.UTF16PtrFromString(binDir)
	if err != nil {
		return fmt.Errorf("failed to convert path: %w", err)
	}

	ret, _, callErr := proc.Call(uintptr(unsafe.Pointer(dirPtr)))
	if ret == 0 {
		return fmt.Errorf("SetDllDirectoryW failed: %w", callErr)
	}
	return nil
}

// configureDarwinPath sets DYLD_LIBRARY_PATH so purego.Dlopen can find libavif.dylib.
func configureDarwinPath(binDir string) error {
	libPath := filepath.Join(binDir, "libavif.dylib")
	if _, err := os.Stat(libPath); err != nil {
		return nil
	}

	current := os.Getenv("DYLD_LIBRARY_PATH")
	if current == "" {
		os.Setenv("DYLD_LIBRARY_PATH", binDir)
	} else if !strings.Contains(current, binDir) {
		os.Setenv("DYLD_LIBRARY_PATH", binDir+string(os.PathListSeparator)+current)
	}
	return nil
}

// configureLinuxPath sets LD_LIBRARY_PATH so purego.Dlopen can find libavif.so.
// NOTE: gen2brain/avif checks isDynamicBinary() and skips shared libs when the
// Go binary is statically linked (common with Wails). This may not work until
// that check is bypassed.
func configureLinuxPath(binDir string) error {
	libPath := filepath.Join(binDir, "libavif.so")
	if _, err := os.Stat(libPath); err != nil {
		return nil
	}

	current := os.Getenv("LD_LIBRARY_PATH")
	if current == "" {
		os.Setenv("LD_LIBRARY_PATH", binDir)
	} else if !strings.Contains(current, binDir) {
		os.Setenv("LD_LIBRARY_PATH", binDir+string(os.PathListSeparator)+current)
	}
	return nil
}

// init runs before gen2brain/avif's init() because:
//   - avifbin is imported directly by main (app.go)
//   - gen2brain/avif is imported by thumbnails and fileloader (deeper deps)
//   - Go initializes packages in dependency order, leaf-first
//
// This allows us to configure the DLL search path (via SetDllDirectory or
// environment variables) BEFORE gen2brain/avif attempts LoadLibrary().
//
// If the binary directory doesn't exist yet (first run), this is a no-op.
// The download will happen later in Manager.Ensure() called from startup().
func init() {
	// Determine the binary directory (same logic as Manager.BinaryDir)
	home, err := os.UserHomeDir()
	if err != nil {
		return
	}
	binDir := filepath.Join(home, ".manga-visor", "avif-bin")

	// Only configure if binaries already downloaded from a previous run
	if _, err := os.Stat(binDir); err != nil {
		return
	}

	// Check if at least the main library exists
	libName := "libavif.dll"
	if runtime.GOOS == "darwin" {
		libName = "libavif.dylib"
	} else if runtime.GOOS == "linux" {
		libName = "libavif.so"
	}

	libPath := filepath.Join(binDir, libName)
	if _, err := os.Stat(libPath); err != nil {
		return
	}

	// Configure the DLL search path before gen2brain/avif's init() runs
	if err := configurePath(binDir); err != nil {
		// Not much we can do; gen2brain/avif will fall back to WASM
	}
}
