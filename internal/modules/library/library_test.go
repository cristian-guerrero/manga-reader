package library

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"manga-visor/internal/database"
	"manga-visor/internal/fileloader"
	"manga-visor/internal/persistence"
)

func init() {
	eventsEmit = func(_ context.Context, _ string, _ ...interface{}) {}
}

type mockFileLoader struct {
	registerDir func(dirPath string) string
	getDir      func(hash string) (string, bool)
	getImages   func(folderPath string) ([]fileloader.ImageInfo, error)
	getImagesShallow func(folderPath string) ([]fileloader.ImageInfo, error)
	isSupportedImage func(filename string) bool
	getMimeType func(filename string) string
	findFirstImage func(folderPath string) (string, bool)
	findFirstImageShallow func(folderPath string) (string, bool)
	getShallowImageCount func(folderPath string) int
	hasSubdirectories func(folderPath string) bool
	getSubdirectoryCount func(folderPath string) int
}

func (m *mockFileLoader) RegisterDirectory(dirPath string) string {
	if m.registerDir != nil {
		return m.registerDir(dirPath)
	}
	return "mock-hash"
}

func (m *mockFileLoader) GetDirectory(hash string) (string, bool) {
	if m.getDir != nil {
		return m.getDir(hash)
	}
	return "", false
}

func (m *mockFileLoader) GetImages(folderPath string) ([]fileloader.ImageInfo, error) {
	if m.getImages != nil {
		return m.getImages(folderPath)
	}
	return []fileloader.ImageInfo{
		{Path: filepath.Join(folderPath, "page1.png"), Name: "page1.png", Extension: "png", Size: 100, Index: 0},
	}, nil
}

func (m *mockFileLoader) GetImagesShallow(folderPath string) ([]fileloader.ImageInfo, error) {
	if m.getImagesShallow != nil {
		return m.getImagesShallow(folderPath)
	}
	return m.GetImages(folderPath)
}

func (m *mockFileLoader) IsSupportedImage(filename string) bool {
	if m.isSupportedImage != nil {
		return m.isSupportedImage(filename)
	}
	return true
}

func (m *mockFileLoader) GetMimeType(filename string) string {
	if m.getMimeType != nil {
		return m.getMimeType(filename)
	}
	return "image/png"
}

func (m *mockFileLoader) FindFirstImage(folderPath string) (string, bool) {
	if m.findFirstImage != nil {
		return m.findFirstImage(folderPath)
	}
	return filepath.Join(folderPath, "page1.png"), true
}

func (m *mockFileLoader) FindFirstImageShallow(folderPath string) (string, bool) {
	if m.findFirstImageShallow != nil {
		return m.findFirstImageShallow(folderPath)
	}
	return m.FindFirstImage(folderPath)
}

func (m *mockFileLoader) GetShallowImageCount(folderPath string) int {
	if m.getShallowImageCount != nil {
		return m.getShallowImageCount(folderPath)
	}
	return 1
}

func (m *mockFileLoader) HasSubdirectories(folderPath string) bool {
	if m.hasSubdirectories != nil {
		return m.hasSubdirectories(folderPath)
	}
	return false
}

func (m *mockFileLoader) GetSubdirectoryCount(folderPath string) int {
	if m.getSubdirectoryCount != nil {
		return m.getSubdirectoryCount(folderPath)
	}
	return 0
}

type mockURLBuilder struct {
	setBaseURL           func(baseURL string)
	buildImageURL        func(dirHash, filename string) string
	buildThumbnailURL    func(dirHash, filename string) string
	buildThumbnailURLFromPath func(dirHash, fullPath string) string
	buildImageURLFromPath func(dirHash, dirPath, fullPath string) string
}

func (m *mockURLBuilder) SetBaseURL(baseURL string) {
	if m.setBaseURL != nil {
		m.setBaseURL(baseURL)
	}
}

func (m *mockURLBuilder) BuildImageURL(dirHash, filename string) string {
	if m.buildImageURL != nil {
		return m.buildImageURL(dirHash, filename)
	}
	return "/images?hash=" + dirHash + "&file=" + filename
}

func (m *mockURLBuilder) BuildThumbnailURL(dirHash, filename string) string {
	if m.buildThumbnailURL != nil {
		return m.buildThumbnailURL(dirHash, filename)
	}
	return "/thumbnails?hash=" + dirHash + "&file=" + filename
}

