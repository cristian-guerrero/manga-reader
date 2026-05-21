// Package thumbnails provides thumbnail generation and caching
package thumbnails

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/gif" // GIF support
	"image/jpeg"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/disintegration/imaging"

	_ "github.com/gen2brain/avif" // AVIF support
	_ "golang.org/x/image/bmp"    // BMP support
	_ "golang.org/x/image/tiff"   // TIFF support
	_ "golang.org/x/image/webp"   // WebP support
)

const (
	thumbnailWidth          = 400
	thumbnailHeight         = 600
	thumbnailCacheFile      = "cache/thumbnails.db"
	tallImageThresholdRatio = 3.0   // If height/width > 3, treat as tall image (manhwa)
	tallImageCropHeight     = 2000  // Height in pixels to crop from top of tall images
	thumbnailCacheVersion   = "v3"  // Cache version for invalidation when logic changes
)

// ImageOpener is a function that opens an image by path and returns a ReadCloser
type ImageOpener func(imagePath string) (io.ReadCloser, error)

// Generator handles thumbnail generation and caching
type Generator struct {
	boltStore   *BoltStore
	legacyDir   string // legacy file cache dir for migration
	mu          sync.RWMutex
	pending     sync.Map      // map[string]chan struct{} for deduplicating generation
	semaphore   chan struct{} // Global limit for concurrent generation
	paused      atomic.Bool   // Whether generation is currently paused
	imageOpener ImageOpener   // Optional opener for archive/virtual paths; defaults to os.Open
}

// NewGenerator creates a new thumbnail generator
func NewGenerator() *Generator {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}

	dbPath := filepath.Join(homeDir, ".manga-visor", thumbnailCacheFile)
	legacyDir := filepath.Join(homeDir, ".manga-visor", "cache", "thumbnails")

	boltStore, err := NewBoltStore(dbPath)
	if err != nil {
		fmt.Printf("[Generator] Failed to open thumbnail database: %v\n", err)
		// Fall back to a temp DB so the app doesn't crash
		tmpPath := filepath.Join(os.TempDir(), "manga-visor-thumbnails.db")
		boltStore, err = NewBoltStore(tmpPath)
		if err != nil {
			panic(fmt.Sprintf("failed to create thumbnail store: %v", err))
		}
	}

	g := &Generator{
		boltStore: boltStore,
		legacyDir: legacyDir,
		semaphore: make(chan struct{}, 4), // Limit to 4 concurrent generations
	}

	// Remove legacy file cache directory on startup
	go cleanupLegacyDir(legacyDir)

	return g
}

// cleanupLegacyDir removes the old flat-file thumbnail cache directory.
func cleanupLegacyDir(dir string) {
	if err := os.RemoveAll(dir); err != nil {
		fmt.Printf("[Generator] Failed to remove legacy thumbnail cache dir %s: %v\n", dir, err)
	} else {
		fmt.Println("[Generator] Legacy thumbnail cache directory removed")
	}
}

// SetImageOpener sets a custom function for opening image files
// Used to support reading from archives or virtual paths
func (g *Generator) SetImageOpener(opener ImageOpener) {
	g.imageOpener = opener
}

// openImage opens an image using the configured opener, falling back to os.Open
func (g *Generator) openImage(imagePath string) (io.ReadCloser, error) {
	if g.imageOpener != nil {
		return g.imageOpener(imagePath)
	}
	return os.Open(imagePath)
}

// storeKey returns the key used in the bbolt store for a given image path.
// Includes the cache version so that logic changes invalidate old thumbnails.
func (g *Generator) storeKey(imagePath string) string {
	return thumbnailCacheVersion + "|" + imagePath
}

// IsCached checks if a thumbnail is already cached
func (g *Generator) IsCached(imagePath string) bool {
	g.mu.RLock()
	defer g.mu.RUnlock()

	return g.boltStore.Exists(g.storeKey(imagePath))
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
	key := g.storeKey(imagePath)

	// Single lookup: try to get from cache
	data, err := g.boltStore.Get(key)
	if err != nil {
		return nil, err
	}
	if data != nil {
		return data, nil
	}

	// Not cached — generate it
	_, err = g.GetThumbnail(imagePath)
	if err != nil {
		return nil, err
	}

	// Now it's in cache, fetch it
	return g.boltStore.Get(key)
}

// loadCachedThumbnail loads a thumbnail from cache
func (g *Generator) loadCachedThumbnail(imagePath string) (string, error) {
	data, err := g.boltStore.Get(g.storeKey(imagePath))
	if err != nil {
		return "", fmt.Errorf("failed to load cached thumbnail: %w", err)
	}
	if data == nil {
		return "", fmt.Errorf("thumbnail not found in cache")
	}

	base64Data := base64.StdEncoding.EncodeToString(data)
	return fmt.Sprintf("data:image/jpeg;base64,%s", base64Data), nil
}

// SetPaused toggles the pause state of the generator
func (g *Generator) SetPaused(paused bool) {
	g.paused.Store(paused)
	if paused {
		fmt.Println("[Generator] Thumbnail generation paused")
	} else {
		fmt.Println("[Generator] Thumbnail generation resumed")
	}
}

