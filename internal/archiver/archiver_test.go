package archiver

import (
	"archive/zip"
	"os"
	"path/filepath"
	"testing"
)

// ---------- IsArchive ----------

func TestIsArchive(t *testing.T) {
	tests := []struct {
		path  string
		want  bool
	}{
		{"archive.zip", true},
		{"archive.cbz", true},
		{"archive.rar", true},
		{"archive.cbr", true},
		{"file.txt", false},
		{"file.jpg", false},
		{"file.ZIP", true},  // case insensitive
		{"file.RAR", true},
		{"noextension", false},
		{"", false},
		{".zip", true},
	}
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			got := IsArchive(tt.path)
			if got != tt.want {
				t.Errorf("IsArchive(%q) = %v, want %v", tt.path, got, tt.want)
			}
		})
	}
}

// ---------- Extract (ZIP) ----------

func TestExtract_Zip(t *testing.T) {
	srcDir := t.TempDir()
	destDir := t.TempDir()
	zipPath := filepath.Join(srcDir, "test.zip")

	// Create a ZIP file with test content
	createTestZip(t, zipPath, map[string]string{
		"file1.txt":   "content1",
		"sub/file2.txt": "content2",
		"image.jpg":     "binarydata",
	})

	err := Extract(zipPath, destDir)
	if err != nil {
		t.Fatalf("Extract() error = %v", err)
	}

	// Verify files were extracted
	assertFileContent(t, destDir, "file1.txt", "content1")
	assertFileContent(t, destDir, "sub/file2.txt", "content2")
	assertFileContent(t, destDir, "image.jpg", "binarydata")
}

func TestExtract_Zip_CreatesDestDir(t *testing.T) {
	srcDir := t.TempDir()
	destDir := filepath.Join(t.TempDir(), "new-subdir") // doesn't exist yet
	zipPath := filepath.Join(srcDir, "test.zip")

	createTestZip(t, zipPath, map[string]string{"hello.txt": "world"})

	err := Extract(zipPath, destDir)
	if err != nil {
		t.Fatalf("Extract() error = %v", err)
	}

	if _, err := os.Stat(destDir); os.IsNotExist(err) {
		t.Error("destination directory should have been created")
	}
	assertFileContent(t, destDir, "hello.txt", "world")
}

func TestExtract_UnsupportedFormat(t *testing.T) {
	err := Extract("/path/to/file.txt", t.TempDir())
	if err == nil {
		t.Fatal("expected error for unsupported format")
	}
}

func TestExtract_NonExistentFile(t *testing.T) {
	err := Extract("/nonexistent/file.zip", t.TempDir())
	if err == nil {
		t.Fatal("expected error for nonexistent file")
	}
}

func TestExtract_ZipSlipProtection(t *testing.T) {
	srcDir := t.TempDir()
	destDir := t.TempDir()
	zipPath := filepath.Join(srcDir, "slip.zip")

	// Create a ZIP with a path traversal filename
	f, err := os.Create(zipPath)
	if err != nil {
		t.Fatal(err)
	}
	w := zip.NewWriter(f)

	// Try to write a file with "../" in the name to escape the dest dir
	header := &zip.FileHeader{
		Name:   "../../../etc/passwd",
		Method: zip.Store,
	}
	writer, err := w.CreateHeader(header)
	if err != nil {
		t.Fatal(err)
	}
	writer.Write([]byte("hacked"))
	w.Close()
	f.Close()

	err = Extract(zipPath, destDir)
	if err == nil {
		t.Error("expected error for ZipSlip attempt")
	}
	if err != nil && err.Error() != "illegal file path: ../../../etc/passwd" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestExtract_EmptyZip(t *testing.T) {
	srcDir := t.TempDir()
	destDir := t.TempDir()
	zipPath := filepath.Join(srcDir, "empty.zip")

	// Create empty ZIP
	f, err := os.Create(zipPath)
	if err != nil {
		t.Fatal(err)
	}
	w := zip.NewWriter(f)
	w.Close()
	f.Close()

	err = Extract(zipPath, destDir)
	if err != nil {
		t.Fatalf("Extract() error = %v", err)
	}

	// Directory should exist but be empty
	entries, err := os.ReadDir(destDir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 0 {
		t.Errorf("expected empty dir, got %d entries", len(entries))
	}
}

func TestExtract_Zip_SubdirectoryStructure(t *testing.T) {
	srcDir := t.TempDir()
	destDir := t.TempDir()
	zipPath := filepath.Join(srcDir, "dirs.zip")

	createTestZip(t, zipPath, map[string]string{
		"a/b/c/deep.txt":    "deep",
		"a/b/shallow.txt":   "shallow",
		"root.txt":          "root",
	})

	err := Extract(zipPath, destDir)
	if err != nil {
		t.Fatalf("Extract() error = %v", err)
	}

	assertFileContent(t, destDir, "a/b/c/deep.txt", "deep")
	assertFileContent(t, destDir, "a/b/shallow.txt", "shallow")
	assertFileContent(t, destDir, "root.txt", "root")
}

// ---------- RAR (error path only, no easy way to create RAR in tests) ----------

func TestExtract_NonExistentRar(t *testing.T) {
	err := Extract("/nonexistent/file.rar", t.TempDir())
	if err == nil {
		t.Fatal("expected error for nonexistent rar")
	}
}

// ---------- helpers ----------

// createTestZip creates a ZIP file at zipPath with the given file map (path -> content)
func createTestZip(t *testing.T, zipPath string, files map[string]string) {
	t.Helper()

	f, err := os.Create(zipPath)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()

	w := zip.NewWriter(f)
	defer w.Close()

	for path, content := range files {
		writer, err := w.Create(path)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := writer.Write([]byte(content)); err != nil {
			t.Fatal(err)
		}
	}
}

// assertFileContent verifies that a file exists at destDir/subpath with the given content
func assertFileContent(t *testing.T, destDir, subpath, wantContent string) {
	t.Helper()

	fullPath := filepath.Join(destDir, subpath)
	data, err := os.ReadFile(fullPath)
	if err != nil {
		t.Errorf("reading %s: %v", subpath, err)
		return
	}
	if string(data) != wantContent {
		t.Errorf("%s: got %q, want %q", subpath, string(data), wantContent)
	}
}
