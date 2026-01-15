// Package fileloader provides image loading and serving functionality
package fileloader

import (
	"bytes"
	"crypto/md5"
	"fmt"
	"image"
	"image/jpeg"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	_ "image/gif"
	_ "image/png"

	_ "github.com/gen2brain/avif" // AVIF decoding support
	_ "golang.org/x/image/bmp"
	_ "golang.org/x/image/tiff"
	_ "golang.org/x/image/webp"

	"manga-visor/internal/thumbnails"
)

const (
	convertedCacheDir = "cache/converted"
)

// LoggerInterface defines a simple logging interface to avoid import cycles
type LoggerInterface interface {
	Debugf(format string, args ...interface{})
	Infof(format string, args ...interface{})
	Warnf(format string, args ...interface{})
	Errorf(format string, args ...interface{})
}

type ImageServer struct {
	fileLoader *FileLoader
	thumbGen   *thumbnails.Generator
	logger     LoggerInterface // Optional logger, can be nil
	Address    string          // Standalone server address
	cacheDir   string          // Cache directory for converted images
	pendingCon sync.Map        // map[string]chan struct{} for deduplicating conversions
	semaphore  chan struct{}   // Global limit for concurrent conversions
}

// NewImageServer creates a new image server
func NewImageServer(fl *FileLoader, tg *thumbnails.Generator, logger LoggerInterface) *ImageServer {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}

	fullCacheDir := filepath.Join(homeDir, ".manga-visor", convertedCacheDir)

	// Create cache directory
	os.MkdirAll(fullCacheDir, 0755)

	return &ImageServer{
		fileLoader: fl,
		thumbGen:   tg,
		logger:     logger,
		cacheDir:   fullCacheDir,
		semaphore:  make(chan struct{}, 2), // Limit to 2 concurrent AVIF decodes
	}
}

// logDebug logs a debug message if logger is available
func (is *ImageServer) logDebug(format string, args ...interface{}) {
	if is.logger != nil {
		is.logger.Debugf(format, args...)
	}
}

// logInfo logs an info message if logger is available
func (is *ImageServer) logInfo(format string, args ...interface{}) {
	if is.logger != nil {
		is.logger.Infof(format, args...)
	}
}

// logWarn logs a warning message if logger is available
func (is *ImageServer) logWarn(format string, args ...interface{}) {
	if is.logger != nil {
		is.logger.Warnf(format, args...)
	}
}

// logError logs an error message if logger is available
func (is *ImageServer) logError(format string, args ...interface{}) {
	if is.logger != nil {
		is.logger.Errorf(format, args...)
	}
}

// Start runs the server on an available port for standalone dev usage
func (is *ImageServer) Start() error {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return err
	}

	port := listener.Addr().(*net.TCPAddr).Port
	is.Address = fmt.Sprintf("http://127.0.0.1:%d", port)
	is.logInfo("[ImageServer] Standalone server started on %s", is.Address)

	go http.Serve(listener, is)
	return nil
}

// Addr returns the server address
func (is *ImageServer) Addr() string {
	return is.Address
}

