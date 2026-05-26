package thumbnails

import (
	"image"
	"image/color"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"testing"
)

func createTestImage(t *testing.T, path string, width, height int) {
	t.Helper()
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, color.RGBA{uint8(x % 256), uint8(y % 256), 128, 255})
		}
	}
	if err := png.Encode(f, img); err != nil {
		t.Fatal(err)
	}
}

func newTestGenerator(t *testing.T) *Generator {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "cache", "thumbnails.db")
	boltStore, err := NewBoltStore(dbPath)
	if err != nil {
		t.Fatalf("NewBoltStore error = %v", err)
	}
	g := &Generator{
		boltStore: boltStore,
		semaphore: make(chan struct{}, 4),
	}
	t.Cleanup(func() { g.Close() })
	return g
}

func TestCalculateThumbnailSize(t *testing.T) {
	tests := []struct {
		origW, origH int
		maxW, maxH   int
		wantW, wantH int
	}{
		{400, 600, 400, 600, 400, 600},
		{800, 600, 400, 600, 400, 300},
		{400, 1200, 400, 600, 200, 600},
		{100, 100, 400, 600, 400, 400},
		{2000, 3000, 400, 600, 400, 600},
		{10, 10, 400, 600, 400, 400},
	}
	for _, tt := range tests {
		w, h := calculateThumbnailSize(tt.origW, tt.origH, tt.maxW, tt.maxH)
		if w != tt.wantW || h != tt.wantH {
			t.Errorf("calculateThumbnailSize(%d,%d,%d,%d) = (%d,%d), want (%d,%d)",
				tt.origW, tt.origH, tt.maxW, tt.maxH, w, h, tt.wantW, tt.wantH)
		}
	}
}

func TestCalculateThumbnailSize_MinSize(t *testing.T) {
	w, h := calculateThumbnailSize(1, 1, 400, 600)
	if w < 1 || h < 1 {
		t.Errorf("dimensions should be at least 1, got (%d,%d)", w, h)
	}
}

func TestStoreKey(t *testing.T) {
	g := newTestGenerator(t)
	key := g.storeKey("/some/image.png")
	expected := thumbnailCacheVersion + "|/some/image.png"
	if key != expected {
		t.Errorf("storeKey = %q, want %q", key, expected)
	}
}

func TestIsCached_Missing(t *testing.T) {
	g := newTestGenerator(t)
	if g.IsCached("/nonexistent.png") {
		t.Error("IsCached should return false for missing image")
	}
}

func TestIsCached_Present(t *testing.T) {
	g := newTestGenerator(t)
	g.boltStore.Put(g.storeKey("/test.png"), []byte("data"))
	if !g.IsCached("/test.png") {
		t.Error("IsCached should return true for cached image")
	}
}

func TestSetImageOpener(t *testing.T) {
	g := newTestGenerator(t)
	g.SetImageOpener(func(imagePath string) (io.ReadCloser, error) {
		return os.Open(imagePath)
	})
	if g.imageOpener == nil {
		t.Error("SetImageOpener should set the opener")
	}
}

func TestSetPaused(t *testing.T) {
	g := newTestGenerator(t)
	if g.paused.Load() {
		t.Error("generator should start unpaused")
	}
	g.SetPaused(true)
	if !g.paused.Load() {
		t.Error("generator should be paused after SetPaused(true)")
	}
	g.SetPaused(false)
	if g.paused.Load() {
		t.Error("generator should be unpaused after SetPaused(false)")
	}
}

func TestGenerateThumbnail_Basic(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "test.png")
	createTestImage(t, imgPath, 200, 300)

	result, err := g.generateThumbnail(imgPath)
	if err != nil {
		t.Fatalf("generateThumbnail error = %v", err)
	}
	if result == "" {
		t.Fatal("generateThumbnail returned empty result")
	}
}

func TestGenerateThumbnail_NotFound(t *testing.T) {
	g := newTestGenerator(t)
	_, err := g.generateThumbnail("/nonexistent/image.png")
	if err == nil {
		t.Error("expected error for nonexistent image")
	}
}

