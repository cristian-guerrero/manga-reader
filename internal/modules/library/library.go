package library

import (
	"context"
	"manga-visor/internal/archiver"
	"manga-visor/internal/database"
	"manga-visor/internal/fileloader"
	"manga-visor/internal/persistence"
	"manga-visor/internal/services"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// FileLoaderInterface and URLBuilderInterface are defined in services package
// Using type aliases for convenience
type FileLoaderInterface = services.FileLoaderInterface
type URLBuilderInterface = services.URLBuilderInterface

// ImageInfo is a type alias for fileloader.ImageInfo to reduce direct dependency
type ImageInfo = fileloader.ImageInfo

// Module handles Library logic
type Module struct {
	ctx          context.Context
	library      *database.LibraryRepository
	fileLoader   FileLoaderInterface
	urlBuilder   URLBuilderInterface
	logger       services.LoggerInterface
	seriesModule interface {
		AddSeries(path string, subfolders []persistence.FolderInfo, isTemp bool) (*persistence.AddFolderResult, error)
	}
}

// NewModule creates a new Library module
// Accepts interfaces for better testability
func NewModule(library *database.LibraryRepository, fileLoader FileLoaderInterface, urlBuilder URLBuilderInterface, logger services.LoggerInterface) *Module {
	return &Module{
		library:    library,
		fileLoader: fileLoader,
		urlBuilder: urlBuilder,
		logger:     logger,
	}
}

// SetContext sets the Wails context
func (m *Module) SetContext(ctx context.Context) {
	m.ctx = ctx
}

// SetSeriesModule sets the series module dependency to avoid circular imports in constructor if needed
// In a real DI system we'd handle this better, but for now this works.
// We use an interface or just accept the *SeriesManager if we were in the same package,
// but since we are splitting, we might strictly need to decoupled them.
// For now, let's keep it simple.
func (m *Module) SetSeriesModule(sm interface {
	AddSeries(path string, subfolders []persistence.FolderInfo, isTemp bool) (*persistence.AddFolderResult, error)
}) {
	m.seriesModule = sm
}

// resolveToFolder resolves a path to a folder
func (m *Module) resolveToFolder(path string) string {
	if archiver.IsArchive(path) {
		return path
	}

	info, err := os.Stat(path)
	if err != nil {
		return path
	}
	if info.IsDir() {
		return path
	}
	return filepath.Dir(path)
}

// ResolveFolder resolves a path to a folder
func (m *Module) ResolveFolder(path string) string {
	return m.resolveToFolder(path)
}

// AddFolder adds a folder to the LIBRARY or SERIES
func (m *Module) AddFolder(path string) (*persistence.AddFolderResult, error) {
	actualPath := path

	// If it's an archive, register it with the fileLoader for direct reading
	if archiver.IsArchive(path) {
		// Register archive for virtual reading (no extraction)
		m.fileLoader.RegisterDirectory(path)
		actualPath = path
	} else {
		actualPath = path
	}

	folderPath := m.resolveToFolder(actualPath)

	// Skip series detection for archives (flat reading only)
	if !archiver.IsArchive(path) {
		subfolders, _ := m.GetSubfolders(folderPath)
		if len(subfolders) > 0 && m.seriesModule != nil {
			return m.seriesModule.AddSeries(folderPath, subfolders, false)
		}
	}

	folderInfo, err := m.GetFolderInfo(folderPath)
	if err != nil {
		return nil, err
	}

	if folderInfo.ImageCount == 0 {
		return nil, services.NewNotFoundError("no images found in folder", nil)
	}

	entry := persistence.LibraryEntry{
		FolderPath:  folderInfo.Path,
		FolderName:  folderInfo.Name,
		TotalImages: folderInfo.ImageCount,
		CoverImage:  folderInfo.CoverImage,
		AddedAt:     time.Now().Format(time.RFC3339),
		IsTemporary: false,
	}

	if err := m.library.Add(entry); err != nil {
		return nil, err
	}

	runtime.EventsEmit(m.ctx, "library_updated")
	return &persistence.AddFolderResult{Path: folderPath, IsSeries: false}, nil
}

// GetLibrary returns all library entries
// Optimized: Uses cached data from persistence instead of re-scanning folders
func (m *Module) GetLibrary() []persistence.FolderInfo {
	entries := m.library.GetAll()
	result := make([]persistence.FolderInfo, 0, len(entries))

	for _, entry := range entries {
		// Use cached data from library entry instead of re-scanning
		// Only verify the path exists, but don't re-scan for images
		info := persistence.FolderInfo{
			Path:         entry.FolderPath,
			Name:         entry.FolderName,
			ImageCount:   entry.TotalImages,
			CoverImage:   entry.CoverImage,
			LastModified: entry.AddedAt,
		}

		// Only check if path exists (fast check), don't re-scan images
		if _, err := os.Stat(entry.FolderPath); err == nil {
			// Path exists, generate thumbnail URL if we have a cover image
		if entry.CoverImage != "" {
			dirHash := m.fileLoader.RegisterDirectory(entry.FolderPath)
			if archiver.IsArchive(entry.FolderPath) {
				info.ThumbnailURL = m.urlBuilder.BuildThumbnailURL(dirHash, entry.CoverImage)
			} else {
				thumbURL := m.urlBuilder.BuildImageURLFromPath(dirHash, entry.FolderPath, entry.CoverImage)
				info.ThumbnailURL = strings.Replace(thumbURL, "/images?", "/thumbnails?", 1)
			}
		}
		}
		// If path doesn't exist, we still return it so UI can show error or handle removal

		result = append(result, info)
	}

	return result
}

// RemoveLibraryEntry removes a library entry
func (m *Module) RemoveLibraryEntry(folderPath string) error {
	entry := m.library.Get(folderPath)
	if entry != nil && entry.IsTemporary {
		// cleanup logic if needed, but maybe we leave it for now or move cleanup util to separate place
		os.RemoveAll(folderPath) // Basic cleanup
	}

	err := m.library.Remove(folderPath)
	if err == nil {
		runtime.EventsEmit(m.ctx, "library_updated")
	}
	return err
}

// ClearLibrary removes all library entries
func (m *Module) ClearLibrary() error {
	entries := m.library.GetAll()
	for _, entry := range entries {
		if entry.IsTemporary {
			os.RemoveAll(entry.FolderPath)
		}
	}

	err := m.library.Clear()
	if err == nil {
		runtime.EventsEmit(m.ctx, "library_updated")
	}
	return err
}

// Helper methods duplicated or moved from app.go

func (m *Module) GetFolderInfo(folderPath string) (*persistence.FolderInfo, error) {
	images, err := m.fileLoader.GetImages(folderPath)
	if err != nil {
		return nil, err
	}

	var coverImage string
	var thumbnailURL string
	if len(images) > 0 {
		coverImage = images[0].Path
		dirHash := m.fileLoader.RegisterDirectory(folderPath)
		if archiver.IsArchive(folderPath) {
			thumbnailURL = m.urlBuilder.BuildThumbnailURL(dirHash, coverImage)
		} else {
			thumbURL := m.urlBuilder.BuildImageURLFromPath(dirHash, folderPath, coverImage)
			thumbnailURL = strings.Replace(thumbURL, "/images?", "/thumbnails?", 1)
		}
	}

	return &persistence.FolderInfo{
		Path:         folderPath,
		Name:         filepath.Base(folderPath),
		ImageCount:   len(images),
		CoverImage:   coverImage,
		ThumbnailURL: thumbnailURL,
	}, nil
}

// GetFolderInfoShallow returns folder info using shallow (non-recursive) image loading
func (m *Module) GetFolderInfoShallow(folderPath string) (*persistence.FolderInfo, error) {
	images, err := m.fileLoader.GetImagesShallow(folderPath)
	if err != nil {
		return nil, err
	}

	var coverImage string
	var thumbnailURL string
	if len(images) > 0 {
		coverImage = images[0].Path
		dirHash := m.fileLoader.RegisterDirectory(folderPath)
		if archiver.IsArchive(folderPath) {
			thumbnailURL = m.urlBuilder.BuildThumbnailURL(dirHash, coverImage)
		} else {
			thumbnailURL = m.urlBuilder.BuildThumbnailURLFromPath(dirHash, coverImage)
		}
	}

	return &persistence.FolderInfo{
		Path:         folderPath,
		Name:         filepath.Base(folderPath),
		ImageCount:   len(images),
		CoverImage:   coverImage,
		ThumbnailURL: thumbnailURL,
	}, nil
}

func (m *Module) GetSubfolders(folderPath string) ([]persistence.FolderInfo, error) {
	var folders []persistence.FolderInfo

	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		fullPath := filepath.Join(folderPath, entry.Name())

		// Only include immediate subfolders that have images directly (shallow scan)
		// This prevents nested folder structures from creating invalid chapters
		imageCount := m.fileLoader.GetShallowImageCount(fullPath)
		if imageCount == 0 {
			continue
		}

		coverImage, hasImages := m.fileLoader.FindFirstImageShallow(fullPath)
		if !hasImages {
			continue
		}

		var thumbnailURL string
		dirHash := m.fileLoader.RegisterDirectory(fullPath)
		thumbnailURL = m.urlBuilder.BuildThumbnailURLFromPath(dirHash, coverImage)

		info := persistence.FolderInfo{
			Path:         fullPath,
			Name:         entry.Name(),
			ImageCount:   imageCount,
			CoverImage:   coverImage,
			ThumbnailURL: thumbnailURL,
		}

		folders = append(folders, info)
	}

	return folders, nil
}