func (m *mockURLBuilder) BuildThumbnailURLFromPath(dirHash, fullPath string) string {
	if m.buildThumbnailURLFromPath != nil {
		return m.buildThumbnailURLFromPath(dirHash, fullPath)
	}
	return "/thumbnails?hash=" + dirHash + "&file=" + filepath.Base(fullPath)
}

func (m *mockURLBuilder) BuildImageURLFromPath(dirHash, dirPath, fullPath string) string {
	if m.buildImageURLFromPath != nil {
		return m.buildImageURLFromPath(dirHash, dirPath, fullPath)
	}
	return "/images?hash=" + dirHash + "&path=" + fullPath
}

type mockLogger struct{}

func (mockLogger) Debugf(string, ...interface{}) {}
func (mockLogger) Infof(string, ...interface{})  {}
func (mockLogger) Warnf(string, ...interface{})  {}
func (mockLogger) Errorf(string, ...interface{}) {}

func newTestModule(t *testing.T, fl FileLoaderInterface, urlB URLBuilderInterface) *Module {
	t.Helper()
	db := newTestDB(t)
	repo := database.NewLibraryRepository(db)
	m := NewModule(repo, fl, urlB, mockLogger{})
	m.SetContext(context.Background())
	return m
}

func newTestDB(t *testing.T) *database.Database {
	t.Helper()
	db, err := database.New(t.TempDir())
	if err != nil {
		t.Fatalf("database.New error = %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func TestNewModule(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})
	if m == nil {
		t.Fatal("NewModule returned nil")
	}
}

func TestResolveFolder_Directory(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})
	dir := t.TempDir()

	result := m.ResolveFolder(dir)
	if result != dir {
		t.Errorf("ResolveFolder(%q) = %q, want %q", dir, result, dir)
	}
}

func TestResolveFolder_File(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})
	dir := t.TempDir()
	filePath := filepath.Join(dir, "test.txt")
	os.WriteFile(filePath, []byte("data"), 0644)

	result := m.ResolveFolder(filePath)
	if result != dir {
		t.Errorf("ResolveFolder(%q) = %q, want parent dir %q", filePath, result, dir)
	}
}

func TestResolveFolder_Nonexistent(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})
	result := m.ResolveFolder("/nonexistent/path")
	if result != "/nonexistent/path" {
		t.Errorf("ResolveFolder for nonexistent should return path as-is, got %q", result)
	}
}

func TestAddFolder_NoSeries(t *testing.T) {
	fl := &mockFileLoader{
		getImages: func(folderPath string) ([]fileloader.ImageInfo, error) {
			return []fileloader.ImageInfo{
				{Path: filepath.Join(folderPath, "page1.png"), Name: "page1.png", Extension: "png", Size: 100, Index: 0},
			}, nil
		},
		hasSubdirectories: func(folderPath string) bool {
			return false
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "page1.png"), []byte("data"), 0644)

	result, err := m.AddFolder(dir)
	if err != nil {
		t.Fatalf("AddFolder error = %v", err)
	}
	if result == nil {
		t.Fatal("AddFolder returned nil result")
	}
	if result.IsSeries {
		t.Error("expected IsSeries = false for folder without subdirectories")
	}
	if result.Path != dir {
		t.Errorf("result.Path = %q, want %q", result.Path, dir)
	}
}

func TestAddFolder_NoImages(t *testing.T) {
	fl := &mockFileLoader{
		getImages: func(folderPath string) ([]fileloader.ImageInfo, error) {
			return nil, nil
		},
		hasSubdirectories: func(folderPath string) bool {
			return false
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})
	dir := t.TempDir()

	_, err := m.AddFolder(dir)
	if err == nil {
		t.Error("expected error for folder with no images")
	}
}

func TestGetLibrary_Empty(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})
	entries := m.GetLibrary()
	if len(entries) != 0 {
		t.Errorf("expected empty library, got %d entries", len(entries))
	}
}