// generateThumbnail generates a thumbnail for an image
func (g *Generator) generateThumbnail(imagePath string) (string, error) {
	// Check if paused - return error immediately to avoid blocking connections
	if g.paused.Load() {
		return "", fmt.Errorf("generation paused")
	}

	// Acquire semaphore to limit concurrency
	g.semaphore <- struct{}{}
	defer func() { <-g.semaphore }()

	// Decode image - with internal retry for extracted files that might be "busy" or 0-filled temporarily
	var img image.Image
	var format string
	var decodeErr error
	var headerData []byte
	var fileSize int64

	for attempts := 0; attempts < 3; attempts++ {
		file, err := g.openImage(imagePath)
		if err != nil {
			return "", fmt.Errorf("failed to open image: %w", err)
		}

		img, format, decodeErr = image.Decode(file)
		file.Close()

		if decodeErr == nil {
			break
		}

		// If it's truly an unsupported format, don't bother retrying
		if decodeErr == image.ErrFormat {
			break
		}

		// Check if it's the "zeros" issue
		zeroFile, zeroErr := g.openImage(imagePath)
		if zeroErr == nil {
			header := make([]byte, 16)
			n, _ := zeroFile.Read(header)
			zeroFile.Close()
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
		}
		break
	}

	if decodeErr != nil {
		// For SVG, return the original as base64
		if strings.HasSuffix(strings.ToLower(imagePath), ".svg") {
			return g.loadSVGAsThumbnail(imagePath)
		}

		// Final error logging - read header from a fresh open
		headerData = nil
		fileSize = 0
		errFile, err := g.openImage(imagePath)
		if err == nil {
			header := make([]byte, 16)
			n, _ := errFile.Read(header)
			headerData = header[:n]
			errFile.Close()
		}
		// Try to get file size via os.Stat (works for regular files, may fail for archive paths)
		if fi, statErr := os.Stat(imagePath); statErr == nil {
			fileSize = fi.Size()
		}

		return "", fmt.Errorf("failed to decode image (%s): %w (header_read: %d bytes, data: %x, total_size: %d bytes)", format, decodeErr, len(headerData), headerData, fileSize)
	}

	// Calculate new dimensions maintaining aspect ratio
	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	// Check if image is too tall (manhwa style)
	aspectRatio := float64(origHeight) / float64(origWidth)
	var sourceImg image.Image = img

	if aspectRatio > tallImageThresholdRatio {
		// Crop top portion for very tall images
		cropHeight := tallImageCropHeight
		if cropHeight > origHeight {
			cropHeight = origHeight
		}
		croppedBounds := image.Rect(0, 0, origWidth, cropHeight)
		if subImager, ok := img.(interface{ SubImage(image.Rectangle) image.Image }); ok {
			sourceImg = subImager.SubImage(croppedBounds)
		}
	}

	// Use sourceImg for thumbnail generation
	newWidth, newHeight := calculateThumbnailSize(sourceImg.Bounds().Dx(), sourceImg.Bounds().Dy(), thumbnailWidth, thumbnailHeight)

	// Create thumbnail using Catmull-Rom scaling for much better quality
	thumbnail := imaging.Resize(sourceImg, newWidth, newHeight, imaging.CatmullRom)

	// Encode to JPEG buffer
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, thumbnail, &jpeg.Options{Quality: 90}); err != nil {
		return "", fmt.Errorf("failed to encode thumbnail: %w", err)
	}

	// Store in bbolt
	key := g.storeKey(imagePath)
	if err := g.boltStore.Put(key, buf.Bytes()); err != nil {
		return "", fmt.Errorf("failed to store thumbnail: %w", err)
	}

	// Return as base64
	base64Data := base64.StdEncoding.EncodeToString(buf.Bytes())
	return fmt.Sprintf("data:image/jpeg;base64,%s", base64Data), nil
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

	return g.boltStore.Clear()
}

// ClearCacheForFolder clears thumbnails for images in a specific folder
func (g *Generator) ClearCacheForFolder(folderPath string) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	// bbolt uses versioned keys, so we need to scan with the version prefix
	// We iterate all keys in the store and delete those matching the folder
	return g.boltStore.DeleteByFolder(folderPath)
}

// PreloadThumbnails generates thumbnails for all images in a folder
func (g *Generator) PreloadThumbnails(imagePaths []string) {
	var wg sync.WaitGroup

	// Limit concurrent thumbnail generation
	semaphore := make(chan struct{}, 4)

	for _, path := range imagePaths {
		// Stop preloading if generator is paused
		if g.paused.Load() {
			break
		}

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
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	// Check if image is too tall (manhwa style)
	aspectRatio := float64(origHeight) / float64(origWidth)
	var sourceImg image.Image = img

	if aspectRatio > tallImageThresholdRatio {
		// Crop top portion for very tall images
		cropHeight := tallImageCropHeight
		if cropHeight > origHeight {
			cropHeight = origHeight
		}
		croppedBounds := image.Rect(0, 0, origWidth, cropHeight)
		if subImager, ok := img.(interface{ SubImage(image.Rectangle) image.Image }); ok {
			sourceImg = subImager.SubImage(croppedBounds)
		}
	}

	newWidth, newHeight := calculateThumbnailSize(sourceImg.Bounds().Dx(), sourceImg.Bounds().Dy(), thumbnailWidth, thumbnailHeight)
	thumbnail := imaging.Resize(sourceImg, newWidth, newHeight, imaging.CatmullRom)

	out, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer out.Close()

	return png.Encode(out, thumbnail)
}
