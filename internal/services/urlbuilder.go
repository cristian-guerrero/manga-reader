package services

import (
	"fmt"
	"net/url"
	"path/filepath"
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
func (ub *URLBuilder) BuildImageURL(dirHash, filename string) string {
	if ub.baseURL == "" {
		return ""
	}
	// Ensure filename uses forward slashes for URLs
	filename = filepath.ToSlash(filename)
	return fmt.Sprintf("%s/images?did=%s&fid=%s", ub.baseURL, dirHash, url.QueryEscape(filename))
}

// BuildThumbnailURL constructs a thumbnail URL using directory hash and filename
func (ub *URLBuilder) BuildThumbnailURL(dirHash, filename string) string {
	if ub.baseURL == "" {
		return ""
	}
	// Ensure filename uses forward slashes for URLs
	filename = filepath.ToSlash(filename)
	return fmt.Sprintf("%s/thumbnails?did=%s&fid=%s", ub.baseURL, dirHash, url.QueryEscape(filename))
}

// BuildThumbnailURLFromPath constructs a thumbnail URL from a full path
// It extracts the filename from the path
func (ub *URLBuilder) BuildThumbnailURLFromPath(dirHash, fullPath string) string {
	filename := filepath.Base(fullPath)
	return ub.BuildThumbnailURL(dirHash, filename)
}

// BuildImageURLFromPath constructs an image URL from a full path
// It extracts the relative path from the directory
func (ub *URLBuilder) BuildImageURLFromPath(dirHash, dirPath, fullPath string) string {
	relPath, _ := filepath.Rel(dirPath, fullPath)
	return ub.BuildImageURL(dirHash, relPath)
}
