package fileloader

import (
	"archive/zip"
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type mockLogger struct{}

func (mockLogger) Debugf(string, ...interface{}) {}
func (mockLogger) Infof(string, ...interface{})  {}
func (mockLogger) Warnf(string, ...interface{})  {}
func (mockLogger) Errorf(string, ...interface{}) {}

func createTestPNG(t *testing.T, path string) {
	t.Helper()
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	img := image.NewRGBA(image.Rect(0, 0, 1, 1))
	img.Set(0, 0, color.White)
	if err := png.Encode(f, img); err != nil {
		t.Fatal(err)
	}
}

func createTestZIP(t *testing.T, zipPath string, entries []string) {
	t.Helper()
	f, err := os.Create(zipPath)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	w := zip.NewWriter(f)
	defer w.Close()
	for _, name := range entries {
		fw, err := w.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		fw.Write([]byte("test data"))
	}
}

func TestNewFileLoader(t *testing.T) {
	fl := NewFileLoader(nil)
	if fl == nil {
		t.Fatal("NewFileLoader returned nil")
	}
	fl2 := NewFileLoader(mockLogger{})
	if fl2 == nil {
		t.Fatal("NewFileLoader with logger returned nil")
	}
}

func TestRegisterDirectory(t *testing.T) {
	fl := NewFileLoader(nil)
	dir := t.TempDir()

	hash := fl.RegisterDirectory(dir)
	if hash == "" {
		t.Fatal("RegisterDirectory returned empty hash")
	}

	got, ok := fl.GetDirectory(hash)
	if !ok {
		t.Fatal("GetDirectory returned not found")
	}
	if got != dir {
		t.Errorf("GetDirectory = %q, want %q", got, dir)
	}
}

func TestRegisterDirectory_ArchiveRegistersToArchivePool(t *testing.T) {
	fl := NewFileLoader(nil)
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.cbz")
	createTestZIP(t, zipPath, []string{"page01.png", "page02.png"})

	hash := fl.RegisterDirectory(zipPath)
	if hash == "" {
		t.Fatal("RegisterDirectory for archive returned empty hash")
	}

	if !fl.IsArchiveHash(hash) {
		t.Error("IsArchiveHash should be true for registered archive")
	}

	got, ok := fl.GetDirectory(hash)
	if !ok {
		t.Fatal("GetDirectory returned not found for archive")
	}
	if got != zipPath {
		t.Errorf("GetDirectory = %q, want %q", got, zipPath)
	}
}

func TestRegisterArchive_Duplicate(t *testing.T) {
	fl := NewFileLoader(nil)
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.cbz")
	createTestZIP(t, zipPath, []string{"page01.png"})

	h1 := fl.RegisterArchive(zipPath)
	h2 := fl.RegisterArchive(zipPath)
	if h1 != h2 {
		t.Errorf("duplicate register returned different hashes: %q vs %q", h1, h2)
	}
}

func TestRegisterArchive_InvalidArchive(t *testing.T) {
	fl := NewFileLoader(nil)
	dir := t.TempDir()
	invalidPath := filepath.Join(dir, "not_an_archive.zip")

	hash := fl.RegisterArchive(invalidPath)
	if hash != "" {
		t.Errorf("RegisterArchive with invalid file should return empty hash, got %q", hash)
	}
}

func TestGetArchive_Found(t *testing.T) {
	fl := NewFileLoader(nil)
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.zip")
	createTestZIP(t, zipPath, []string{"img.png"})

	hash := fl.RegisterArchive(zipPath)
	ar, ok := fl.GetArchive(hash)
	if !ok {
		t.Fatal("GetArchive returned not found")
	}
	if ar == nil {
		t.Fatal("GetArchive returned nil reader")
	}
}

func TestGetArchive_NotFound(t *testing.T) {
	fl := NewFileLoader(nil)
	_, ok := fl.GetArchive("nonexistent")
	if ok {
		t.Error("GetArchive for nonexistent hash should return false")
	}
}

func TestIsArchiveHash(t *testing.T) {
	fl := NewFileLoader(nil)
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.cbz")
	createTestZIP(t, zipPath, []string{"img.png"})

	hash := fl.RegisterArchive(zipPath)
	if !fl.IsArchiveHash(hash) {
		t.Error("IsArchiveHash should be true for archive hash")
	}
	if fl.IsArchiveHash("nonexistent") {
		t.Error("IsArchiveHash should be false for non-archive hash")
	}
}

func TestIsArchiveFileExt(t *testing.T) {
	tests := []struct {
		path string
		want bool
	}{
		{"file.zip", true},
		{"file.cbz", true},
		{"file.rar", true},
		{"file.cbr", true},
		{"file.ZIP", true},
		{"file.png", false},
		{"file.txt", false},
		{"file", false},
		{"", false},
	}
	for _, tt := range tests {
		got := isArchiveFileExt(tt.path)
		if got != tt.want {
			t.Errorf("isArchiveFileExt(%q) = %v, want %v", tt.path, got, tt.want)
		}
	}
}

func TestIsSupportedImage(t *testing.T) {
	fl := NewFileLoader(nil)
	tests := []struct {
		name string
		want bool
	}{
		{"image.png", true},
		{"image.jpg", true},
		{"image.jpeg", true},
		{"image.webp", true},
		{"image.avif", true},
		{"image.gif", true},
		{"image.bmp", true},
		{"image.tiff", true},
		{"image.tif", true},
		{"image.svg", true},
		{"image.PNG", true},
		{"image.txt", false},
		{"image", false},
	}
	for _, tt := range tests {
		got := fl.IsSupportedImage(tt.name)
		if got != tt.want {
			t.Errorf("IsSupportedImage(%q) = %v, want %v", tt.name, got, tt.want)
		}
	}
}

func TestIsSupportedImage_ArchivePath(t *testing.T) {
	fl := NewFileLoader(nil)
	ok := fl.IsSupportedImage("archive:abc123:image.png")
	if !ok {
		t.Error("IsSupportedImage should handle archive paths")
	}
}

func TestGetMimeType(t *testing.T) {
	fl := NewFileLoader(nil)
	tests := []struct {
		name string
		want string
	}{
		{"image.png", "image/png"},
		{"image.jpg", "image/jpeg"},
		{"image.webp", "image/webp"},
		{"image.avif", "image/avif"},
		{"image.svg", "image/svg+xml"},
		{"image.txt", "application/octet-stream"},
	}
	for _, tt := range tests {
		got := fl.GetMimeType(tt.name)
		if got != tt.want {
			t.Errorf("GetMimeType(%q) = %q, want %q", tt.name, got, tt.want)
		}
	}
}

func TestGetMimeType_ArchivePath(t *testing.T) {
	fl := NewFileLoader(nil)
	got := fl.GetMimeType("archive:abc123:image.png")
	if got != "image/png" {
		t.Errorf("GetMimeType for archive path = %q, want %q", got, "image/png")
	}
}

func TestMimeTypeByExt(t *testing.T) {
	tests := []struct {
		name string
		want string
	}{
		{"test.png", "image/png"},
		{"test.jpg", "image/jpeg"},
		{"test.jpeg", "image/jpeg"},
		{"test.webp", "image/webp"},
		{"test.avif", "image/avif"},
		{"test.gif", "image/gif"},
		{"test.bmp", "image/bmp"},
		{"test.tiff", "image/tiff"},
		{"test.tif", "image/tiff"},
		{"test.svg", "image/svg+xml"},
		{"test.unknown", "application/octet-stream"},
		{"test", "application/octet-stream"},
	}
	for _, tt := range tests {
		got := mimeTypeByExt(tt.name)
		if got != tt.want {
			t.Errorf("mimeTypeByExt(%q) = %q, want %q", tt.name, got, tt.want)
		}
	}
}

func TestNaturalLess(t *testing.T) {
	tests := []struct {
		a, b string
		want bool // a < b
	}{
		{"1", "2", true},
		{"2", "1", false},
		{"1", "10", true},
		{"10", "1", false},
		{"2", "10", true},
		{"10", "2", false},
		{"chapter1", "chapter2", true},
		{"chapter2", "chapter1", false},
		{"chapter1", "chapter10", true},
		{"chapter10", "chapter1", false},
		{"chapter2", "chapter10", true},
		{"page1", "page10", true},
		{"page10", "page1", false},
		{"a", "b", true},
		{"b", "a", false},
		{"a", "a", false},
		{"", "a", true},  // empty < non-empty
		{"a", "", false},
		{"", "", false},
		{"A", "a", false},
		{"a", "B", true},
		// "img1" and "img01" have same numeric value (1), treated as equal → not less
		{"img1", "img01", false},
		{"img01", "img1", false},
		{"10", "2", false},
		{"page1_1", "page1_10", true},
		{"page1_10", "page1_1", false},
	}
	for _, tt := range tests {
		got := naturalLess(tt.a, tt.b)
		if got != tt.want {
			t.Errorf("naturalLess(%q, %q) = %v, want %v", tt.a, tt.b, got, tt.want)
		}
	}
}

func TestCompareNatural(t *testing.T) {
	tests := []struct {
		a, b string
		want int
	}{
		{"a", "b", -1},
		{"b", "a", 1},
		{"a", "a", 0},
		{"", "a", -1},
		{"a", "", 1},
		{"1", "2", -1},
		{"2", "1", 1},
		{"1", "10", -1},
		{"10", "1", 1},
	}
	for _, tt := range tests {
		got := compareNatural(tt.a, tt.b)
		if (got < 0 && tt.want >= 0) || (got > 0 && tt.want <= 0) || (got == 0 && tt.want != 0) {
			t.Errorf("compareNatural(%q, %q) = %d, want sign %d", tt.a, tt.b, got, tt.want)
		}
	}
}

func TestIsArchivePath(t *testing.T) {
	tests := []struct {
		path string
		want bool
	}{
		{"archive:hash:entry.png", true},
		{"archive:", true},
		{"/some/path/file.png", false},
		{"", false},
	}
	for _, tt := range tests {
		got := isArchivePath(tt.path)
		if got != tt.want {
			t.Errorf("isArchivePath(%q) = %v, want %v", tt.path, got, tt.want)
		}
	}
}

func TestParseArchivePath(t *testing.T) {
	hash, entry := parseArchivePath("archive:abc123:page001.png")
	if hash != "abc123" {
		t.Errorf("hash = %q, want %q", hash, "abc123")
	}
	if entry != "page001.png" {
		t.Errorf("entry = %q, want %q", entry, "page001.png")
	}

	hash2, entry2 := parseArchivePath("no-prefix")
	if hash2 != "" || entry2 != "" {
		t.Errorf("expected empty for non-archive path, got hash=%q entry=%q", hash2, entry2)
	}
}

func TestNewArchiveReader_ValidZip(t *testing.T) {
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.cbz")
	createTestZIP(t, zipPath, []string{"page01.png", "page02.jpg", "page03.webp", "readme.txt"})

	ar, err := NewArchiveReader(zipPath)
	if err != nil {
		t.Fatalf("NewArchiveReader error = %v", err)
	}

	entries := ar.ListEntries()
	if len(entries) != 3 {
		t.Fatalf("expected 3 image entries, got %d: %v", len(entries), entries)
	}

	if ar.EntryCount() != 3 {
		t.Errorf("EntryCount = %d, want %d", ar.EntryCount(), 3)
	}

	if ar.EntrySize("page01.png") == 0 {
		t.Error("EntrySize for page01.png should be > 0")
	}
	if ar.EntrySize("readme.txt") != 0 {
		t.Error("EntrySize for readme.txt (non-image) should be 0")
	}
}

func TestNewArchiveReader_EmptyZip(t *testing.T) {
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "empty.zip")
	createTestZIP(t, zipPath, nil)

	ar, err := NewArchiveReader(zipPath)
	if err != nil {
		t.Fatalf("NewArchiveReader error = %v", err)
	}
	if ar.EntryCount() != 0 {
		t.Errorf("EntryCount for empty zip = %d, want 0", ar.EntryCount())
	}
}

