// Package thumbnails provides thumbnail generation and caching
package thumbnails

import (
	"crypto/md5"
	"encoding/base64"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"os"
	"path/filepath"
	"strings"
	"sync"

	_ "image/gif" // GIF support

	_ "golang.org/x/image/bmp"  // BMP support
	_ "golang.org/x/image/tiff" // TIFF support
	_ "golang.org/x/image/webp" // WebP support
)

const (
	thumbnailWidth  = 200
	thumbnailHeight = 300
	cacheDir        = "cache/thumbnails"
)

// Generator handles thumbnail generation and caching
type Generator struct {
	cacheDir string
	mu       sync.RWMutex
}

// NewGenerator creates a new thumbnail generator
func NewGenerator() *Generator {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}

	cacheDir := filepath.Join(homeDir, ".manga-visor", cacheDir)

	// Create cache directory
	os.MkdirAll(cacheDir, 0755)

	return &Generator{
		cacheDir: cacheDir,
	}
}

// generateCacheKey generates a cache key for an image path
func (g *Generator) generateCacheKey(imagePath string) string {
	hash := md5.Sum([]byte(imagePath))
	return fmt.Sprintf("%x.jpg", hash)
}

// getCachePath returns the full cache path for an image
func (g *Generator) getCachePath(imagePath string) string {
	return filepath.Join(g.cacheDir, g.generateCacheKey(imagePath))
}

// IsCached checks if a thumbnail is already cached
func (g *Generator) IsCached(imagePath string) bool {
	g.mu.RLock()
	defer g.mu.RUnlock()

	cachePath := g.getCachePath(imagePath)
	_, err := os.Stat(cachePath)
	return err == nil
}

// GetThumbnail returns a thumbnail for an image (generates if not cached)
func (g *Generator) GetThumbnail(imagePath string) (string, error) {
	// Check cache first
	if g.IsCached(imagePath) {
		return g.loadCachedThumbnail(imagePath)
	}

	// Generate thumbnail
	return g.generateThumbnail(imagePath)
}

// GetThumbnailBytes returns thumbnail as raw bytes
func (g *Generator) GetThumbnailBytes(imagePath string) ([]byte, error) {
	cachePath := g.getCachePath(imagePath)

	// Generate if not cached
	if !g.IsCached(imagePath) {
		_, err := g.generateThumbnail(imagePath)
		if err != nil {
			return nil, err
		}
	}

	return os.ReadFile(cachePath)
}

// loadCachedThumbnail loads a thumbnail from cache
func (g *Generator) loadCachedThumbnail(imagePath string) (string, error) {
	cachePath := g.getCachePath(imagePath)

	data, err := os.ReadFile(cachePath)
	if err != nil {
		return "", fmt.Errorf("failed to load cached thumbnail: %w", err)
	}

	base64Data := base64.StdEncoding.EncodeToString(data)
	return fmt.Sprintf("data:image/jpeg;base64,%s", base64Data), nil
}

// generateThumbnail generates a thumbnail for an image
func (g *Generator) generateThumbnail(imagePath string) (string, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	// Open original image
	file, err := os.Open(imagePath)
	if err != nil {
		return "", fmt.Errorf("failed to open image: %w", err)
	}
	defer file.Close()

	// Decode image
	img, format, err := image.Decode(file)
	if err != nil {
		// For SVG, return the original as base64
		if strings.HasSuffix(strings.ToLower(imagePath), ".svg") {
			return g.loadSVGAsThumbnail(imagePath)
		}
		return "", fmt.Errorf("failed to decode image (%s): %w", format, err)
	}

	// Calculate new dimensions maintaining aspect ratio
	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	newWidth, newHeight := calculateThumbnailSize(origWidth, origHeight, thumbnailWidth, thumbnailHeight)

	// Create thumbnail using simple nearest-neighbor scaling
	// For better quality, you could use golang.org/x/image/draw
	thumbnail := resizeImage(img, newWidth, newHeight)

	// Save to cache
	cachePath := g.getCachePath(imagePath)
	cacheFile, err := os.Create(cachePath)
	if err != nil {
		return "", fmt.Errorf("failed to create cache file: %w", err)
	}
	defer cacheFile.Close()

	// Encode as JPEG with good quality
	err = jpeg.Encode(cacheFile, thumbnail, &jpeg.Options{Quality: 85})
	if err != nil {
		return "", fmt.Errorf("failed to encode thumbnail: %w", err)
	}

	// Return as base64
	return g.loadCachedThumbnail(imagePath)
}