// ServeHTTP handles image requests
func (is *ImageServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	is.logInfo("[ImageServer] Handler invoked: %s %s?%s", r.Method, r.URL.Path, r.URL.RawQuery)

	// Add CORS headers for standalone operation
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Only handle GET requests
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check if this is an image or thumbnail request
	isThumbnail := strings.HasPrefix(r.URL.Path, "/thumbnails")
	isImage := strings.HasPrefix(r.URL.Path, "/images")

	if !isThumbnail && !isImage {
		http.NotFound(w, r)
		return
	}

	is.logInfo("[ImageServer] Processing request: isThumbnail=%v, isImage=%v", isThumbnail, isImage)

	var originalImagePath string

	if r.URL.Query().Has("did") {
		// New path format with hash
		dirHash := r.URL.Query().Get("did")
		fileName := r.URL.Query().Get("fid")
		dirPath, exists := is.fileLoader.GetDirectory(dirHash)

		if !exists {
			is.logError("[ImageServer] Error: Directory hash not found in registry: %s", dirHash)
			http.Error(w, "Directory not found", http.StatusBadRequest)
			return
		}
		originalImagePath = is.fileLoader.ResolvePath(dirPath, fileName)
		is.logInfo("[ImageServer] Resolved path: %s", originalImagePath)
	} else {
		// Old direct path format (fallback)
		imagePath := r.URL.Query().Get("path")
		if imagePath == "" {
			http.Error(w, "Missing required parameters", http.StatusBadRequest)
			return
		}

		decodedPath, err := url.QueryUnescape(imagePath)
		if err != nil {
			decodedPath = imagePath
		}
		originalImagePath = decodedPath
	}

	// Security: validate it's a supported image type
	if !is.fileLoader.IsSupportedImage(originalImagePath) {
		is.logWarn("[ImageServer] Error: Unsupported file type requested: %s", originalImagePath)
		http.Error(w, "Unsupported file type", http.StatusBadRequest)
		return
	}

	var finalPath string
	if isThumbnail {
		// Ensure thumbnail exists and get its cache path
		_, err := is.thumbGen.GetThumbnailBytes(originalImagePath)
		if err != nil {
			is.logError("[ImageServer] Thumbnail generation failed for %s: %v", originalImagePath, err)
			http.Error(w, "Failed to generate thumbnail", http.StatusInternalServerError)
			return
		}
		finalPath = is.thumbGen.GetCachePath(originalImagePath)
	} else {
		finalPath = originalImagePath
	}

	// Check if file exists
	fileInfo, err := os.Stat(finalPath)
	if err != nil {
		if os.IsNotExist(err) {
			is.logWarn("[ImageServer] Error: File not found: %s", finalPath)
			http.Error(w, "Image not found", http.StatusNotFound)
			return
		}
		is.logError("[ImageServer] Error accessing file %s: %v", finalPath, err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	file, err := os.Open(finalPath)
	if err != nil {
		http.Error(w, "Failed to open image", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Check if we need to convert AVIF to JPEG for Linux (WebKitGTK doesn't support AVIF)
	ext := strings.ToLower(filepath.Ext(finalPath))
	if ext == ".avif" && runtime.GOOS == "linux" {
		// Generate cache key for the converted image
		hash := md5.Sum([]byte(finalPath))
		cacheFileName := fmt.Sprintf("%x.jpg", hash)
		cachePath := filepath.Join(is.cacheDir, cacheFileName)

		// Check if it's already in cache
		if _, err := os.Stat(cachePath); err == nil {
			is.logInfo("[ImageServer] Serving converted AVIF from cache: %s", cachePath)
			http.ServeFile(w, r, cachePath)
			return
		}

		// Deduplicate conversion work
		waitCh := make(chan struct{})
		actual, loaded := is.pendingCon.LoadOrStore(finalPath, waitCh)
		if loaded {
			// Another goroutine is already converting this image
			<-actual.(chan struct{})

			// Try to serve from cache now that it should be ready
			if _, err := os.Stat(cachePath); err == nil {
				is.logInfo("[ImageServer] Serving converted AVIF from cache (after waiting): %s", cachePath)
				http.ServeFile(w, r, cachePath)
				return
			}
			// If somehow it's still not there, fall back to converting below (shouldn't happen)
		} else {
			// We are responsible for converting it
			defer func() {
				close(waitCh)
				is.pendingCon.Delete(finalPath)
			}()

			is.logInfo("[ImageServer] Converting AVIF to JPEG for WebKitGTK compatibility: %s", finalPath)

			// Acquire semaphore to limit concurrency
			is.semaphore <- struct{}{}
			defer func() { <-is.semaphore }()

			// Decode AVIF
			img, _, err := image.Decode(file)
			if err != nil {
				is.logError("[ImageServer] Failed to decode AVIF: %v", err)
				http.Error(w, "Failed to decode AVIF image", http.StatusInternalServerError)
				return
			}

			// Encode as JPEG to a buffer first to ensure we can save it to cache
			var buf bytes.Buffer
			if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 95}); err != nil {
				is.logError("[ImageServer] Failed to encode JPEG: %v", err)
				http.Error(w, "Failed to convert image", http.StatusInternalServerError)
				return
			}

			// Save to cache for future requests
			if err := os.WriteFile(cachePath, buf.Bytes(), 0644); err != nil {
				is.logWarn("[ImageServer] Failed to save converted image to cache: %v", err)
			}

			// Serve the converted image
			w.Header().Set("Content-Type", "image/jpeg")
			w.Header().Set("Content-Length", fmt.Sprintf("%d", buf.Len()))
			w.Header().Set("Cache-Control", "private, max-age=31536000")

			filename := filepath.Base(finalPath)
			filenameJpeg := strings.TrimSuffix(filename, ext) + ".jpg"
			w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filenameJpeg))

			is.logInfo("[ImageServer] Serving freshly converted AVIF->JPEG %s (%d bytes)", filename, buf.Len())
			w.Write(buf.Bytes())
			return
		}
	}

	// Regular file serving for non-AVIF or non-Linux
	mimeType := is.fileLoader.GetMimeType(finalPath)
	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))
	w.Header().Set("Cache-Control", "private, max-age=31536000") // Cache for 1 year
	w.Header().Set("Accept-Ranges", "bytes")

	// Get filename for content-disposition
	filename := filepath.Base(finalPath)
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))

	// Stream the file directly to the response
	is.logInfo("[ImageServer] Serving %s (%d bytes, mime: %s)", filename, fileInfo.Size(), mimeType)
	bytesWritten, err := io.Copy(w, file)
	if err != nil {
		is.logError("[ImageServer] Copy error for %s: %v", filename, err)
	} else {
		is.logInfo("[ImageServer] Successfully served %s (%d bytes written)", filename, bytesWritten)
	}
}