func TestNewArchiveReader_InvalidPath(t *testing.T) {
	_, err := NewArchiveReader("/nonexistent/file.zip")
	if err == nil {
		t.Fatal("expected error for nonexistent file")
	}
}

func TestNewArchiveReader_UnsupportedFormat(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.txt")
	if err := os.WriteFile(path, []byte("data"), 0644); err != nil {
		t.Fatal(err)
	}

	_, err := NewArchiveReader(path)
	if err == nil {
		t.Fatal("expected error for unsupported format")
	}
}

func TestArchiveReader_ReadEntry(t *testing.T) {
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.zip")
	createTestZIP(t, zipPath, []string{"page01.png"})

	ar, err := NewArchiveReader(zipPath)
	if err != nil {
		t.Fatal(err)
	}

	data, err := ar.ReadEntry("page01.png")
	if err != nil {
		t.Fatalf("ReadEntry error = %v", err)
	}
	if len(data) == 0 {
		t.Error("ReadEntry returned empty data")
	}
}

func TestArchiveReader_ReadEntry_NotFound(t *testing.T) {
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.zip")
	createTestZIP(t, zipPath, []string{"page01.png"})

	ar, err := NewArchiveReader(zipPath)
	if err != nil {
		t.Fatal(err)
	}

	_, err = ar.ReadEntry("nonexistent.png")
	if err == nil {
		t.Error("expected error for nonexistent entry")
	}
}

