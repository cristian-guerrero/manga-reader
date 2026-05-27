// Package fileloader provides image loading and serving functionality
package fileloader

import (
	"archive/zip"
	"crypto/md5"
	"fmt"
	"io"
	"manga-visor/internal/utils"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/nwaples/rardecode/v2"
)

const archivePrefix = "archive:"

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

// ArchiveReader provides read access to images inside a compressed archive (ZIP/CBZ, RAR/CBR)
type ArchiveReader struct {
	path     string
	entries  []string       // sorted image entry names
	entrySizes map[string]int64 // entry name -> uncompressed size
	mu       sync.Mutex
}

// NewArchiveReader opens an archive and indexes its image entries
func NewArchiveReader(archivePath string) (*ArchiveReader, error) {
	ar := &ArchiveReader{
		path:       archivePath,
		entrySizes: make(map[string]int64),
	}
	if err := ar.indexEntries(); err != nil {
		return nil, err
	}
	return ar, nil
}

func (ar *ArchiveReader) indexEntries() error {
	ext := strings.ToLower(filepath.Ext(ar.path))
	switch ext {
	case ".zip", ".cbz":
		return ar.indexZip()
	case ".rar", ".cbr":
		return ar.indexRar()
	default:
		return fmt.Errorf("unsupported archive format: %s", ext)
	}
}

func (ar *ArchiveReader) indexZip() error {
	r, err := zip.OpenReader(ar.path)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		if f.FileInfo().IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(f.Name))
		if _, supported := SupportedExtensions[ext]; supported {
			ar.entries = append(ar.entries, f.Name)
			ar.entrySizes[f.Name] = int64(f.UncompressedSize64)
		}
	}

	sort.Slice(ar.entries, func(i, j int) bool {
		return naturalLess(ar.entries[i], ar.entries[j])
	})
	return nil
}

// EntrySize returns the uncompressed size of an entry, or 0 if unknown
func (ar *ArchiveReader) EntrySize(entryName string) int64 {
	return ar.entrySizes[entryName]
}

func (ar *ArchiveReader) indexRar() error {
	r, err := rardecode.OpenReader(ar.path)
	if err != nil {
		return err
	}
	defer r.Close()

	for {
		f, err := r.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		if f.IsDir {
			continue
		}
		ext := strings.ToLower(filepath.Ext(f.Name))
		if _, supported := SupportedExtensions[ext]; supported {
			ar.entries = append(ar.entries, f.Name)
			ar.entrySizes[f.Name] = f.UnPackedSize
		}
	}

	sort.Slice(ar.entries, func(i, j int) bool {
		return naturalLess(ar.entries[i], ar.entries[j])
	})
	return nil
}

// ListEntries returns the sorted list of image entry names in the archive
func (ar *ArchiveReader) ListEntries() []string {
	return ar.entries
}

// EntryCount returns the number of image entries
func (ar *ArchiveReader) EntryCount() int {
	return len(ar.entries)
}

// ReadEntry reads an entry's bytes by name
func (ar *ArchiveReader) ReadEntry(entryName string) ([]byte, error) {
	ext := strings.ToLower(filepath.Ext(ar.path))
	switch ext {
	case ".zip", ".cbz":
		return ar.readZipEntry(entryName)
	case ".rar", ".cbr":
		return ar.readRarEntry(entryName)
	default:
		return nil, fmt.Errorf("unsupported archive format: %s", ext)
	}
}

func (ar *ArchiveReader) readZipEntry(entryName string) ([]byte, error) {
	r, err := zip.OpenReader(ar.path)
	if err != nil {
		return nil, err
	}
	defer r.Close()

	for _, f := range r.File {
		if f.Name == entryName && !f.FileInfo().IsDir() {
			rc, err := f.Open()
			if err != nil {
				return nil, err
			}
			defer rc.Close()
			return io.ReadAll(rc)
		}
	}
	return nil, fmt.Errorf("entry not found in archive: %s", entryName)
}

func (ar *ArchiveReader) readRarEntry(entryName string) ([]byte, error) {
	r, err := rardecode.OpenReader(ar.path)
	if err != nil {
		return nil, err
	}
	defer r.Close()

	for {
		f, err := r.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		if f.Name == entryName && !f.IsDir {
			return io.ReadAll(r)
		}
	}
	return nil, fmt.Errorf("entry not found in archive: %s", entryName)
}