// PreloadConverted starts background conversion for a list of image paths
func (is *ImageServer) PreloadConverted(imagePaths []string) {
	if runtime.GOOS != "linux" {
		return
	}

	go func() {
		for _, path := range imagePaths {
			if strings.ToLower(filepath.Ext(path)) != ".avif" {
				continue
			}

			// Generate cache key
			hash := md5.Sum([]byte(path))
			cacheFileName := fmt.Sprintf("%x.jpg", hash)
			cachePath := filepath.Join(is.cacheDir, cacheFileName)

			// Check if already cached
			if _, err := os.Stat(cachePath); err == nil {
				continue
			}

			// Check if already being converted
			if _, loaded := is.pendingCon.Load(path); loaded {
				continue
			}

			// Perform conversion sequentially in this background goroutine
			func() {
				// Deduplicate
				waitCh := make(chan struct{})
				actual, loaded := is.pendingCon.LoadOrStore(path, waitCh)
				if loaded {
					// Wait for the other conversion to finish
					<-actual.(chan struct{})
					return
				}
				defer func() {
					close(waitCh)
					is.pendingCon.Delete(path)
				}()

				// Open file
				file, err := os.Open(path)
				if err != nil {
					return
				}
				defer file.Close()

				// Acquire semaphore (Wait if both slots are taken)
				is.semaphore <- struct{}{}
				defer func() { <-is.semaphore }()

				// Decode
				img, _, err := image.Decode(file)
				if err != nil {
					return
				}

				// Encode
				var buf bytes.Buffer
				if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 95}); err != nil {
					return
				}

				// Save
				if err := os.WriteFile(cachePath, buf.Bytes(), 0644); err != nil {
					is.logWarn("[ImageServer] Failed to save pre-converted image: %v", err)
				}
				is.logInfo("[ImageServer] Pre-converted AVIF to cache: %s", path)
			}()
		}
	}()
}