func TestArchiveReader_OpenEntry(t *testing.T) {
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.zip")
	createTestZIP(t, zipPath, []string{"page01.png"})

	ar, err := NewArchiveReader(zipPath)
	if err != nil {
		t.Fatal(err)
	}

	rc, mime, size, err := ar.OpenEntry("page01.png")
	if err != nil {
		t.Fatalf("OpenEntry error = %v", err)
	}
	defer rc.Close()

	if mime != "image/png" {
		t.Errorf("mime = %q, want %q", mime, "image/png")
	}
	if size <= 0 {
		t.Errorf("size = %d, want > 0", size)
	}
}

func TestArchiveReader_OpenEntry_NotFound(t *testing.T) {
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.zip")
	createTestZIP(t, zipPath, []string{"page01.png"})

	ar, err := NewArchiveReader(zipPath)
	if err != nil {
		t.Fatal(err)
	}

	_, _, _, err = ar.OpenEntry("nonexistent.png")
	if err == nil {
		t.Error("expected error for nonexistent entry")
	}
}

func TestArchiveReader_EntriesSorted(t *testing.T) {
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.zip")
	createTestZIP(t, zipPath, []string{"page10.png", "page2.png", "page1.png"})

	ar, err := NewArchiveReader(zipPath)
	if err != nil {
		t.Fatal(err)
	}

	entries := ar.ListEntries()
	if len(entries) != 3 {
		t.Fatalf("expected 3 entries, got %d", len(entries))
	}

	expected := []string{"page1.png", "page2.png", "page10.png"}
	for i, e := range entries {
		if e != expected[i] {
			t.Errorf("entry[%d] = %q, want %q", i, e, expected[i])
		}
	}
}