// OpenEntry opens an entry for streaming and returns a reader, mime type, and size
func (ar *ArchiveReader) OpenEntry(entryName string) (io.ReadCloser, string, int64, error) {
	ext := strings.ToLower(filepath.Ext(ar.path))
	switch ext {
	case ".zip", ".cbz":
		r, err := zip.OpenReader(ar.path)
		if err != nil {
			return nil, "", 0, err
		}
		for _, f := range r.File {
			if f.Name == entryName && !f.FileInfo().IsDir() {
				rc, err := f.Open()
				if err != nil {
					r.Close()
					return nil, "", 0, err
				}
				mime := mimeTypeByExt(entryName)
				return &zipEntryReadCloser{rc: rc, zr: r}, mime, int64(f.UncompressedSize64), nil
			}
		}
		r.Close()
		return nil, "", 0, fmt.Errorf("entry not found in archive: %s", entryName)
	case ".rar", ".cbr":
		r, err := rardecode.OpenReader(ar.path)
		if err != nil {
			return nil, "", 0, err
		}
		for {
			f, err := r.Next()
			if err == io.EOF {
				break
			}
			if err != nil {
				r.Close()
				return nil, "", 0, err
			}
			if f.Name == entryName && !f.IsDir {
				mime := mimeTypeByExt(entryName)
				return &rarEntryReadCloser{rc: r, size: f.UnPackedSize}, mime, f.UnPackedSize, nil
			}
		}
		r.Close()
		return nil, "", 0, fmt.Errorf("entry not found in archive: %s", entryName)
	default:
		return nil, "", 0, fmt.Errorf("unsupported archive format: %s", ext)
	}
}

// zipEntryReadCloser wraps a zip.File reader and the zip.ReadCloser to close both
type zipEntryReadCloser struct {
	rc io.ReadCloser
	zr *zip.ReadCloser
}

func (z *zipEntryReadCloser) Read(p []byte) (int, error) { return z.rc.Read(p) }
func (z *zipEntryReadCloser) Close() error {
	z.rc.Close()
	return z.zr.Close()
}

// rarEntryReadCloser wraps a rardecode.ReadCloser for streaming
type rarEntryReadCloser struct {
	rc   io.ReadCloser
	size int64
}

func (r *rarEntryReadCloser) Read(p []byte) (int, error) { return r.rc.Read(p) }
func (r *rarEntryReadCloser) Close() error               { return r.rc.Close() }

// mimeTypeByExt returns the MIME type for a filename based on its extension
func mimeTypeByExt(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	if mime, ok := SupportedExtensions[ext]; ok {
		return mime
	}
	return "application/octet-stream"
}

// isArchivePath checks if a path uses the virtual archive path format
func isArchivePath(path string) bool {
	return strings.HasPrefix(path, archivePrefix)
}

// parseArchivePath parses "archive:<hash>:<entry_name>" and returns hash and entry name
func parseArchivePath(path string) (hash, entryName string) {
	parts := strings.SplitN(path, ":", 3)
	if len(parts) == 3 {
		return parts[1], parts[2]
	}
	return "", ""
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
	dirPool     map[string]string          // Hash -> DirPath
	archivePool map[string]*ArchiveReader  // Hash -> ArchiveReader
	mu          sync.RWMutex
	logger      LoggerInterface
}

// NewFileLoader creates a new file loader
func NewFileLoader(logger LoggerInterface) *FileLoader {
	return &FileLoader{
		dirPool:     make(map[string]string),
		archivePool: make(map[string]*ArchiveReader),
		logger:      logger,
	}
}

// RegisterDirectory registers a directory or archive and returns a short hash for it
// If the path is a supported archive format, it's registered as an archive instead
func (fl *FileLoader) RegisterDirectory(dirPath string) string {
	if isArchiveFileExt(dirPath) {
		return fl.RegisterArchive(dirPath)
	}

	fl.mu.Lock()
	defer fl.mu.Unlock()

	hash := fmt.Sprintf("%x", md5.Sum([]byte(dirPath)))
	fl.dirPool[hash] = dirPath
	return hash
}

