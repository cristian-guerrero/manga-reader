// Package fileloader provides image loading and serving functionality
package fileloader

import (

	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"unicode"
)

// Supported image extensions
var SupportedExtensions = map[string]string{
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif":  "image/gif",
	".bmp":  "image/bmp",
	".tiff": "image/tiff",
	".tif":  "image/tiff",
	".svg":  "image/svg+xml",
}

// ImageInfo represents information about an image file
type ImageInfo struct {
	Path      string `json:"path"`
	Name      string `json:"name"`
	Extension string `json:"extension"`
	Size      int64  `json:"size"`
	Index     int    `json:"index"`
}

// FileLoader handles image file operations
type FileLoader struct{}

// NewFileLoader creates a new file loader
func NewFileLoader() *FileLoader {
	return &FileLoader{}
}

// IsSupportedImage checks if a file extension is a supported image format
func (fl *FileLoader) IsSupportedImage(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	_, supported := SupportedExtensions[ext]
	return supported
}

// GetMimeType returns the MIME type for an image extension
func (fl *FileLoader) GetMimeType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	if mime, exists := SupportedExtensions[ext]; exists {
		return mime
	}
	return "application/octet-stream"
}

// GetImages returns a list of images in the specified folder
func (fl *FileLoader) GetImages(folderPath string) ([]ImageInfo, error) {
	var images []ImageInfo

	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	// Filter and collect image files
	var imageFiles []os.DirEntry
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if fl.IsSupportedImage(entry.Name()) {
			imageFiles = append(imageFiles, entry)
		}
	}

	// Sort by natural order
	sort.Slice(imageFiles, func(i, j int) bool {
		return naturalLess(imageFiles[i].Name(), imageFiles[j].Name())
	})

	// Build result
	for i, entry := range imageFiles {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		ext := strings.ToLower(filepath.Ext(entry.Name()))
		images = append(images, ImageInfo{
			Path:      filepath.Join(folderPath, entry.Name()),
			Name:      entry.Name(),
			Extension: strings.TrimPrefix(ext, "."),
			Size:      info.Size(),
			Index:     i,
		})
	}

	return images, nil
}



// LoadImageBytes loads an image and returns the raw bytes
func (fl *FileLoader) LoadImageBytes(imagePath string) ([]byte, string, error) {
	// Check if file exists
	if _, err := os.Stat(imagePath); os.IsNotExist(err) {
		return nil, "", fmt.Errorf("image not found: %s", imagePath)
	}

	// Read file
	data, err := os.ReadFile(imagePath)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read image: %w", err)
	}

	mimeType := fl.GetMimeType(imagePath)
	return data, mimeType, nil
}

// GetImageReader returns an io.ReadCloser for streaming large images
func (fl *FileLoader) GetImageReader(imagePath string) (io.ReadCloser, string, int64, error) {
	// Check if file exists
	info, err := os.Stat(imagePath)
	if os.IsNotExist(err) {
		return nil, "", 0, fmt.Errorf("image not found: %s", imagePath)
	}

	file, err := os.Open(imagePath)
	if err != nil {
		return nil, "", 0, fmt.Errorf("failed to open image: %w", err)
	}

	mimeType := fl.GetMimeType(imagePath)
	return file, mimeType, info.Size(), nil
}

// naturalLess compares strings in natural order (1, 2, 10 instead of 1, 10, 2)
func naturalLess(a, b string) bool {
	return compareNatural(a, b) < 0
}

// compareNatural performs natural string comparison
func compareNatural(a, b string) int {
	ai, bi := 0, 0
	for ai < len(a) && bi < len(b) {
		ca, cb := rune(a[ai]), rune(b[bi])

		// Both are digits - compare numerically
		if unicode.IsDigit(ca) && unicode.IsDigit(cb) {
			// Extract numbers
			numA, endA := extractNumber(a, ai)
			numB, endB := extractNumber(b, bi)

			if numA != numB {
				if numA < numB {
					return -1
				}
				return 1
			}

			ai = endA
			bi = endB
			continue
		}

		// Compare characters (case-insensitive)
		la, lb := unicode.ToLower(ca), unicode.ToLower(cb)
		if la != lb {
			if la < lb {
				return -1
			}
			return 1
		}

		ai++
		bi++
	}

	// If we've exhausted one string, the shorter one comes first
	if ai < len(a) {
		return 1
	}
	if bi < len(b) {
		return -1
	}
	return 0
}

// extractNumber extracts a number starting at position i and returns the value and end position
func extractNumber(s string, i int) (int, int) {
	j := i
	for j < len(s) && unicode.IsDigit(rune(s[j])) {
		j++
	}
	num, _ := strconv.Atoi(s[i:j])
	return num, j
}