func TestGetImages_Directory(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()

	createTestPNG(t, filepath.Join(dir, "img1.png"))
	createTestPNG(t, filepath.Join(dir, "img2.png"))
	os.WriteFile(filepath.Join(dir, "readme.txt"), []byte("data"), 0644)

	images, err := fl.GetImages(dir)
	if err != nil {
		t.Fatalf("GetImages error = %v", err)
	}
	if len(images) != 2 {
		t.Fatalf("expected 2 images, got %d", len(images))
	}
	if images[0].Name != "img1.png" {
		t.Errorf("first image name = %q, want %q", images[0].Name, "img1.png")
	}
	if images[0].Extension != "png" {
		t.Errorf("extension = %q, want %q", images[0].Extension, "png")
	}
	if images[0].Index != 0 {
		t.Errorf("first index = %d, want 0", images[0].Index)
	}
	if images[1].Index != 1 {
		t.Errorf("second index = %d, want 1", images[1].Index)
	}
}

func TestGetImages_DirectoryRecursive(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	subdir := filepath.Join(dir, "sub")
	os.Mkdir(subdir, 0755)

	createTestPNG(t, filepath.Join(dir, "root.png"))
	createTestPNG(t, filepath.Join(subdir, "sub.png"))

	images, err := fl.GetImages(dir)
	if err != nil {
		t.Fatalf("GetImages error = %v", err)
	}
	if len(images) != 2 {
		t.Fatalf("expected 2 images, got %d", len(images))
	}
}