// isArchiveFileExt checks if a path has a supported archive extension
func isArchiveFileExt(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	return ext == ".zip" || ext == ".cbz" || ext == ".rar" || ext == ".cbr"
}

// GetDirectory returns the registered path for a given hash
// Searches both directory and archive pools
func (fl *FileLoader) GetDirectory(hash string) (string, bool) {
	fl.mu.RLock()
	defer fl.mu.RUnlock()

	path, exists := fl.dirPool[hash]
	if exists {
		return path, true
	}
	// Also check archivePool (archives registered via RegisterDirectory or RegisterArchive)
	if ar, ok := fl.archivePool[hash]; ok {
		return ar.path, true
	}
	return "", false
}

// RegisterArchive registers an archive file and returns a short hash for it
func (fl *FileLoader) RegisterArchive(archivePath string) string {
	fl.mu.Lock()
	defer fl.mu.Unlock()

	// Check if already registered
	for hash, ar := range fl.archivePool {
		if ar.path == archivePath {
			return hash
		}
	}

	hash := fmt.Sprintf("%x", md5.Sum([]byte(archivePath)))
	ar, err := NewArchiveReader(archivePath)
	if err != nil {
		if fl.logger != nil {
			fl.logger.Errorf("[FileLoader] Failed to open archive %s: %v", archivePath, err)
		}
		return ""
	}
	fl.archivePool[hash] = ar
	return hash
}

// GetArchive returns the ArchiveReader for a given hash
func (fl *FileLoader) GetArchive(hash string) (*ArchiveReader, bool) {
	fl.mu.RLock()
	defer fl.mu.RUnlock()

	ar, exists := fl.archivePool[hash]
	return ar, exists
}

// IsArchiveHash checks if a hash points to a registered archive
func (fl *FileLoader) IsArchiveHash(hash string) bool {
	fl.mu.RLock()
	defer fl.mu.RUnlock()

	_, exists := fl.archivePool[hash]
	return exists
}

// findArchiveByPath returns the ArchiveReader for a given archive path, if registered
func (fl *FileLoader) findArchiveByPath(archivePath string) (*ArchiveReader, bool) {
	fl.mu.RLock()
	defer fl.mu.RUnlock()

	for _, ar := range fl.archivePool {
		if ar.path == archivePath {
			return ar, true
		}
	}
	return nil, false
}

// findHashByArchivePath returns the hash for a given archive path
func (fl *FileLoader) findHashByArchivePath(archivePath string) (string, bool) {
	fl.mu.RLock()
	defer fl.mu.RUnlock()

	for hash, ar := range fl.archivePool {
		if ar.path == archivePath {
			return hash, true
		}
	}
	return "", false
}

// ResolvePath joins a directory path and a filename
// Returns a virtual path with "archive:" prefix if dirPath is a registered archive
func (fl *FileLoader) ResolvePath(dirPath, fileName string) string {
	fl.mu.RLock()
	for hash, ar := range fl.archivePool {
		if ar.path == dirPath {
			fl.mu.RUnlock()
			return archivePrefix + hash + ":" + fileName
		}
	}
	fl.mu.RUnlock()
	return filepath.Join(dirPath, fileName)
}

// IsSupportedImage checks if a file extension is a supported image format
func (fl *FileLoader) IsSupportedImage(filename string) bool {
	if isArchivePath(filename) {
		_, entry := parseArchivePath(filename)
		filename = entry
	}
	ext := strings.ToLower(filepath.Ext(filename))
	_, supported := SupportedExtensions[ext]
	return supported
}

// GetMimeType returns the MIME type for an image extension
func (fl *FileLoader) GetMimeType(filename string) string {
	if isArchivePath(filename) {
		_, entry := parseArchivePath(filename)
		filename = entry
	}
	ext := strings.ToLower(filepath.Ext(filename))
	if mime, exists := SupportedExtensions[ext]; exists {
		return mime
	}
	return "application/octet-stream"
}