func (m *Module) unwrapArchiveRoot(path string) string {
	for {
		entries, err := os.ReadDir(path)
		if err != nil {
			return path
		}

		var subdirs []os.DirEntry
		hasImages := false
		for _, e := range entries {
			if e.IsDir() {
				subdirs = append(subdirs, e)
			} else {
				// check if image
				ext := strings.ToLower(filepath.Ext(e.Name()))
				if ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp" || ext == ".avif" || ext == ".gif" {
					hasImages = true
				}
			}
		}

		if !hasImages && len(subdirs) == 1 {
			path = filepath.Join(path, subdirs[0].Name())
			continue
		}

		return path
	}
}

func (m *Module) GetImages(path string, settings *persistence.Settings, orders *database.ImageOrdersRepository) ([]persistence.ImageInfo, error) {
	folderPath := m.ResolveFolder(path)
	images, err := m.fileLoader.GetImages(folderPath)
	if err != nil {
		return nil, err
	}

	if settings.MinImageSize > 0 {
		var filtered []ImageInfo
		minBytes := settings.MinImageSize * 1024
		for _, img := range images {
			if img.Size >= minBytes {
				filtered = append(filtered, img)
			}
		}
		if len(filtered) > 0 {
			images = filtered
		}
	}

	dirHash := m.fileLoader.RegisterDirectory(folderPath)
	isArchive := archiver.IsArchive(folderPath)

	result := make([]persistence.ImageInfo, len(images))

	for i, img := range images {
		var imageURL, thumbURL string
		if isArchive {
			// For archives, img.Path is just the entry name
			imageURL = m.urlBuilder.BuildImageURL(dirHash, img.Path)
			thumbURL = m.urlBuilder.BuildThumbnailURL(dirHash, img.Path)
		} else {
			imageURL = m.urlBuilder.BuildImageURLFromPath(dirHash, folderPath, img.Path)
			thumbURL = m.urlBuilder.BuildImageURLFromPath(dirHash, folderPath, img.Path)
			thumbURL = strings.Replace(thumbURL, "/images?", "/thumbnails?", 1)
		}
		result[i] = persistence.ImageInfo{
			Path:         img.Path,
			ThumbnailURL: thumbURL,
			ImageURL:     imageURL,
			Name:         img.Name,
			Extension:    img.Extension,
			Size:         img.Size,
			Index:        img.Index,
			ModTime:      img.ModTime,
		}
	}

	// Check Custom Order
	customOrder := orders.GetOrder(folderPath)
	if customOrder != nil && len(customOrder) > 0 {
		orderMap := make(map[string]int)
		for i, name := range customOrder {
			orderMap[name] = i
		}

		sort.Slice(result, func(i, j int) bool {
			idxI, existsI := orderMap[result[i].Name]
			idxJ, existsJ := orderMap[result[j].Name]

			if existsI && existsJ {
				return idxI < idxJ
			}
			if existsI {
				return true
			}
			if existsJ {
				return false
			}
			return result[i].Name < result[j].Name
		})

		for i := range result {
			result[i].Index = i
		}
	}

	return result, nil
}