func TestGetImages_Archive(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.cbz")
	createTestZIP(t, zipPath, []string{"page01.png", "page02.jpg"})

	images, err := fl.GetImages(zipPath)
	if err != nil {
		t.Fatalf("GetImages error = %v", err)
	}
	if len(images) != 2 {
		t.Fatalf("expected 2 images, got %d", len(images))
	}
	if images[0].Path != "page01.png" {
		t.Errorf("first image path = %q, want %q", images[0].Path, "page01.png")
	}
}

func TestGetImages_NonexistentDir(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	_, err := fl.GetImages("/nonexistent/path")
	if err == nil {
		t.Error("expected error for nonexistent directory")
	}
}

func TestGetImagesShallow_Directory(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	subdir := filepath.Join(dir, "sub")
	os.Mkdir(subdir, 0755)

	createTestPNG(t, filepath.Join(dir, "root.png"))
	createTestPNG(t, filepath.Join(subdir, "sub.png"))

	images, err := fl.GetImagesShallow(dir)
	if err != nil {
		t.Fatalf("GetImagesShallow error = %v", err)
	}
	if len(images) != 1 {
		t.Fatalf("expected 1 image (non-recursive), got %d", len(images))
	}
}

func TestGetImagesShallow_Archive(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.cbz")
	createTestZIP(t, zipPath, []string{"page01.png", "page02.jpg"})

	images, err := fl.GetImagesShallow(zipPath)
	if err != nil {
		t.Fatalf("GetImagesShallow error = %v", err)
	}
	if len(images) != 2 {
		t.Fatalf("expected 2 images, got %d", len(images))
	}
}

func TestFindFirstImage_Archive(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.cbz")
	createTestZIP(t, zipPath, []string{"page01.png", "page02.jpg"})

	path, ok := fl.FindFirstImage(zipPath)
	if !ok {
		t.Fatal("FindFirstImage returned not found")
	}
	if path != "page01.png" {
		t.Errorf("first image = %q, want %q", path, "page01.png")
	}
}

func TestFindFirstImageShallow_Directory(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	createTestPNG(t, filepath.Join(dir, "img2.png"))
	createTestPNG(t, filepath.Join(dir, "img1.png"))

	path, ok := fl.FindFirstImageShallow(dir)
	if !ok {
		t.Fatal("FindFirstImageShallow returned not found")
	}
	if !strings.HasSuffix(path, "img1.png") && !strings.HasSuffix(path, "img2.png") {
		t.Errorf("unexpected first image path: %q", path)
	}
}

func TestFindFirstImageShallow_NoImages(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "readme.txt"), []byte("data"), 0644)

	_, ok := fl.FindFirstImageShallow(dir)
	if ok {
		t.Error("FindFirstImageShallow should return false for dir with no images")
	}
}

func TestGetShallowImageCount(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	createTestPNG(t, filepath.Join(dir, "img1.png"))
	createTestPNG(t, filepath.Join(dir, "img2.png"))
	os.WriteFile(filepath.Join(dir, "readme.txt"), []byte("data"), 0644)

	count := fl.GetShallowImageCount(dir)
	if count != 2 {
		t.Errorf("GetShallowImageCount = %d, want %d", count, 2)
	}
}

func TestGetShallowImageCount_Archive(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.cbz")
	createTestZIP(t, zipPath, []string{"page01.png", "page02.jpg"})

	count := fl.GetShallowImageCount(zipPath)
	if count != 2 {
		t.Errorf("GetShallowImageCount for archive = %d, want %d", count, 2)
	}
}