// GetImages returns a list of images in the specified folder (recursive)
// If folderPath is an archive, returns images from the archive
func (fl *FileLoader) GetImages(folderPath string) ([]ImageInfo, error) {
	// Handle archives
	if ar, ok := fl.findArchiveByPath(folderPath); ok {
		return fl.getArchiveImages(ar, folderPath), nil
	}
	// Auto-register and retry if it's an archive file
	if isArchiveFileExt(folderPath) {
		hash := fl.RegisterArchive(folderPath)
		if hash == "" {
			return nil, fmt.Errorf("failed to open archive: %s", folderPath)
		}
		if ar, ok := fl.GetArchive(hash); ok {
			return fl.getArchiveImages(ar, folderPath), nil
		}
		return nil, fmt.Errorf("archive not found after registration: %s", folderPath)
	}

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

	if fl.logger != nil {
		fl.logger.Infof("[FileLoader] GetImages: Found %d total image files in %s", len(imageFiles), folderPath)
	}

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

// getArchiveImages returns ImageInfo list from an archive
// Path is set to the entry name (relative), not a full filesystem path
func (fl *FileLoader) getArchiveImages(ar *ArchiveReader, archivePath string) []ImageInfo {
	entries := ar.ListEntries()
	images := make([]ImageInfo, len(entries))
	for i, entry := range entries {
		ext := strings.ToLower(filepath.Ext(entry))
		images[i] = ImageInfo{
			Path:      entry,
			Name:      filepath.Base(entry),
			Extension: strings.TrimPrefix(ext, "."),
			Size:      ar.EntrySize(entry),
			Index:     i,
			ModTime:   0,
		}
	}
	if fl.logger != nil {
		fl.logger.Infof("[FileLoader] getArchiveImages: Found %d images in archive %s", len(images), archivePath)
	}
	return images
}

// FindFirstImageShallow searches for the first image only in the immediate directory (non-recursive)
func (fl *FileLoader) FindFirstImageShallow(folderPath string) (string, bool) {
	// Handle archives
	if ar, ok := fl.findArchiveByPath(folderPath); ok {
		entries := ar.ListEntries()
		if len(entries) > 0 {
			return entries[0], true
		}
		return "", false
	}
	if isArchiveFileExt(folderPath) {
		hash := fl.RegisterArchive(folderPath)
		if hash == "" {
			return "", false
		}
		if ar, ok := fl.GetArchive(hash); ok {
			entries := ar.ListEntries()
			if len(entries) > 0 {
				return entries[0], true
			}
		}
		return "", false
	}

	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return "", false
	}

	for _, entry := range entries {
		if !entry.IsDir() && fl.IsSupportedImage(entry.Name()) {
			return filepath.Join(folderPath, entry.Name()), true
		}
	}

	return "", false
}

// FindFirstImage recursively searches for the first image in a directory and stops immediately
func (fl *FileLoader) FindFirstImage(folderPath string) (string, bool) {
	// Handle archives the same as shallow (no recursion needed)
	if ar, ok := fl.findArchiveByPath(folderPath); ok {
		entries := ar.ListEntries()
		if len(entries) > 0 {
			return entries[0], true
		}
		return "", false
	}
	if isArchiveFileExt(folderPath) {
		hash := fl.RegisterArchive(folderPath)
		if hash == "" {
			return "", false
		}
		if ar, ok := fl.GetArchive(hash); ok {
			entries := ar.ListEntries()
			if len(entries) > 0 {
				return entries[0], true
			}
		}
		return "", false
	}

	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return "", false
	}

	for _, entry := range entries {
		if !entry.IsDir() && fl.IsSupportedImage(entry.Name()) {
			return filepath.Join(folderPath, entry.Name()), true
		}
	}

	for _, entry := range entries {
		if entry.IsDir() {
			path, exists := fl.FindFirstImage(filepath.Join(folderPath, entry.Name()))
			if exists {
				return path, true
			}
			break
		}
	}

	return "", false
}