func (m *Module) GetImagesShallow(path string, settings *persistence.Settings, orders *database.ImageOrdersRepository) ([]persistence.ImageInfo, error) {
	folderPath := m.ResolveFolder(path)
	images, err := m.fileLoader.GetImagesShallow(folderPath)
	if err != nil {
		return nil, err
	}

	if settings.MinImageSize > 0 {
		var filtered []ImageInfo
		minBytes := settings.MinImageSize * 1024
		for _, img := range images {
			if img.Size >= minBytes {
				filtered = append(filtered, img)
			}
		}
		if len(filtered) > 0 {
			images = filtered
		}
	}

	dirHash := m.fileLoader.RegisterDirectory(folderPath)
	isArchive := archiver.IsArchive(folderPath)

	result := make([]persistence.ImageInfo, len(images))

	for i, img := range images {
		var imageURL, thumbURL string
		if isArchive {
			imageURL = m.urlBuilder.BuildImageURL(dirHash, img.Path)
			thumbURL = m.urlBuilder.BuildThumbnailURL(dirHash, img.Path)
		} else {
			imageURL = m.urlBuilder.BuildImageURLFromPath(dirHash, folderPath, img.Path)
			thumbURL = m.urlBuilder.BuildImageURLFromPath(dirHash, folderPath, img.Path)
			thumbURL = strings.Replace(thumbURL, "/images?", "/thumbnails?", 1)
		}
		result[i] = persistence.ImageInfo{
			Path:         img.Path,
			ThumbnailURL: thumbURL,
			ImageURL:     imageURL,
			Name:         img.Name,
			Extension:    img.Extension,
			Size:         img.Size,
			Index:        img.Index,
			ModTime:      img.ModTime,
		}
	}

	// Check Custom Order
	customOrder := orders.GetOrder(folderPath)
	if customOrder != nil && len(customOrder) > 0 {
		orderMap := make(map[string]int)
		for i, name := range customOrder {
			orderMap[name] = i
		}

		sort.Slice(result, func(i, j int) bool {
			idxI, existsI := orderMap[result[i].Name]
			idxJ, existsJ := orderMap[result[j].Name]

			if existsI && existsJ {
				return idxI < idxJ
			}
			if existsI {
				return true
			}
			if existsJ {
				return false
			}
			return result[i].Name < result[j].Name
		})

		for i := range result {
			result[i].Index = i
		}
	}

	return result, nil
}