func TestGenerateThumbnail_UnsupportedFormat(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	filePath := filepath.Join(dir, "file.txt")
	os.WriteFile(filePath, []byte("not an image"), 0644)

	_, err := g.generateThumbnail(filePath)
	if err == nil {
		t.Error("expected error for unsupported format")
	}
}

func TestGenerateThumbnail_Paused(t *testing.T) {
	g := newTestGenerator(t)
	g.SetPaused(true)

	_, err := g.generateThumbnail("/any/path.png")
	if err == nil {
		t.Error("expected error when paused")
	}
}

func TestGenerateThumbnail_TallImage(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "tall.png")
	// Very tall image (manhwa style)
	createTestImage(t, imgPath, 200, 1000)

	result, err := g.generateThumbnail(imgPath)
	if err != nil {
		t.Fatalf("generateThumbnail for tall image error = %v", err)
	}
	if result == "" {
		t.Fatal("generateThumbnail returned empty result")
	}
}

func TestGetThumbnail_Generate(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "test.png")
	createTestImage(t, imgPath, 200, 300)

	result, err := g.GetThumbnail(imgPath)
	if err != nil {
		t.Fatalf("GetThumbnail error = %v", err)
	}
	if result == "" {
		t.Fatal("GetThumbnail returned empty result")
	}
}

func TestGetThumbnail_Cached(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "test.png")
	createTestImage(t, imgPath, 200, 300)

	// First call generates
	result1, err := g.GetThumbnail(imgPath)
	if err != nil {
		t.Fatalf("first GetThumbnail error = %v", err)
	}

	// Second call should load from cache
	result2, err := g.GetThumbnail(imgPath)
	if err != nil {
		t.Fatalf("second GetThumbnail error = %v", err)
	}

	if result1 != result2 {
		t.Error("cached result should match generated result")
	}
}

func TestGetThumbnail_Paused(t *testing.T) {
	g := newTestGenerator(t)
	g.SetPaused(true)

	_, err := g.GetThumbnail("/test.png")
	if err == nil {
		t.Error("expected error when paused")
	}
}

func TestGetThumbnailBytes(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "test.png")
	createTestImage(t, imgPath, 100, 150)

	data, err := g.GetThumbnailBytes(imgPath)
	if err != nil {
		t.Fatalf("GetThumbnailBytes error = %v", err)
	}
	if len(data) == 0 {
		t.Fatal("GetThumbnailBytes returned empty data")
	}
}

func TestGetThumbnailBytes_Cached(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "test.png")
	createTestImage(t, imgPath, 100, 150)

	data1, _ := g.GetThumbnailBytes(imgPath)
	data2, _ := g.GetThumbnailBytes(imgPath)

	if len(data1) == 0 || len(data2) == 0 {
		t.Fatal("should return non-empty data")
	}
}

func TestClearCache(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "test.png")
	createTestImage(t, imgPath, 100, 150)

	g.GetThumbnail(imgPath)
	if !g.IsCached(imgPath) {
		t.Fatal("image should be cached")
	}

	if err := g.ClearCache(); err != nil {
		t.Fatalf("ClearCache error = %v", err)
	}

	if g.IsCached(imgPath) {
		t.Error("cache should be empty after ClearCache")
	}
}

func TestClearCacheForFolder(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	img1 := filepath.Join(dir, "img1.png")
	img2 := filepath.Join(dir, "img2.png")
	createTestImage(t, img1, 100, 100)
	createTestImage(t, img2, 100, 100)

	g.GetThumbnail(img1)
	g.GetThumbnail(img2)

	otherDir := t.TempDir()
	otherImg := filepath.Join(otherDir, "other.png")
	createTestImage(t, otherImg, 100, 100)
	g.GetThumbnail(otherImg)

	if err := g.ClearCacheForFolder(dir); err != nil {
		t.Fatalf("ClearCacheForFolder error = %v", err)
	}

	if g.IsCached(img1) {
		t.Error("img1 thumbnail should be cleared")
	}
	if g.IsCached(img2) {
		t.Error("img2 thumbnail should be cleared")
	}
	if !g.IsCached(otherImg) {
		t.Error("other image thumbnail should still exist")
	}
}