// GetShallowImageCount returns the count of images in the immediate directory (not recursive)
func (fl *FileLoader) GetShallowImageCount(folderPath string) int {
	// Handle archives
	if ar, ok := fl.findArchiveByPath(folderPath); ok {
		return ar.EntryCount()
	}
	if isArchiveFileExt(folderPath) {
		hash := fl.RegisterArchive(folderPath)
		if hash == "" {
			return 0
		}
		if ar, ok := fl.GetArchive(hash); ok {
			return ar.EntryCount()
		}
		return 0
	}

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
	// Handle archives
	if ar, ok := fl.findArchiveByPath(folderPath); ok {
		return fl.getArchiveImages(ar, folderPath), nil
	}
	if isArchiveFileExt(folderPath) {
		hash := fl.RegisterArchive(folderPath)
		if hash == "" {
			return nil, fmt.Errorf("failed to open archive: %s", folderPath)
		}
		if ar, ok := fl.GetArchive(hash); ok {
			return fl.getArchiveImages(ar, folderPath), nil
		}
		return nil, fmt.Errorf("archive not found after registration: %s", folderPath)
	}

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

	if fl.logger != nil {
		fl.logger.Infof("[FileLoader] GetImagesShallow: Found %d image files in %s", len(imageFiles), folderPath)
	}

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
	if isArchiveFileExt(folderPath) || fl.isAnyArchivePath(folderPath) {
		return false
	}

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

// GetSubdirectoryCount returns the count of subdirectories in the specified folder (non-recursive)
func (fl *FileLoader) GetSubdirectoryCount(folderPath string) int {
	if isArchiveFileExt(folderPath) || fl.isAnyArchivePath(folderPath) {
		return 0
	}

	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return 0
	}

	count := 0
	for _, entry := range entries {
		if entry.IsDir() {
			count++
		}
	}
	return count
}

// isAnyArchivePath checks if a path is an archive file or a virtual archive path
func (fl *FileLoader) isAnyArchivePath(path string) bool {
	if isArchivePath(path) {
		return true
	}
	if _, ok := fl.findArchiveByPath(path); ok {
		return true
	}
	return false
}

// LoadImageBytes loads an image and returns the raw bytes and MIME type
// Supports both regular filesystem paths and virtual archive paths
func (fl *FileLoader) LoadImageBytes(imagePath string) ([]byte, string, error) {
	// Handle virtual archive paths
	if isArchivePath(imagePath) {
		_, entryName := parseArchivePath(imagePath)
		// Need the hash, but it's embedded in the path
		parts := strings.SplitN(imagePath, ":", 3)
		if len(parts) < 3 {
			return nil, "", fmt.Errorf("invalid archive path: %s", imagePath)
		}
		hash := parts[1]
		ar, ok := fl.GetArchive(hash)
		if !ok {
			return nil, "", fmt.Errorf("archive not found for hash: %s", hash)
		}
		data, err := ar.ReadEntry(entryName)
		if err != nil {
			return nil, "", err
		}
		mimeType := fl.GetMimeType(imagePath)
		return data, mimeType, nil
	}

	if _, err := os.Stat(imagePath); os.IsNotExist(err) {
		return nil, "", fmt.Errorf("image not found: %s", imagePath)
	}

	data, err := os.ReadFile(imagePath)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read image: %w", err)
	}

	mimeType := fl.GetMimeType(imagePath)
	return data, mimeType, nil
}

// OpenImage returns an io.ReadCloser, MIME type, and size for any supported image path
// Supports both regular filesystem paths and virtual archive paths
func (fl *FileLoader) OpenImage(imagePath string) (io.ReadCloser, string, int64, error) {
	// Handle virtual archive paths
	if isArchivePath(imagePath) {
		parts := strings.SplitN(imagePath, ":", 3)
		if len(parts) < 3 {
			return nil, "", 0, fmt.Errorf("invalid archive path: %s", imagePath)
		}
		hash := parts[1]
		entryName := parts[2]
		ar, ok := fl.GetArchive(hash)
		if !ok {
			return nil, "", 0, fmt.Errorf("archive not found for hash: %s", hash)
		}
		return ar.OpenEntry(entryName)
	}

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

// GetImageReader returns an io.ReadCloser for streaming large images (legacy wrapper)
func (fl *FileLoader) GetImageReader(imagePath string) (io.ReadCloser, string, int64, error) {
	return fl.OpenImage(imagePath)
}

// naturalLess compares strings in natural order (1, 2, 10 instead of 1, 10, 2)
func naturalLess(a, b string) bool {
	return utils.NaturalLess(a, b)
}
