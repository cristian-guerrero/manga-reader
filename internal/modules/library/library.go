package library

import (
	"context"
	"crypto/md5"
	"fmt"
	"manga-visor/internal/archiver"
	"manga-visor/internal/fileloader"
	"manga-visor/internal/persistence"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Module handles Library logic
type Module struct {
	ctx          context.Context
	library      *persistence.LibraryManager
	fileLoader   *fileloader.FileLoader
	imgServer    *fileloader.ImageServer
	seriesModule interface {
		AddSeries(path string, subfolders []persistence.FolderInfo, isTemp bool) (*persistence.AddFolderResult, error)
	}
}

// NewModule creates a new Library module
func NewModule(library *persistence.LibraryManager, fileLoader *fileloader.FileLoader, imgServer *fileloader.ImageServer) *Module {
	return &Module{
		library:    library,
		fileLoader: fileLoader,
		imgServer:  imgServer,
	}
}

// SetContext sets the Wails context
func (m *Module) SetContext(ctx context.Context) {
	m.ctx = ctx
}

// SetImageServer sets the image server dependency
func (m *Module) SetImageServer(imgServer *fileloader.ImageServer) {
	m.imgServer = imgServer
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

// getBaseURL returns the base URL for images
func (m *Module) getBaseURL() string {
	if m.imgServer != nil && m.imgServer.Addr != "" {
		return m.imgServer.Addr
	}
	return ""
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
	isTemp := false
	actualPath := path

	// If it's an archive, extract it
	if archiver.IsArchive(path) {
		tempBase := persistence.GetTempDir()
		hash := md5.Sum([]byte(path))
		folderName := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
		dest := filepath.Join(tempBase, fmt.Sprintf("%x_%s", hash, folderName))

		if err := archiver.Extract(path, dest); err != nil {
			return nil, err
		}
		actualPath = m.unwrapArchiveRoot(dest)
		isTemp = true
	} else {
		actualPath = m.unwrapArchiveRoot(path)
	}

	folderPath := m.resolveToFolder(actualPath)

	// Check if it's a series (has subfolders with images)
	// We need a helper to check subfolders, which might be in this module or utility
	subfolders, _ := m.GetSubfolders(folderPath) // We need to implement GetSubfolders in this module
	if len(subfolders) > 0 && m.seriesModule != nil {
		return m.seriesModule.AddSeries(folderPath, subfolders, isTemp)
	}

	folderInfo, err := m.GetFolderInfo(folderPath)
	if err != nil {
		return nil, err
	}

	if folderInfo.ImageCount == 0 {
		return nil, fmt.Errorf("no images found in folder")
	}

	entry := persistence.LibraryEntry{
		FolderPath:  folderInfo.Path,
		FolderName:  folderInfo.Name,
		TotalImages: folderInfo.ImageCount,
		CoverImage:  folderInfo.CoverImage,
		AddedAt:     time.Now().Format(time.RFC3339),
		IsTemporary: isTemp,
	}

	if err := m.library.Add(entry); err != nil {
		return nil, err
	}

	runtime.EventsEmit(m.ctx, "library_updated")
	return &persistence.AddFolderResult{Path: folderPath, IsSeries: false}, nil
}

// GetLibrary returns all library entries
func (m *Module) GetLibrary() []persistence.FolderInfo {
	entries := m.library.GetAll()
	result := make([]persistence.FolderInfo, 0, len(entries))

	for _, entry := range entries {
		info, err := m.GetFolderInfo(entry.FolderPath)
		if err == nil {
			// Preserve AddedAt from library entry as LastModified
			info.LastModified = entry.AddedAt
			result = append(result, *info)
		} else {
			result = append(result, persistence.FolderInfo{
				Path:         entry.FolderPath,
				Name:         entry.FolderName,
				ImageCount:   entry.TotalImages,
				CoverImage:   entry.CoverImage,
				LastModified: entry.AddedAt,
			})
		}
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
		baseURL := m.getBaseURL()
		thumbnailURL = fmt.Sprintf("%s/thumbnails?did=%s&fid=%s", baseURL, dirHash, strings.ReplaceAll(images[0].Name, " ", "%20")) // Simple escape
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

	entries, err := filepath.Glob(filepath.Join(folderPath, "*"))
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		stat, err := os.Stat(entry)
		if err != nil || !stat.IsDir() {
			continue
		}

		info, err := m.GetFolderInfo(entry)
		if err != nil {
			continue
		}

		if info.ImageCount > 0 {
			folders = append(folders, *info)
		}
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
