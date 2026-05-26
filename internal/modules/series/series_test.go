package series

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"manga-visor/internal/database"
	"manga-visor/internal/fileloader"
	"manga-visor/internal/persistence"
	"manga-visor/internal/services"
)

func init() {
	eventsEmit = func(_ context.Context, _ string, _ ...interface{}) {}
}

type mockFileLoader struct {
	registerDir          func(dirPath string) string
	getDir               func(hash string) (string, bool)
	getImages            func(folderPath string) ([]fileloader.ImageInfo, error)
	getImagesShallow     func(folderPath string) ([]fileloader.ImageInfo, error)
	isSupportedImage     func(filename string) bool
	getMimeType          func(filename string) string
	findFirstImage       func(folderPath string) (string, bool)
	findFirstImageShallow func(folderPath string) (string, bool)
	getShallowImageCount func(folderPath string) int
	hasSubdirectories    func(folderPath string) bool
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
	setBaseURL              func(baseURL string)
	buildImageURL           func(dirHash, filename string) string
	buildThumbnailURL       func(dirHash, filename string) string
	buildThumbnailURLFromPath func(dirHash, fullPath string) string
	buildImageURLFromPath   func(dirHash, dirPath, fullPath string) string
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

func newTestModule(t *testing.T, fl services.FileLoaderInterface, urlB services.URLBuilderInterface) *Module {
	t.Helper()
	db, err := database.New(t.TempDir())
	if err != nil {
		t.Fatalf("database.New error = %v", err)
	}
	t.Cleanup(func() { db.Close() })
	repo := database.NewSeriesRepository(db)
	m := NewModule(repo, fl, urlB, mockLogger{})
	m.SetContext(context.Background())
	return m
}

func TestNewModule(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})
	if m == nil {
		t.Fatal("NewModule returned nil")
	}
}

