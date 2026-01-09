// Package fileloader provides image loading and serving functionality
package fileloader

import (
	"crypto/md5"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
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
	".avif": "image/avif",
}

// ImageInfo represents information about an image file
type ImageInfo struct {
	Path      string `json:"path"`
	Name      string `json:"name"`
	Extension string `json:"extension"`
	Size      int64  `json:"size"`
	Index     int    `json:"index"`
	ModTime   int64  `json:"modTime"`
}

// FileLoader handles image file operations
type FileLoader struct {
	dirPool map[string]string // Hash -> DirPath
	mu      sync.RWMutex
}

// NewFileLoader creates a new file loader
func NewFileLoader() *FileLoader {
	return &FileLoader{
		dirPool: make(map[string]string),
	}
}

// RegisterDirectory registers a directory and returns a short hash for it
func (fl *FileLoader) RegisterDirectory(dirPath string) string {
	fl.mu.Lock()
	defer fl.mu.Unlock()

	// Use a consistent hash for the same path
	hash := fmt.Sprintf("%x", md5.Sum([]byte(dirPath)))
	fl.dirPool[hash] = dirPath
	return hash
}

// GetDirectory returns the registered directory for a given hash
func (fl *FileLoader) GetDirectory(hash string) (string, bool) {
	fl.mu.RLock()
	defer fl.mu.RUnlock()

	path, exists := fl.dirPool[hash]
	return path, exists
}

// ResolvePath joins a directory path and a filename
func (fl *FileLoader) ResolvePath(dirPath, fileName string) string {
	return filepath.Join(dirPath, fileName)
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

// GetImages returns a list of images in the specified folder (recursive)
func (fl *FileLoader) GetImages(folderPath string) ([]ImageInfo, error) {
	var images []ImageInfo
	var imageFiles []struct {
		path string
		name string
		info os.FileInfo
	}

	err := filepath.WalkDir(folderPath, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if fl.IsSupportedImage(d.Name()) {
			info, err := d.Info()
			if err != nil {
				return nil
			}
			imageFiles = append(imageFiles, struct {
				path string
				name string
				info os.FileInfo
			}{path: path, name: d.Name(), info: info})
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to walk directory: %w", err)
	}

	fmt.Printf("[FileLoader] GetImages: Found %d total image files in %s\n", len(imageFiles), folderPath)

	// Sort by natural order of full paths to keep sequence across folders
	sort.Slice(imageFiles, func(i, j int) bool {
		return naturalLess(imageFiles[i].path, imageFiles[j].path)
	})

	// Build result
	for i, file := range imageFiles {
		ext := strings.ToLower(filepath.Ext(file.name))
		images = append(images, ImageInfo{
			Path:      file.path,
			Name:      file.name,
			Extension: strings.TrimPrefix(ext, "."),
			Size:      file.info.Size(),
			Index:     i,
			ModTime:   file.info.ModTime().UnixMilli(),
		})
	}

	return images, nil
}

// FindFirstImage recursively searches for the first image in a directory and stops immediately
func (fl *FileLoader) FindFirstImage(folderPath string) (string, bool) {
	var foundPath string
	var found bool

	// Optimization: check immediate directory first
	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return "", false
	}

	// First pass: look for images in the current folder
	for _, entry := range entries {
		if !entry.IsDir() && fl.IsSupportedImage(entry.Name()) {
			return filepath.Join(folderPath, entry.Name()), true
		}
	}

	// Second pass: look into subdirectories recursively
	for _, entry := range entries {
		if entry.IsDir() {
			path, exists := fl.FindFirstImage(filepath.Join(folderPath, entry.Name()))
			if exists {
				return path, true
			}
		}
	}

	return foundPath, found
}

// GetShallowImageCount returns the count of images in the immediate directory (not recursive)
func (fl *FileLoader) GetShallowImageCount(folderPath string) int {
	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return 0
	}

	count := 0
	for _, entry := range entries {
		if !entry.IsDir() && fl.IsSupportedImage(entry.Name()) {
			count++
		}
	}
	return count
}

// GetImagesShallow returns a list of images in the specified folder (non-recursive, only immediate directory)
func (fl *FileLoader) GetImagesShallow(folderPath string) ([]ImageInfo, error) {
	var images []ImageInfo
	var imageFiles []struct {
		path string
		name string
		info os.FileInfo
	}

	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if fl.IsSupportedImage(entry.Name()) {
			info, err := entry.Info()
			if err != nil {
				continue
			}
			fullPath := filepath.Join(folderPath, entry.Name())
			imageFiles = append(imageFiles, struct {
				path string
				name string
				info os.FileInfo
			}{path: fullPath, name: entry.Name(), info: info})
		}
	}

	fmt.Printf("[FileLoader] GetImagesShallow: Found %d image files in %s\n", len(imageFiles), folderPath)

	// Sort by natural order
	sort.Slice(imageFiles, func(i, j int) bool {
		return naturalLess(imageFiles[i].name, imageFiles[j].name)
	})

	// Build result
	for i, file := range imageFiles {
		ext := strings.ToLower(filepath.Ext(file.name))
		images = append(images, ImageInfo{
			Path:      file.path,
			Name:      file.name,
			Extension: strings.TrimPrefix(ext, "."),
			Size:      file.info.Size(),
			Index:     i,
			ModTime:   file.info.ModTime().UnixMilli(),
		})
	}

	return images, nil
}

// HasSubdirectories checks if a directory contains any subdirectories
func (fl *FileLoader) HasSubdirectories(folderPath string) bool {
	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return false
	}

	for _, entry := range entries {
		if entry.IsDir() {
			return true
		}
	}
	return false
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
