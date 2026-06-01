package services

import (
	"fmt"
	"net/url"
	"path/filepath"
	"strings"
)

// URLBuilder handles construction of image and thumbnail URLs
type URLBuilder struct {
	baseURL string
}

// NewURLBuilder creates a new URL builder
func NewURLBuilder(baseURL string) *URLBuilder {
	return &URLBuilder{
		baseURL: baseURL,
	}
}

// SetBaseURL updates the base URL
func (ub *URLBuilder) SetBaseURL(baseURL string) {
	ub.baseURL = baseURL
}

// BuildImageURL constructs an image URL using directory hash and filename
// Uses relative URLs so they go through Wails AssetHandler (works on all platforms)
func (ub *URLBuilder) BuildImageURL(dirHash, filename string) string {
	// Ensure filename uses forward slashes for URLs
	filename = filepath.ToSlash(filename)
	// Use relative URL - Wails AssetHandler will handle it via ImageServer
	return fmt.Sprintf("/images?did=%s&fid=%s", dirHash, url.QueryEscape(filename))
}

// BuildThumbnailURL constructs a thumbnail URL using directory hash and filename
// Uses relative URLs so they go through Wails AssetHandler (works on all platforms)
func (ub *URLBuilder) BuildThumbnailURL(dirHash, filename string) string {
	// Ensure filename uses forward slashes for URLs
	filename = filepath.ToSlash(filename)
	// Use relative URL - Wails AssetHandler will handle it via ImageServer
	return fmt.Sprintf("/thumbnails?did=%s&fid=%s", dirHash, url.QueryEscape(filename))
}

// BuildThumbnailURLFromPath constructs a thumbnail URL from a full path
// It extracts the filename from the path
func (ub *URLBuilder) BuildThumbnailURLFromPath(dirHash, fullPath string) string {
	fullPath = strings.ReplaceAll(fullPath, "\\", "/")
	filename := filepath.Base(fullPath)
	return ub.BuildThumbnailURL(dirHash, filename)
}

// BuildImageURLFromPath constructs an image URL from a full path
// It extracts the relative path from the directory
func (ub *URLBuilder) BuildImageURLFromPath(dirHash, dirPath, fullPath string) string {
	relPath, _ := filepath.Rel(dirPath, fullPath)
	return ub.BuildImageURL(dirHash, relPath)
}
