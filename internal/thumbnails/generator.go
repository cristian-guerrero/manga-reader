// Package thumbnails provides thumbnail generation and caching
package thumbnails

import (
	"crypto/md5"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/gif" // GIF support
	"image/jpeg"
	"image/png"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"golang.org/x/image/draw"

	_ "github.com/gen2brain/avif" // AVIF support
	_ "golang.org/x/image/bmp"    // BMP support
	_ "golang.org/x/image/tiff"   // TIFF support
	_ "golang.org/x/image/webp"   // WebP support
)

const (
	thumbnailWidth    = 400
	thumbnailHeight   = 600
	thumbnailCacheDir = "cache/thumbnails"
)

// Generator handles thumbnail generation and caching
type Generator struct {
	cacheDir  string
	mu        sync.RWMutex
	pending   sync.Map      // map[string]chan struct{} for deduplicating generation
	semaphore chan struct{} // Global limit for concurrent generation
}

// NewGenerator creates a new thumbnail generator
func NewGenerator() *Generator {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}

	fullCacheDir := filepath.Join(homeDir, ".manga-visor", thumbnailCacheDir)

	// Create cache directory
	os.MkdirAll(fullCacheDir, 0755)

	return &Generator{
		cacheDir:  fullCacheDir,
		semaphore: make(chan struct{}, 4), // Limit to 4 concurrent generations
	}
}

// generateCacheKey generates a cache key for an image path
func (g *Generator) generateCacheKey(imagePath string) string {
	hash := md5.Sum([]byte(imagePath))
	return fmt.Sprintf("%x.jpg", hash)
}

// GetCachePath returns the full cache path for an image
func (g *Generator) GetCachePath(imagePath string) string {
	return filepath.Join(g.cacheDir, g.generateCacheKey(imagePath))
}

// IsCached checks if a thumbnail is already cached
func (g *Generator) IsCached(imagePath string) bool {
	g.mu.RLock()
	defer g.mu.RUnlock()

	cachePath := g.GetCachePath(imagePath)
	_, err := os.Stat(cachePath)
	return err == nil
}

// GetThumbnail returns a thumbnail for an image (generates if not cached)
func (g *Generator) GetThumbnail(imagePath string) (string, error) {
	// Check cache first
	if g.IsCached(imagePath) {
		return g.loadCachedThumbnail(imagePath)
	}

	// Deduplicate generation work
	waitCh := make(chan struct{})
	actual, loaded := g.pending.LoadOrStore(imagePath, waitCh)
	if loaded {
		// Another goroutine is already generating this thumbnail
		<-actual.(chan struct{})
		return g.loadCachedThumbnail(imagePath)
	}

	// We are responsible for generating it
	defer func() {
		close(waitCh)
		g.pending.Delete(imagePath)
	}()

	// Generate thumbnail
	return g.generateThumbnail(imagePath)
}

// GetThumbnailBytes returns thumbnail as raw bytes
func (g *Generator) GetThumbnailBytes(imagePath string) ([]byte, error) {
	cachePath := g.GetCachePath(imagePath)

	// Generate if not cached
	if !g.IsCached(imagePath) {
		_, err := g.GetThumbnail(imagePath)
		if err != nil {
			return nil, err
		}
	}

	return os.ReadFile(cachePath)
}

// loadCachedThumbnail loads a thumbnail from cache
func (g *Generator) loadCachedThumbnail(imagePath string) (string, error) {
	cachePath := g.GetCachePath(imagePath)

	data, err := os.ReadFile(cachePath)
	if err != nil {
		return "", fmt.Errorf("failed to load cached thumbnail: %w", err)
	}

	base64Data := base64.StdEncoding.EncodeToString(data)
	return fmt.Sprintf("data:image/jpeg;base64,%s", base64Data), nil
}

// generateThumbnail generates a thumbnail for an image
func (g *Generator) generateThumbnail(imagePath string) (string, error) {
	// Acquire semaphore to limit concurrency
	g.semaphore <- struct{}{}
	defer func() { <-g.semaphore }()

	// Open original image
	file, err := os.Open(imagePath)
	if err != nil {
		return "", fmt.Errorf("failed to open image: %w", err)
	}
	defer file.Close()

	// Decode image - with internal retry for extracted files that might be "busy" or 0-filled temporarily
	var img image.Image
	var format string
	var decodeErr error

	for attempts := 0; attempts < 3; attempts++ {
		file.Seek(0, 0)
		img, format, decodeErr = image.Decode(file)
		if decodeErr == nil {
			break
		}

		// If it's truly an unsupported format, don't bother retrying
		if decodeErr == image.ErrFormat {
			break
		}

		// Check if it's the "zeros" issue
		file.Seek(0, 0)
		header := make([]byte, 16)
		n, _ := file.Read(header)
		isZeros := true
		for i := 0; i < n; i++ {
			if header[i] != 0 {
				isZeros = false
				break
			}
		}

		if isZeros && n > 0 {
			fmt.Printf("[Generator] Warning: Header read as zeros for %s. Retrying in 200ms... (attempt %d)\n", imagePath, attempts+1)
			time.Sleep(200 * time.Millisecond)
			continue
		}
		break
	}

	if decodeErr != nil {
		// For SVG, return the original as base64
		if strings.HasSuffix(strings.ToLower(imagePath), ".svg") {
			return g.loadSVGAsThumbnail(imagePath)
		}

		// Final error logging
		file.Seek(0, 0)
		header := make([]byte, 16)
		n, _ := file.Read(header)
		fileInfo, _ := os.Stat(imagePath)
		fileSize := int64(0)
		if fileInfo != nil {
			fileSize = fileInfo.Size()
		}
		return "", fmt.Errorf("failed to decode image (%s): %w (header_read: %d bytes, data: %x, total_size: %d bytes)", format, decodeErr, n, header[:n], fileSize)
	}

	// Calculate new dimensions maintaining aspect ratio
	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	newWidth, newHeight := calculateThumbnailSize(origWidth, origHeight, thumbnailWidth, thumbnailHeight)

	// Create thumbnail using Catmull-Rom scaling for much better quality
	thumbnail := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
	draw.CatmullRom.Scale(thumbnail, thumbnail.Bounds(), img, img.Bounds(), draw.Over, nil)

	// Save to cache
	cachePath := g.GetCachePath(imagePath)
	os.MkdirAll(filepath.Dir(cachePath), 0755)
	cacheFile, err := os.Create(cachePath)
	if err != nil {
		return "", fmt.Errorf("failed to create cache file: %w", err)
	}
	defer cacheFile.Close()

	// Encode as JPEG with very high quality
	err = jpeg.Encode(cacheFile, thumbnail, &jpeg.Options{Quality: 90})
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
		cachePath := g.GetCachePath(imagePath)
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
	thumbnail := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
	draw.CatmullRom.Scale(thumbnail, thumbnail.Bounds(), img, img.Bounds(), draw.Over, nil)

	out, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer out.Close()

	return png.Encode(out, thumbnail)
}
