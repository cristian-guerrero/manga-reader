// Package webpbin manages downloading and caching native WebP libraries
// (libwebp.dll / libwebp.so / libwebp.dylib) from a GitHub Release.
// The actual library loading is handled by cristian-guerrero/webp's fork
// which pre-loads them via preloadNative() before its init() calls loadLibrary().
package webpbin

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
)

const (
	repoOwner  = "cristian-guerrero"
	repoName   = "manga-reader"
	releaseTag = "webp-binaries-v1"
)

const DefaultBinDirName = "webp-bin"

type Platform struct {
	AssetName   string
	LibraryName string
	DemuxName   string
}

var platformMap map[string]Platform

func init() {
	platformMap = map[string]Platform{
		"windows/amd64": {AssetName: "webp-windows-x64.zip", LibraryName: "libwebp.dll", DemuxName: "libwebpdemux.dll"},
		"windows/arm64": {AssetName: "webp-windows-arm64.zip", LibraryName: "libwebp.dll", DemuxName: "libwebpdemux.dll"},
		"linux/amd64":   {AssetName: "webp-linux-x64.tar.gz", LibraryName: "libwebp.so", DemuxName: "libwebpdemux.so"},
		"linux/arm64":   {AssetName: "webp-linux-arm64.tar.gz", LibraryName: "libwebp.so", DemuxName: "libwebpdemux.so"},
		"darwin/arm64":  {AssetName: "webp-darwin-arm64.tar.gz", LibraryName: "libwebp.dylib", DemuxName: "libwebpdemux.dylib"},
	}
}

type Manager struct {
	BaseDir     string
	DownloadURL string
	HTTPClient  *http.Client
	once        sync.Once
	err         error
}

func (m *Manager) Ensure() error {
	m.once.Do(func() { m.err = m.ensure() })
	return m.err
}

func (m *Manager) Reset() {
	m.once = sync.Once{}
	m.err = nil
}

func (m *Manager) BinaryDir() string {
	base := m.BaseDir
	if base == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			home = "."
		}
		base = filepath.Join(home, ".manga-visor")
	}
	return filepath.Join(base, "webp-bin")
}

func (m *Manager) IsAvailable() bool {
	key := runtime.GOOS + "/" + runtime.GOARCH
	plat, ok := platformMap[key]
	if !ok {
		return false
	}
	_, err := os.Stat(filepath.Join(m.BinaryDir(), plat.LibraryName))
	return err == nil
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
		return fmt.Errorf("unsupported platform for native WebP: %s", key)
	}

	binDir := m.BinaryDir()
	libPath := filepath.Join(binDir, plat.LibraryName)

	if _, err := os.Stat(libPath); err == nil {
		return nil
	}

	if err := os.MkdirAll(binDir, 0755); err != nil {
		return fmt.Errorf("failed to create binary directory %s: %w", binDir, err)
	}

	archivePath, err := m.download(plat, binDir)
	if err != nil {
		return fmt.Errorf("failed to download WebP binaries: %w", err)
	}

	if err := extractArchive(archivePath, binDir, plat.AssetName); err != nil {
		return fmt.Errorf("failed to extract WebP binaries: %w", err)
	}

	for _, name := range []string{plat.LibraryName, plat.DemuxName} {
		if _, err := os.Stat(filepath.Join(binDir, name)); os.IsNotExist(err) {
			entries, _ := os.ReadDir(binDir)
			for _, entry := range entries {
				if !entry.IsDir() && strings.HasPrefix(entry.Name(), strings.TrimSuffix(name, filepath.Ext(name))) {
					oldPath := filepath.Join(binDir, entry.Name())
					newPath := filepath.Join(binDir, name)
					if err := os.Rename(oldPath, newPath); err == nil {
						break
					}
				}
			}
		}
	}

	if _, err := os.Stat(libPath); os.IsNotExist(err) {
		return fmt.Errorf("library %s not found after extraction", plat.LibraryName)
	}
	return nil
}

func (m *Manager) download(plat Platform, destDir string) (string, error) {
	url := m.DownloadURL
	if url == "" {
		url = fmt.Sprintf(
			"https://github.com/%s/%s/releases/download/%s/%s",
			repoOwner, repoName, releaseTag, plat.AssetName,
		)
	}

	archivePath := filepath.Join(destDir, plat.AssetName)
	tmpFile, err := os.Create(archivePath)
	if err != nil {
		return "", fmt.Errorf("failed to create archive file: %w", err)
	}

	resp, err := m.httpClient().Get(url)
	if err != nil {
		tmpFile.Close()
		os.Remove(archivePath)
		return "", fmt.Errorf("failed to download %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		tmpFile.Close()
		os.Remove(archivePath)
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return "", fmt.Errorf("download failed with status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	written, err := io.Copy(tmpFile, resp.Body)
	tmpFile.Close()
	if err != nil {
		os.Remove(archivePath)
		return "", fmt.Errorf("failed to write download: %w", err)
	}

	if written == 0 {
		os.Remove(archivePath)
		return "", fmt.Errorf("downloaded file is empty")
	}

	return archivePath, nil
}

func extractArchive(archivePath, destDir, assetName string) error {
	if strings.HasSuffix(assetName, ".zip") || isZipFile(archivePath) {
		return extractZip(archivePath, destDir)
	}
	return extractTarGz(archivePath, destDir)
}

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
	return header[0] == 'P' && header[1] == 'K' && (header[2] == 0x03 || header[2] == 0x05) && header[3] == 0x04
}

func extractZip(zipPath, destDir string) error {
	if err := extractZipNative(zipPath, destDir); err == nil {
		return nil
	}
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

func runCmd(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = io.Discard
	cmd.Stderr = io.Discard
	return cmd.Run()
}
