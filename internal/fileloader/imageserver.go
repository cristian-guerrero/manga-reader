// Package fileloader provides image loading and serving functionality
package fileloader

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	_ "golang.org/x/image/bmp"
	_ "golang.org/x/image/tiff"
	_ "golang.org/x/image/webp"

	"manga-visor/internal/thumbnails"
)

type ImageServer struct {
	fileLoader *FileLoader
	thumbGen   *thumbnails.Generator
	Addr       string // Standalone server address
}

// NewImageServer creates a new image server
func NewImageServer(fl *FileLoader, tg *thumbnails.Generator) *ImageServer {
	return &ImageServer{
		fileLoader: fl,
		thumbGen:   tg,
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
	fmt.Printf("[ImageServer] Standalone server started on %s\n", is.Addr)

	go http.Serve(listener, is)
	return nil
}

// ServeHTTP handles image requests
func (is *ImageServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

	fmt.Printf("[ImageServer] Incoming request: %s?%s\n", r.URL.Path, r.URL.RawQuery)

	var originalImagePath string

	if r.URL.Query().Has("did") {
		// New path format with hash
		dirHash := r.URL.Query().Get("did")
		fileName := r.URL.Query().Get("fid")
		dirPath, exists := is.fileLoader.GetDirectory(dirHash)

		if !exists {
			fmt.Printf("[ImageServer] Error: Directory hash not found in registry: %s\n", dirHash)
			http.Error(w, "Directory not found", http.StatusBadRequest)
			return
		}
		originalImagePath = is.fileLoader.ResolvePath(dirPath, fileName)
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
		fmt.Printf("[ImageServer] Error: Unsupported file type requested: %s\n", originalImagePath)
		http.Error(w, "Unsupported file type", http.StatusBadRequest)
		return
	}

	var finalPath string
	if isThumbnail {
		// Ensure thumbnail exists and get its cache path
		_, err := is.thumbGen.GetThumbnailBytes(originalImagePath)
		if err != nil {
			fmt.Printf("[ImageServer] Thumbnail generation failed for %s: %v\n", originalImagePath, err)
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
			fmt.Printf("[ImageServer] Error: File not found: %s\n", finalPath)
			http.Error(w, "Image not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	file, err := os.Open(finalPath)
	if err != nil {
		http.Error(w, "Failed to open image", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Set content type and other headers
	mimeType := is.fileLoader.GetMimeType(finalPath)
	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))
	w.Header().Set("Cache-Control", "private, max-age=31536000") // Cache for 1 year
	w.Header().Set("Accept-Ranges", "bytes")

	// Get filename for content-disposition
	filename := filepath.Base(finalPath)
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))

	// Stream the file directly to the response
	fmt.Printf("[ImageServer] Serving %s (%d bytes)...\n", filename, fileInfo.Size())
	_, err = io.Copy(w, file)
	if err != nil {
		fmt.Printf("[ImageServer] Copy error for %s: %v\n", filename, err)
	}
}