func TestAddSeries_Basic(t *testing.T) {
	dir := t.TempDir()
	ch1 := filepath.Join(dir, "chapter1")
	ch2 := filepath.Join(dir, "chapter2")
	os.MkdirAll(ch1, 0755)
	os.MkdirAll(ch2, 0755)
	os.WriteFile(filepath.Join(ch1, "page1.png"), []byte("data"), 0644)
	os.WriteFile(filepath.Join(ch2, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "page1.png"), true
		},
		isSupportedImage: func(filename string) bool {
			return true
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	subfolders := []persistence.FolderInfo{
		{Path: ch1, Name: "chapter1", ImageCount: 1, CoverImage: filepath.Join(ch1, "page1.png")},
		{Path: ch2, Name: "chapter2", ImageCount: 1, CoverImage: filepath.Join(ch2, "page1.png")},
	}

	result, err := m.AddSeries(dir, subfolders, false)
	if err != nil {
		t.Fatalf("AddSeries error = %v", err)
	}
	if result == nil {
		t.Fatal("AddSeries returned nil")
	}
	if !result.IsSeries {
		t.Error("expected IsSeries = true")
	}
	if result.Path != dir {
		t.Errorf("result.Path = %q, want %q", result.Path, dir)
	}
}

func TestAddSeries_CoverImageDetection(t *testing.T) {
	dir := t.TempDir()
	ch1 := filepath.Join(dir, "chapter1")
	os.MkdirAll(ch1, 0755)
	os.WriteFile(filepath.Join(ch1, "cover.jpg"), []byte("data"), 0644)
	os.WriteFile(filepath.Join(ch1, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "cover.jpg"), true
		},
		isSupportedImage: func(filename string) bool {
			ext := filepath.Ext(filename)
			return ext == ".png" || ext == ".jpg"
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	subfolders := []persistence.FolderInfo{
		{Path: ch1, Name: "chapter1", ImageCount: 2, CoverImage: filepath.Join(ch1, "cover.jpg")},
	}

	result, err := m.AddSeries(dir, subfolders, false)
	if err != nil {
		t.Fatalf("AddSeries error = %v", err)
	}
	if result == nil {
		t.Fatal("AddSeries returned nil")
	}
}

func TestAddSeries_EmptySubfolders(t *testing.T) {
	dir := t.TempDir()
	os.MkdirAll(dir, 0755)
	os.WriteFile(filepath.Join(dir, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "page1.png"), true
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	result, err := m.AddSeries(dir, nil, false)
	if err != nil {
		t.Fatalf("AddSeries error = %v", err)
	}
	if result == nil {
		t.Fatal("AddSeries returned nil")
	}
}

func TestAddSeries_WithLogger(t *testing.T) {
	dir := t.TempDir()
	ch1 := filepath.Join(dir, "ch1")
	os.MkdirAll(ch1, 0755)
	os.WriteFile(filepath.Join(ch1, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "page1.png"), true
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	subfolders := []persistence.FolderInfo{
		{Path: ch1, Name: "ch1", ImageCount: 1, CoverImage: filepath.Join(ch1, "page1.png")},
	}

	_, err := m.AddSeries(dir, subfolders, false)
	if err != nil {
		t.Fatalf("AddSeries error = %v", err)
	}
}

func TestGetSeries_Empty(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})
	entries := m.GetSeries()
	if len(entries) != 0 {
		t.Errorf("expected empty series list, got %d", len(entries))
	}
}

func TestGetSeries_WithEntries(t *testing.T) {
	dir := t.TempDir()
	ch1 := filepath.Join(dir, "ch1")
	os.MkdirAll(ch1, 0755)
	os.WriteFile(filepath.Join(ch1, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "page1.png"), true
		},
		isSupportedImage: func(filename string) bool {
			return true
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	subfolders := []persistence.FolderInfo{
		{Path: ch1, Name: "ch1", ImageCount: 1, CoverImage: filepath.Join(ch1, "page1.png")},
	}
	m.AddSeries(dir, subfolders, false)

	entries := m.GetSeries()
	if len(entries) != 1 {
		t.Fatalf("expected 1 series, got %d", len(entries))
	}
	if entries[0].Path != dir {
		t.Errorf("series path = %q, want %q", entries[0].Path, dir)
	}
	if len(entries[0].Chapters) != 1 {
		t.Errorf("expected 1 chapter, got %d", len(entries[0].Chapters))
	}
}

func TestGetSeries_CoverImageLookup(t *testing.T) {
	dir := t.TempDir()
	ch1 := filepath.Join(dir, "ch1")
	os.MkdirAll(ch1, 0755)

	fl := &mockFileLoader{
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "page1.png"), true
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	subfolders := []persistence.FolderInfo{
		{Path: ch1, Name: "ch1", ImageCount: 1, CoverImage: ""},
	}
	m.AddSeries(dir, subfolders, false)

	entries := m.GetSeries()
	if len(entries) != 1 {
		t.Fatalf("expected 1 series, got %d", len(entries))
	}
	if len(entries[0].Chapters) != 1 {
		t.Fatalf("expected 1 chapter, got %d", len(entries[0].Chapters))
	}
}

func TestRemoveSeries(t *testing.T) {
	dir := t.TempDir()
	ch1 := filepath.Join(dir, "ch1")
	os.MkdirAll(ch1, 0755)
	os.WriteFile(filepath.Join(ch1, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "page1.png"), true
		},
		isSupportedImage: func(filename string) bool {
			return true
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	subfolders := []persistence.FolderInfo{
		{Path: ch1, Name: "ch1", ImageCount: 1, CoverImage: filepath.Join(ch1, "page1.png")},
	}
	m.AddSeries(dir, subfolders, false)

	if err := m.RemoveSeries(dir); err != nil {
		t.Fatalf("RemoveSeries error = %v", err)
	}

	entries := m.GetSeries()
	if len(entries) != 0 {
		t.Errorf("expected 0 series after remove, got %d", len(entries))
	}
}

func TestRemoveSeries_NotFound(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})
	// Repository Remove does not error on nonexistent entries
	err := m.RemoveSeries("/nonexistent/path")
	if err != nil {
		t.Errorf("unexpected error for removing nonexistent series: %v", err)
	}
}

func TestClearSeries(t *testing.T) {
	dir := t.TempDir()
	ch1 := filepath.Join(dir, "ch1")
	os.MkdirAll(ch1, 0755)
	os.WriteFile(filepath.Join(ch1, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "page1.png"), true
		},
		isSupportedImage: func(filename string) bool {
			return true
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	subfolders := []persistence.FolderInfo{
		{Path: ch1, Name: "ch1", ImageCount: 1, CoverImage: filepath.Join(ch1, "page1.png")},
	}
	m.AddSeries(dir, subfolders, false)

	if err := m.ClearSeries(); err != nil {
		t.Fatalf("ClearSeries error = %v", err)
	}

	entries := m.GetSeries()
	if len(entries) != 0 {
		t.Errorf("expected 0 series after clear, got %d", len(entries))
	}
}

func TestGetChapterNavigation_Found(t *testing.T) {
	dir := t.TempDir()
	ch1 := filepath.Join(dir, "ch1")
	ch2 := filepath.Join(dir, "ch2")
	ch3 := filepath.Join(dir, "ch3")
	os.MkdirAll(ch1, 0755)
	os.MkdirAll(ch2, 0755)
	os.MkdirAll(ch3, 0755)
	os.WriteFile(filepath.Join(ch1, "page1.png"), []byte("data"), 0644)
	os.WriteFile(filepath.Join(ch2, "page1.png"), []byte("data"), 0644)
	os.WriteFile(filepath.Join(ch3, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "page1.png"), true
		},
		isSupportedImage: func(filename string) bool {
			return true
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	subfolders := []persistence.FolderInfo{
		{Path: ch1, Name: "ch1", ImageCount: 1, CoverImage: filepath.Join(ch1, "page1.png")},
		{Path: ch2, Name: "ch2", ImageCount: 1, CoverImage: filepath.Join(ch2, "page1.png")},
		{Path: ch3, Name: "ch3", ImageCount: 1, CoverImage: filepath.Join(ch3, "page1.png")},
	}
	m.AddSeries(dir, subfolders, false)

	// Test middle chapter navigation
	nav := m.GetChapterNavigation(ch2)
	if nav == nil {
		t.Fatal("GetChapterNavigation returned nil")
	}
	if nav.SeriesPath != dir {
		t.Errorf("SeriesPath = %q, want %q", nav.SeriesPath, dir)
	}
	if nav.ChapterIndex != 1 {
		t.Errorf("ChapterIndex = %d, want 1", nav.ChapterIndex)
	}
	if nav.TotalChapters != 3 {
		t.Errorf("TotalChapters = %d, want 3", nav.TotalChapters)
	}
	if nav.PrevChapter == nil || nav.PrevChapter.Path != ch1 {
		t.Errorf("PrevChapter.Path = %v, want %q", nav.PrevChapter, ch1)
	}
	if nav.NextChapter == nil || nav.NextChapter.Path != ch3 {
		t.Errorf("NextChapter.Path = %v, want %q", nav.NextChapter, ch3)
	}
}

func TestGetChapterNavigation_FirstChapter(t *testing.T) {
	dir := t.TempDir()
	ch1 := filepath.Join(dir, "ch1")
	ch2 := filepath.Join(dir, "ch2")
	os.MkdirAll(ch1, 0755)
	os.MkdirAll(ch2, 0755)
	os.WriteFile(filepath.Join(ch1, "page1.png"), []byte("data"), 0644)
	os.WriteFile(filepath.Join(ch2, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "page1.png"), true
		},
		isSupportedImage: func(filename string) bool {
			return true
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	subfolders := []persistence.FolderInfo{
		{Path: ch1, Name: "ch1", ImageCount: 1, CoverImage: filepath.Join(ch1, "page1.png")},
		{Path: ch2, Name: "ch2", ImageCount: 1, CoverImage: filepath.Join(ch2, "page1.png")},
	}
	m.AddSeries(dir, subfolders, false)

	nav := m.GetChapterNavigation(ch1)
	if nav == nil {
		t.Fatal("GetChapterNavigation returned nil")
	}
	if nav.PrevChapter != nil {
		t.Error("first chapter should have no prev chapter")
	}
	if nav.NextChapter == nil || nav.NextChapter.Path != ch2 {
		t.Errorf("NextChapter.Path = %v, want %q", nav.NextChapter, ch2)
	}
}

func TestGetChapterNavigation_LastChapter(t *testing.T) {
	dir := t.TempDir()
	ch1 := filepath.Join(dir, "ch1")
	ch2 := filepath.Join(dir, "ch2")
	os.MkdirAll(ch1, 0755)
	os.MkdirAll(ch2, 0755)
	os.WriteFile(filepath.Join(ch1, "page1.png"), []byte("data"), 0644)
	os.WriteFile(filepath.Join(ch2, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "page1.png"), true
		},
		isSupportedImage: func(filename string) bool {
			return true
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	subfolders := []persistence.FolderInfo{
		{Path: ch1, Name: "ch1", ImageCount: 1, CoverImage: filepath.Join(ch1, "page1.png")},
		{Path: ch2, Name: "ch2", ImageCount: 1, CoverImage: filepath.Join(ch2, "page1.png")},
	}
	m.AddSeries(dir, subfolders, false)

	nav := m.GetChapterNavigation(ch2)
	if nav == nil {
		t.Fatal("GetChapterNavigation returned nil")
	}
	if nav.NextChapter != nil {
		t.Error("last chapter should have no next chapter")
	}
	if nav.PrevChapter == nil || nav.PrevChapter.Path != ch1 {
		t.Errorf("PrevChapter.Path = %v, want %q", nav.PrevChapter, ch1)
	}
}

func TestGetChapterNavigation_NotFound(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})
	nav := m.GetChapterNavigation("/nonexistent/path")
	if nav != nil {
		t.Error("expected nil for nonexistent chapter path")
	}
}

func TestGetChapterNavigation_SingleChapter(t *testing.T) {
	dir := t.TempDir()
	ch1 := filepath.Join(dir, "ch1")
	os.MkdirAll(ch1, 0755)
	os.WriteFile(filepath.Join(ch1, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "page1.png"), true
		},
		isSupportedImage: func(filename string) bool {
			return true
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	subfolders := []persistence.FolderInfo{
		{Path: ch1, Name: "ch1", ImageCount: 1, CoverImage: filepath.Join(ch1, "page1.png")},
	}
	m.AddSeries(dir, subfolders, false)

	nav := m.GetChapterNavigation(ch1)
	if nav == nil {
		t.Fatal("GetChapterNavigation returned nil")
	}
	if nav.PrevChapter != nil {
		t.Error("single chapter should have no prev")
	}
	if nav.NextChapter != nil {
		t.Error("single chapter should have no next")
	}
	if nav.ChapterIndex != 0 {
		t.Errorf("ChapterIndex = %d, want 0", nav.ChapterIndex)
	}
	if nav.TotalChapters != 1 {
		t.Errorf("TotalChapters = %d, want 1", nav.TotalChapters)
	}
}

func TestGetSiblings_Found(t *testing.T) {
	dir := t.TempDir()
	ch1 := filepath.Join(dir, "ch1")
	ch2 := filepath.Join(dir, "ch2")
	os.MkdirAll(ch1, 0755)
	os.MkdirAll(ch2, 0755)
	os.WriteFile(filepath.Join(ch1, "page1.png"), []byte("data"), 0644)
	os.WriteFile(filepath.Join(ch2, "page1.png"), []byte("data"), 0644)

	fl := &mockFileLoader{
		findFirstImageShallow: func(folderPath string) (string, bool) {
			return filepath.Join(folderPath, "page1.png"), true
		},
		isSupportedImage: func(filename string) bool {
			return true
		},
	}
	m := newTestModule(t, fl, &mockURLBuilder{})

	subfolders := []persistence.FolderInfo{
		{Path: ch1, Name: "ch1", ImageCount: 1, CoverImage: filepath.Join(ch1, "page1.png")},
		{Path: ch2, Name: "ch2", ImageCount: 1, CoverImage: filepath.Join(ch2, "page1.png")},
	}
	m.AddSeries(dir, subfolders, false)

	siblings := m.GetSiblings(ch2)
	if siblings == nil {
		t.Fatal("GetSiblings returned nil")
	}
	if len(siblings) != 2 {
		t.Fatalf("expected 2 siblings, got %d", len(siblings))
	}
}

func TestGetSiblings_NotFound(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})
	siblings := m.GetSiblings("/nonexistent/path")
	if siblings != nil {
		t.Error("expected nil for nonexistent chapter path")
	}
}

func TestGetSiblings_EmptySeries(t *testing.T) {
	m := newTestModule(t, &mockFileLoader{}, &mockURLBuilder{})
	siblings := m.GetSiblings("/any/path")
	if siblings != nil {
		t.Error("expected nil for empty series")
	}
}