func TestPreloadThumbnails(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()

	imgPaths := make([]string, 3)
	for i := range imgPaths {
		imgPaths[i] = filepath.Join(dir, "img%d.png")
		createTestImage(t, imgPaths[i], 50, 50)
	}

	g.PreloadThumbnails(imgPaths)

	for _, path := range imgPaths {
		if !g.IsCached(path) {
			t.Errorf("image %s should be cached after preload", path)
		}
	}
}

func TestPreloadThumbnails_EmptyList(t *testing.T) {
	g := newTestGenerator(t)
	g.PreloadThumbnails(nil)
	g.PreloadThumbnails([]string{})
}

func TestPreloadThumbnails_Paused(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "test.png")
	createTestImage(t, imgPath, 100, 100)

	g.SetPaused(true)
	g.PreloadThumbnails([]string{imgPath})

	if g.IsCached(imgPath) {
		t.Error("thumbnail should not be cached when paused")
	}
}

func TestLoadCachedThumbnail_NotFound(t *testing.T) {
	g := newTestGenerator(t)
	_, err := g.loadCachedThumbnail("/nonexistent.png")
	if err == nil {
		t.Error("expected error for missing thumbnail")
	}
}

func TestLoadCachedThumbnail_Success(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	imgPath := filepath.Join(dir, "test.png")
	createTestImage(t, imgPath, 100, 150)

	// Generate first
	g.GetThumbnail(imgPath)

	// Load from cache
	result, err := g.loadCachedThumbnail(imgPath)
	if err != nil {
		t.Fatalf("loadCachedThumbnail error = %v", err)
	}
	if result == "" {
		t.Error("loadCachedThumbnail returned empty")
	}
}

func TestGenerateThumbnailPNG(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	srcPath := filepath.Join(dir, "source.png")
	outPath := filepath.Join(dir, "thumb.png")
	createTestImage(t, srcPath, 200, 300)

	if err := g.GenerateThumbnailPNG(srcPath, outPath); err != nil {
		t.Fatalf("GenerateThumbnailPNG error = %v", err)
	}

	if _, err := os.Stat(outPath); os.IsNotExist(err) {
		t.Error("output thumbnail file should exist")
	}
}

func TestGenerateThumbnailPNG_TallImage(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	srcPath := filepath.Join(dir, "tall_source.png")
	outPath := filepath.Join(dir, "thumb.png")
	createTestImage(t, srcPath, 200, 1000)

	if err := g.GenerateThumbnailPNG(srcPath, outPath); err != nil {
		t.Fatalf("GenerateThumbnailPNG for tall image error = %v", err)
	}

	if _, err := os.Stat(outPath); os.IsNotExist(err) {
		t.Error("output thumbnail file should exist")
	}
}

func TestGenerateThumbnailPNG_SourceNotFound(t *testing.T) {
	g := newTestGenerator(t)
	err := g.GenerateThumbnailPNG("/nonexistent.png", "/out.png")
	if err == nil {
		t.Error("expected error for nonexistent source")
	}
}

func TestLoadSVGAsThumbnail(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	svgPath := filepath.Join(dir, "test.svg")
	svgContent := `<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>`
	os.WriteFile(svgPath, []byte(svgContent), 0644)

	result, err := g.loadSVGAsThumbnail(svgPath)
	if err != nil {
		t.Fatalf("loadSVGAsThumbnail error = %v", err)
	}
	if result == "" {
		t.Error("loadSVGAsThumbnail returned empty")
	}
}

func TestLoadSVGAsThumbnail_NotFound(t *testing.T) {
	g := newTestGenerator(t)
	_, err := g.loadSVGAsThumbnail("/nonexistent.svg")
	if err == nil {
		t.Error("expected error for nonexistent SVG")
	}
}

func TestGetThumbnail_SVG(t *testing.T) {
	g := newTestGenerator(t)
	dir := t.TempDir()
	svgPath := filepath.Join(dir, "test.svg")
	os.WriteFile(svgPath, []byte(`<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>`), 0644)

	result, err := g.GetThumbnail(svgPath)
	if err != nil {
		t.Fatalf("GetThumbnail for SVG error = %v", err)
	}
	if result == "" {
		t.Error("GetThumbnail for SVG returned empty")
	}
}