// loadSVGAsThumbnail loads an SVG file and returns it as a data URL
func (g *Generator) loadSVGAsThumbnail(imagePath string) (string, error) {
	data, err := os.ReadFile(imagePath)
	if err != nil {
		return "", err
	}

	base64Data := base64.StdEncoding.EncodeToString(data)
	return fmt.Sprintf("data:image/svg+xml;base64,%s", base64Data), nil
}

// calculateThumbnailSize calculates thumbnail dimensions maintaining aspect ratio
func calculateThumbnailSize(origWidth, origHeight, maxWidth, maxHeight int) (int, int) {
	// Calculate scale factors
	widthRatio := float64(maxWidth) / float64(origWidth)
	heightRatio := float64(maxHeight) / float64(origHeight)

	// Use the smaller ratio to maintain aspect ratio
	ratio := widthRatio
	if heightRatio < widthRatio {
		ratio = heightRatio
	}

	newWidth := int(float64(origWidth) * ratio)
	newHeight := int(float64(origHeight) * ratio)

	// Ensure minimum size of 1
	if newWidth < 1 {
		newWidth = 1
	}
	if newHeight < 1 {
		newHeight = 1
	}

	return newWidth, newHeight
}

// resizeImage performs simple image resizing
func resizeImage(src image.Image, width, height int) image.Image {
	bounds := src.Bounds()
	srcWidth := bounds.Dx()
	srcHeight := bounds.Dy()

	dst := image.NewRGBA(image.Rect(0, 0, width, height))

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			srcX := x * srcWidth / width
			srcY := y * srcHeight / height
			dst.Set(x, y, src.At(bounds.Min.X+srcX, bounds.Min.Y+srcY))
		}
	}

	return dst
}

// ClearCache clears the thumbnail cache
func (g *Generator) ClearCache() error {
	g.mu.Lock()
	defer g.mu.Unlock()

	return os.RemoveAll(g.cacheDir)
}

// ClearCacheForFolder clears thumbnails for images in a specific folder
func (g *Generator) ClearCacheForFolder(folderPath string) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		imagePath := filepath.Join(folderPath, entry.Name())
		cachePath := g.getCachePath(imagePath)
		os.Remove(cachePath) // Ignore errors for non-existent files
	}

	return nil
}

// PreloadThumbnails generates thumbnails for all images in a folder
func (g *Generator) PreloadThumbnails(imagePaths []string) {
	var wg sync.WaitGroup

	// Limit concurrent thumbnail generation
	semaphore := make(chan struct{}, 4)

	for _, path := range imagePaths {
		if g.IsCached(path) {
			continue
		}

		wg.Add(1)
		semaphore <- struct{}{}

		go func(imagePath string) {
			defer wg.Done()
			defer func() { <-semaphore }()

			g.generateThumbnail(imagePath)
		}(path)
	}

	wg.Wait()
}

// GenerateThumbnailPNG generates a PNG thumbnail (for transparency support)
func (g *Generator) GenerateThumbnailPNG(imagePath string, outputPath string) error {
	// Open original image
	file, err := os.Open(imagePath)
	if err != nil {
		return err
	}
	defer file.Close()

	// Decode image
	img, _, err := image.Decode(file)
	if err != nil {
		return err
	}

	bounds := img.Bounds()
	newWidth, newHeight := calculateThumbnailSize(bounds.Dx(), bounds.Dy(), thumbnailWidth, thumbnailHeight)
	thumbnail := resizeImage(img, newWidth, newHeight)

	out, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer out.Close()

	return png.Encode(out, thumbnail)
}
