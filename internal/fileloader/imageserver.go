// Package fileloader provides image loading and serving functionality
package fileloader

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

// ImageServer implements http.Handler to serve local images efficiently
type ImageServer struct {
	fileLoader *FileLoader
}

// NewImageServer creates a new image server
func NewImageServer(fl *FileLoader) *ImageServer {
	return &ImageServer{fileLoader: fl}
}

// ServeHTTP handles image requests
// Expects URLs in format: /images?path=/full/path/to/image.jpg
func (is *ImageServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Only handle GET requests to /images
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check if this is an image request
	if !strings.HasPrefix(r.URL.Path, "/images") {
		// Not an image request, let the embedded assets handle it
		http.NotFound(w, r)
		return
	}

	// Get the image path from query parameter
	imagePath := r.URL.Query().Get("path")
	if imagePath == "" {
		http.Error(w, "Missing path parameter", http.StatusBadRequest)
		return
	}

	// URL decode the path
	decodedPath, err := url.QueryUnescape(imagePath)
	if err != nil {
		http.Error(w, "Invalid path encoding", http.StatusBadRequest)
		return
	}

	// Security: validate it's a supported image
	if !is.fileLoader.IsSupportedImage(decodedPath) {
		http.Error(w, "Unsupported file type", http.StatusBadRequest)
		return
	}

	// Check if file exists
	fileInfo, err := os.Stat(decodedPath)
	if os.IsNotExist(err) {
		http.Error(w, "Image not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error accessing file", http.StatusInternalServerError)
		return
	}

	// Open the file
	file, err := os.Open(decodedPath)
	if err != nil {
		http.Error(w, "Error opening file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Set headers for efficient caching and streaming
	mimeType := is.fileLoader.GetMimeType(decodedPath)
	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))
	w.Header().Set("Cache-Control", "private, max-age=31536000") // Cache for 1 year
	w.Header().Set("Accept-Ranges", "bytes")

	// Get file extension for filename
	filename := filepath.Base(decodedPath)
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))

	// Stream the file directly to the response
	io.Copy(w, file)
}