func TestGetLibrary_WithEntries(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		getImages: func(folderPath string) ([]fileloader.ImageInfo, error) {
			return []fileloader.ImageInfo{
				{Path: filepath.Join(folderPath, "page1.png"), Name: "page1.png", Extension: "png", Size: 100, Index: 0},
			}, nil
		},
		hasSubdirectories: func(folderPath string) bool {
			return false
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	_, err := m.AddFolder(dir)
	if err != nil {
		t.Fatalf("AddFolder error = %v", err)
	}

	entries := m.GetLibrary()
	if len(entries) != 1 {
		t.Fatalf("expected 1 library entry, got %d", len(entries))
	}
	if entries[0].Name != filepath.Base(dir) {
		t.Errorf("entry name = %q, want %q", entries[0].Name, filepath.Base(dir))
	}
}

func TestRemoveLibraryEntry(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		getImages: func(folderPath string) ([]fileloader.ImageInfo, error) {
			return []fileloader.ImageInfo{
				{Path: filepath.Join(folderPath, "page1.png"), Name: "page1.png", Extension: "png", Size: 100, Index: 0},
			}, nil
		},
		hasSubdirectories: func(folderPath string) bool {
			return false
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	m.AddFolder(dir)
	if err := m.RemoveLibraryEntry(dir); err != nil {
		t.Fatalf("RemoveLibraryEntry error = %v", err)
	}

	entries := m.GetLibrary()
	if len(entries) != 0 {
		t.Errorf("expected 0 entries after remove, got %d", len(entries))
	}
}

func TestRemoveLibraryEntry_NotFound(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})
	// Repository Remove does not error on nonexistent entries - it just deletes 0 rows
	err := m.RemoveLibraryEntry("/nonexistent/path")
	if err != nil {
		t.Errorf("unexpected error for removing nonexistent entry: %v", err)
	}
}

