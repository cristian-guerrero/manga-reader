// Package fileloader provides image loading and serving functionality
package fileloader

import (
	"bytes"
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

	_ "image/gif"
	_ "image/png"

	_ "github.com/gen2brain/avif" // AVIF decoding support
	_ "golang.org/x/image/bmp"
	_ "golang.org/x/image/tiff"
	_ "golang.org/x/image/webp"

	"manga-visor/internal/thumbnails"
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
	Addr       string          // Standalone server address
}

// NewImageServer creates a new image server
func NewImageServer(fl *FileLoader, tg *thumbnails.Generator, logger LoggerInterface) *ImageServer {
	return &ImageServer{
		fileLoader: fl,
		thumbGen:   tg,
		logger:     logger,
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
	is.Addr = fmt.Sprintf("http://127.0.0.1:%d", port)
	is.logInfo("[ImageServer] Standalone server started on %s", is.Addr)

	go http.Serve(listener, is)
	return nil
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
		is.logInfo("[ImageServer] Converting AVIF to JPEG for WebKitGTK compatibility: %s", finalPath)

		// Decode AVIF
		img, _, err := image.Decode(file)
		if err != nil {
			is.logError("[ImageServer] Failed to decode AVIF: %v", err)
			http.Error(w, "Failed to decode AVIF image", http.StatusInternalServerError)
			return
		}

		// Encode as JPEG
		var buf bytes.Buffer
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 95}); err != nil {
			is.logError("[ImageServer] Failed to encode JPEG: %v", err)
			http.Error(w, "Failed to convert image", http.StatusInternalServerError)
			return
		}

		// Set headers for converted image
		w.Header().Set("Content-Type", "image/jpeg")
		w.Header().Set("Content-Length", fmt.Sprintf("%d", buf.Len()))
		w.Header().Set("Cache-Control", "private, max-age=31536000")

		filename := filepath.Base(finalPath)
		filenameJpeg := strings.TrimSuffix(filename, ext) + ".jpg"
		w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filenameJpeg))

		is.logInfo("[ImageServer] Serving converted AVIF->JPEG %s (%d bytes)", filename, buf.Len())
		bytesWritten, err := w.Write(buf.Bytes())
		if err != nil {
			is.logError("[ImageServer] Write error for %s: %v", filename, err)
		} else {
			is.logInfo("[ImageServer] Successfully served converted %s (%d bytes written)", filename, bytesWritten)
		}
		return
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