func TestHasSubdirectories(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()

	if fl.HasSubdirectories(dir) {
		t.Error("empty dir should have no subdirectories")
	}

	os.Mkdir(filepath.Join(dir, "sub"), 0755)
	if !fl.HasSubdirectories(dir) {
		t.Error("dir with subdirectory should return true")
	}

	if fl.HasSubdirectories("/nonexistent") {
		t.Error("nonexistent dir should return false")
	}
}

func TestHasSubdirectories_Archive(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.cbz")
	createTestZIP(t, zipPath, []string{"page01.png"})

	if fl.HasSubdirectories(zipPath) {
		t.Error("archive should not have subdirectories")
	}
}

func TestGetSubdirectoryCount(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()

	if fl.GetSubdirectoryCount(dir) != 0 {
		t.Error("empty dir count should be 0")
	}

	os.Mkdir(filepath.Join(dir, "sub1"), 0755)
	os.Mkdir(filepath.Join(dir, "sub2"), 0755)
	createTestPNG(t, filepath.Join(dir, "img.png"))

	if count := fl.GetSubdirectoryCount(dir); count != 2 {
		t.Errorf("subdirectory count = %d, want %d", count, 2)
	}
}

func TestResolvePath_Directory(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	result := fl.ResolvePath(dir, "image.png")
	expected := filepath.Join(dir, "image.png")
	if result != expected {
		t.Errorf("ResolvePath = %q, want %q", result, expected)
	}
}

func TestResolvePath_Archive(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "test.cbz")
	createTestZIP(t, zipPath, []string{"page01.png"})

	fl.RegisterArchive(zipPath)
	result := fl.ResolvePath(zipPath, "page01.png")
	if !strings.HasPrefix(result, "archive:") {
		t.Errorf("ResolvePath for archive should return archive: prefixed path, got %q", result)
	}
}

func TestLoadImageBytes_RegularFile(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "test.png")
	createTestPNG(t, imgPath)

	data, mime, err := fl.LoadImageBytes(imgPath)
	if err != nil {
		t.Fatalf("LoadImageBytes error = %v", err)
	}
	if len(data) == 0 {
		t.Error("LoadImageBytes returned empty data")
	}
	if mime != "image/png" {
		t.Errorf("mime = %q, want %q", mime, "image/png")
	}
}

func TestLoadImageBytes_NotFound(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	_, _, err := fl.LoadImageBytes("/nonexistent/image.png")
	if err == nil {
		t.Error("expected error for nonexistent file")
	}
}

func TestOpenImage_RegularFile(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "test.png")
	createTestPNG(t, imgPath)

	rc, mime, size, err := fl.OpenImage(imgPath)
	if err != nil {
		t.Fatalf("OpenImage error = %v", err)
	}
	defer rc.Close()

	if mime != "image/png" {
		t.Errorf("mime = %q, want %q", mime, "image/png")
	}
	if size <= 0 {
		t.Errorf("size = %d, want > 0", size)
	}
}

func TestOpenImage_NotFound(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	_, _, _, err := fl.OpenImage("/nonexistent/image.png")
	if err == nil {
		t.Error("expected error for nonexistent file")
	}
}

func TestGetImageReader(t *testing.T) {
	fl := NewFileLoader(mockLogger{})
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "test.png")
	createTestPNG(t, imgPath)

	rc, mime, size, err := fl.GetImageReader(imgPath)
	if err != nil {
		t.Fatalf("GetImageReader error = %v", err)
	}
	defer rc.Close()
	if mime != "image/png" {
		t.Errorf("mime = %q, want %q", mime, "image/png")
	}
	if size <= 0 {
		t.Errorf("size = %d, want > 0", size)
	}
}

func TestSupportedExtensions(t *testing.T) {
	expected := []string{".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff", ".tif", ".svg", ".avif"}
	for _, ext := range expected {
		if _, ok := SupportedExtensions[ext]; !ok {
			t.Errorf("SupportedExtensions missing: %s", ext)
		}
	}
}