func TestClearLibrary(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		getImages: func(folderPath string) ([]fileloader.ImageInfo, error) {
			return []fileloader.ImageInfo{
				{Path: filepath.Join(folderPath, "page1.png"), Name: "page1.png", Extension: "png", Size: 100, Index: 0},
			}, nil
		},
		hasSubdirectories: func(folderPath string) bool {
			return false
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	m.AddFolder(dir)
	if err := m.ClearLibrary(); err != nil {
		t.Fatalf("ClearLibrary error = %v", err)
	}

	entries := m.GetLibrary()
	if len(entries) != 0 {
		t.Errorf("expected 0 entries after clear, got %d", len(entries))
	}
}

func TestGetFolderInfo(t *testing.T) {
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "page1.png")
	os.WriteFile(imgPath, []byte("data"), 0644)

	fl := &mockFileLoader{
		getImages: func(folderPath string) ([]fileloader.ImageInfo, error) {
			return []fileloader.ImageInfo{
				{Path: imgPath, Name: "page1.png", Extension: "png", Size: 100, Index: 0},
			}, nil
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	info, err := m.GetFolderInfo(dir)
	if err != nil {
		t.Fatalf("GetFolderInfo error = %v", err)
	}
	if info == nil {
		t.Fatal("GetFolderInfo returned nil")
	}
	if info.Path != dir {
		t.Errorf("info.Path = %q, want %q", info.Path, dir)
	}
	if info.ImageCount != 1 {
		t.Errorf("ImageCount = %d, want 1", info.ImageCount)
	}
	if info.Name != filepath.Base(dir) {
		t.Errorf("Name = %q, want %q", info.Name, filepath.Base(dir))
	}
}

func TestGetFolderInfoShallow(t *testing.T) {
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "page1.png")
	os.WriteFile(imgPath, []byte("data"), 0644)

	fl := &mockFileLoader{
		getImagesShallow: func(folderPath string) ([]fileloader.ImageInfo, error) {
			return []fileloader.ImageInfo{
				{Path: imgPath, Name: "page1.png", Extension: "png", Size: 100, Index: 0},
			}, nil
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	info, err := m.GetFolderInfoShallow(dir)
	if err != nil {
		t.Fatalf("GetFolderInfoShallow error = %v", err)
	}
	if info == nil {
		t.Fatal("GetFolderInfoShallow returned nil")
	}
	if info.ImageCount != 1 {
		t.Errorf("ImageCount = %d, want 1", info.ImageCount)
	}
}

func TestGetSubfolders(t *testing.T) {
	dir := t.TempDir()
	sub1 := filepath.Join(dir, "chapter1")
	sub2 := filepath.Join(dir, "chapter2")
	os.Mkdir(sub1, 0755)
	os.Mkdir(sub2, 0755)
	os.WriteFile(filepath.Join(sub1, "page1.png"), []byte("data"), 0644)
	os.WriteFile(filepath.Join(sub2, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		getShallowImageCount: func(folderPath string) int {
			return 1
		},
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "page1.png"), true
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	folders, err := m.GetSubfolders(dir)
	if err != nil {
		t.Fatalf("GetSubfolders error = %v", err)
	}
	if len(folders) != 2 {
		t.Fatalf("expected 2 subfolders, got %d", len(folders))
	}
}

func TestGetSubfolders_EmptyDir(t *testing.T) {
	dir := t.TempDir()
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})

	folders, err := m.GetSubfolders(dir)
	if err != nil {
		t.Fatalf("GetSubfolders error = %v", err)
	}
	if len(folders) != 0 {
		t.Errorf("expected 0 subfolders in empty dir, got %d", len(folders))
	}
}

func TestGetSubfolders_SkipNonImageDirs(t *testing.T) {
	dir := t.TempDir()
	os.Mkdir(filepath.Join(dir, "empty_chapter"), 0755)

	fl := &mockFileLoader{
		getShallowImageCount: func(folderPath string) int {
			return 0
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	folders, err := m.GetSubfolders(dir)
	if err != nil {
		t.Fatalf("GetSubfolders error = %v", err)
	}
	if len(folders) != 0 {
		t.Errorf("expected 0 folders (no images in subdirs), got %d", len(folders))
	}
}

func TestGetImages_MinImageSize(t *testing.T) {
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "page1.png")
	os.WriteFile(imgPath, []byte("small"), 0644)

	fl := &mockFileLoader{
		getImages: func(folderPath string) ([]fileloader.ImageInfo, error) {
			return []fileloader.ImageInfo{
				{Path: imgPath, Name: "page1.png", Extension: "png", Size: 5, Index: 0},
				{Path: filepath.Join(dir, "page2.png"), Name: "page2.png", Extension: "png", Size: 50000, Index: 1},
			}, nil
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	settings := &persistence.Settings{MinImageSize: 10}
	ordersRepo := database.NewImageOrdersRepository(newTestDB(t))

	images, err := m.GetImages(dir, settings, ordersRepo)
	if err != nil {
		t.Fatalf("GetImages error = %v", err)
	}
	if len(images) != 1 {
		t.Fatalf("expected 1 image after min size filter, got %d", len(images))
	}
	if images[0].Name != "page2.png" {
		t.Errorf("expected filtered image name page2.png, got %q", images[0].Name)
	}
}

func TestGetImages_NoMinImageSize(t *testing.T) {
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "page1.png")
	os.WriteFile(imgPath, []byte("data"), 0644)

	fl := &mockFileLoader{
		getImages: func(folderPath string) ([]fileloader.ImageInfo, error) {
			return []fileloader.ImageInfo{
				{Path: imgPath, Name: "page1.png", Extension: "png", Size: 4, Index: 0},
			}, nil
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	settings := &persistence.Settings{MinImageSize: 0}
	ordersRepo := database.NewImageOrdersRepository(newTestDB(t))

	images, err := m.GetImages(dir, settings, ordersRepo)
	if err != nil {
		t.Fatalf("GetImages error = %v", err)
	}
	if len(images) != 1 {
		t.Fatalf("expected 1 image (no filter), got %d", len(images))
	}
}

func TestGetImagesShallow_MinImageSize(t *testing.T) {
	dir := t.TempDir()
	fl := &mockFileLoader{
		getImagesShallow: func(folderPath string) ([]fileloader.ImageInfo, error) {
			return []fileloader.ImageInfo{
				{Path: filepath.Join(folderPath, "small.png"), Name: "small.png", Extension: "png", Size: 100, Index: 0},
				{Path: filepath.Join(folderPath, "large.png"), Name: "large.png", Extension: "png", Size: 102400, Index: 1},
			}, nil
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	settings := &persistence.Settings{MinImageSize: 50}
	ordersRepo := database.NewImageOrdersRepository(newTestDB(t))

	images, err := m.GetImagesShallow(dir, settings, ordersRepo)
	if err != nil {
		t.Fatalf("GetImagesShallow error = %v", err)
	}
	if len(images) != 1 {
		t.Fatalf("expected 1 image after filter, got %d", len(images))
	}
	if images[0].Name != "large.png" {
		t.Errorf("expected 'large.png', got %q", images[0].Name)
	}
}

func TestGetImages_WithCustomOrder(t *testing.T) {
	dir := t.TempDir()
	fl := &mockFileLoader{
		getImages: func(folderPath string) ([]fileloader.ImageInfo, error) {
			return []fileloader.ImageInfo{
				{Name: "page3.png", Extension: "png", Size: 100, Index: 0},
				{Name: "page1.png", Extension: "png", Size: 100, Index: 1},
				{Name: "page2.png", Extension: "png", Size: 100, Index: 2},
			}, nil
		},
	}
	db := newTestDB(t)
	m := newTestModule(t, fl, &mockURLBuilder{})
	ordersRepo := database.NewImageOrdersRepository(db)

	// Set custom order
	ordersRepo.Save(dir, []string{"page1.png", "page2.png", "page3.png"}, []string{"page3.png", "page1.png", "page2.png"})

	settings := &persistence.Settings{MinImageSize: 0}
	images, err := m.GetImages(dir, settings, ordersRepo)
	if err != nil {
		t.Fatalf("GetImages error = %v", err)
	}
	if len(images) != 3 {
		t.Fatalf("expected 3 images, got %d", len(images))
	}
	if images[0].Name != "page1.png" {
		t.Errorf("first image after custom order = %q, want %q", images[0].Name, "page1.png")
	}
	if images[2].Name != "page3.png" {
		t.Errorf("last image after custom order = %q, want %q", images[2].Name, "page3.png")
	}
}

func TestSetSeriesModule(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})

	called := false
	m.SetSeriesModule(&mockSeriesModule{
		addSeriesFn: func(path string, subfolders []persistence.FolderInfo, isTemp bool) (*persistence.AddFolderResult, error) {
			called = true
			return &persistence.AddFolderResult{Path: path, IsSeries: true}, nil
		},
	})

	if m.seriesModule == nil {
		t.Error("seriesModule should be set")
	}

	// Verify the interface works by calling it indirectly through AddFolder
	// when there are subdirectories
	dir := t.TempDir()
	subDir := filepath.Join(dir, "chapter1")
	os.Mkdir(subDir, 0755)
	os.WriteFile(filepath.Join(subDir, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		getImages: func(folderPath string) ([]fileloader.ImageInfo, error) {
			return []fileloader.ImageInfo{
				{Path: filepath.Join(folderPath, "page1.png"), Name: "page1.png", Extension: "png", Size: 100, Index: 0},
			}, nil
		},
		getShallowImageCount: func(folderPath string) int {
			return 1
		},
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "page1.png"), true
		},
		hasSubdirectories: func(folderPath string) bool {
			return true
		},
	}
	m2 := newTestModule(t, fl, &mockURLBuilder{})
	m2.SetSeriesModule(&mockSeriesModule{
		addSeriesFn: func(path string, subfolders []persistence.FolderInfo, isTemp bool) (*persistence.AddFolderResult, error) {
			called = true
			return &persistence.AddFolderResult{Path: path, IsSeries: true}, nil
		},
	})

	m2.AddFolder(dir)
	if !called {
		t.Error("seriesModule.AddSeries should have been called when adding folder with subdirectories")
	}
}

type mockSeriesModule struct {
	addSeriesFn func(path string, subfolders []persistence.FolderInfo, isTemp bool) (*persistence.AddFolderResult, error)
}

func (m *mockSeriesModule) AddSeries(path string, subfolders []persistence.FolderInfo, isTemp bool) (*persistence.AddFolderResult, error) {
	if m.addSeriesFn != nil {
		return m.addSeriesFn(path, subfolders, isTemp)
	}
	return &persistence.AddFolderResult{Path: path, IsSeries: true}, nil
}

func TestUnwrapArchiveRoot(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})

	dir := t.TempDir()
	nested := filepath.Join(dir, "level1", "level2")
	os.MkdirAll(nested, 0755)
	os.WriteFile(filepath.Join(nested, "page1.png"), []byte("data"), 0644)

	result := m.unwrapArchiveRoot(dir)
	// Unwraps through single subdirectory layers until reaching one with images
	expected := nested
	if result != expected {
		t.Errorf("expected unwrapped to %q, got %q", expected, result)
	}
}

func TestUnwrapArchiveRoot_SingleSubdir(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})

	dir := t.TempDir()
	singleSub := filepath.Join(dir, "subdir")
	os.Mkdir(singleSub, 0755)

	result := m.unwrapArchiveRoot(dir)
	if result != singleSub {
		t.Errorf("expected to unwrap to %q, got %q", singleSub, result)
	}
}

func TestUnwrapArchiveRoot_EmptyDir(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})

	dir := t.TempDir()
	result := m.unwrapArchiveRoot(dir)
	if result != dir {
		t.Errorf("expected to return same dir for empty, got %q", result)
	}
}
