package webpbin

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestBinaryDir_WithCustomBase(t *testing.T) {
	m := &Manager{BaseDir: filepath.Join("custom", "path")}
	dir := m.BinaryDir()
	if !strings.Contains(dir, "webp-bin") {
		t.Errorf("BinaryDir() = %q, want it to contain 'webp-bin'", dir)
	}
	if !strings.Contains(dir, filepath.Join("custom", "path")) {
		t.Errorf("BinaryDir() = %q, want it to contain 'custom/path'", dir)
	}
}

func TestBinaryDir_WithEmptyBase(t *testing.T) {
	m := &Manager{}
	dir := m.BinaryDir()
	if dir == "" {
		t.Error("BinaryDir() should not be empty")
	}
	if !strings.HasSuffix(dir, "webp-bin") {
		t.Errorf("BinaryDir() = %q, want suffix 'webp-bin'", dir)
	}
}

func TestIsAvailable_NoLibrary(t *testing.T) {
	m := &Manager{BaseDir: t.TempDir()}
	if m.IsAvailable() {
		t.Error("IsAvailable() should be false when no library exists")
	}
}

func TestReset(t *testing.T) {
	m := &Manager{}
	m.once.Do(func() {})
	if m.Ensure() != nil {
		t.Error("Ensure() should not return error after once.Do")
	}
	m.Reset()
}

func TestIsZipFile(t *testing.T) {
	t.Run("valid zip", func(t *testing.T) {
		path := filepath.Join(t.TempDir(), "test.zip")
		f, _ := os.Create(path)
		f.Write([]byte("PK\x03\x04"))
		f.Close()
		if !isZipFile(path) {
			t.Error("isZipFile should return true for ZIP file")
		}
	})

	t.Run("not a zip", func(t *testing.T) {
		path := filepath.Join(t.TempDir(), "test.txt")
		os.WriteFile(path, []byte("not a zip"), 0644)
		if isZipFile(path) {
			t.Error("isZipFile should return false for non-ZIP file")
		}
	})

	t.Run("nonexistent file", func(t *testing.T) {
		if isZipFile("/nonexistent/path.zip") {
			t.Error("isZipFile should return false for nonexistent file")
		}
	})
}

func TestExtractZipNative(t *testing.T) {
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.zip")

	f, _ := os.Create(zipPath)
	w := zip.NewWriter(f)
	content, _ := w.Create("hello.txt")
	content.Write([]byte("world"))
	w.Close()
	f.Close()

	destDir := filepath.Join(dir, "out")
	os.MkdirAll(destDir, 0755)
	err := extractZipNative(zipPath, destDir)
	if err != nil {
		t.Fatalf("extractZipNative() error = %v", err)
	}

	data, err := os.ReadFile(filepath.Join(destDir, "hello.txt"))
	if err != nil {
		t.Fatalf("failed to read extracted file: %v", err)
	}
	if string(data) != "world" {
		t.Errorf("extracted content = %q, want %q", string(data), "world")
	}
}

func TestExtractTarGz(t *testing.T) {
	dir := t.TempDir()
	tarPath := filepath.Join(dir, "test.tar.gz")

	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gz)
	tw.WriteHeader(&tar.Header{Name: "hello.txt", Size: int64(len("world")), Mode: 0644})
	tw.Write([]byte("world"))
	tw.Close()
	gz.Close()
	os.WriteFile(tarPath, buf.Bytes(), 0644)

	destDir := filepath.Join(dir, "out")
	os.MkdirAll(destDir, 0755)
	err := extractTarGz(tarPath, destDir)
	if err != nil {
		t.Fatalf("extractTarGz() error = %v", err)
	}

	data, err := os.ReadFile(filepath.Join(destDir, "hello.txt"))
	if err != nil {
		t.Fatalf("failed to read extracted file: %v", err)
	}
	if string(data) != "world" {
		t.Errorf("extracted content = %q, want %q", string(data), "world")
	}
}

func TestExtractArchive_DetectByAssetName(t *testing.T) {
	dir := t.TempDir()

	t.Run("zip by name", func(t *testing.T) {
		archivePath := filepath.Join(dir, "test.zip")
		f, _ := os.Create(archivePath)
		w := zip.NewWriter(f)
		content, _ := w.Create("file.txt")
		content.Write([]byte("data"))
		w.Close()
		f.Close()

		destDir := filepath.Join(dir, "out1")
		os.MkdirAll(destDir, 0755)
		err := extractArchive(archivePath, destDir, "test.zip")
		if err != nil {
			t.Fatalf("extractArchive(.zip) error = %v", err)
		}
		if _, err := os.Stat(filepath.Join(destDir, "file.txt")); err != nil {
			t.Error("expected file.txt to exist")
		}
	})

	t.Run("tar.gz by name", func(t *testing.T) {
		archivePath := filepath.Join(dir, "test.tar.gz")
		var buf bytes.Buffer
		gz := gzip.NewWriter(&buf)
		tw := tar.NewWriter(gz)
		tw.WriteHeader(&tar.Header{Name: "file.txt", Size: int64(len("data")), Mode: 0644})
		tw.Write([]byte("data"))
		tw.Close()
		gz.Close()
		os.WriteFile(archivePath, buf.Bytes(), 0644)

		destDir := filepath.Join(dir, "out2")
		os.MkdirAll(destDir, 0755)
		err := extractArchive(archivePath, destDir, "test.tar.gz")
		if err != nil {
			t.Fatalf("extractArchive(.tar.gz) error = %v", err)
		}
		if _, err := os.Stat(filepath.Join(destDir, "file.txt")); err != nil {
			t.Error("expected file.txt to exist")
		}
	})

	t.Run("zip detected by magic bytes", func(t *testing.T) {
		archivePath := filepath.Join(dir, "test.bin")
	f, _ := os.Create(archivePath)
	w := zip.NewWriter(f)
	content, _ := w.Create("file.txt")
	content.Write([]byte("data"))
	w.Close()
	f.Close()

		destDir := filepath.Join(dir, "out3")
		os.MkdirAll(destDir, 0755)
		err := extractArchive(archivePath, destDir, "test.bin")
		if err != nil {
			t.Fatalf("extractArchive(.bin) error = %v", err)
		}
		// If it failed to extract as zip, it would try tar.gz which would also fail.
		// The point is it doesn't panic and extraction succeeds via magic bytes.
	})
}
