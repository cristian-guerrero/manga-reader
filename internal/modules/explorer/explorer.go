package explorer

import (
	"context"
	"fmt"
	"manga-visor/internal/fileloader"
	"manga-visor/internal/persistence"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	// Added for URL escaping
	// Added for URL escaping

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Module handles Explorer logic
type Module struct {
	ctx             context.Context
	explorerManager *persistence.ExplorerManager
	fileLoader      *fileloader.FileLoader
	imgServer       *fileloader.ImageServer
}

// NewModule creates a new Explorer module
func NewModule(fileLoader *fileloader.FileLoader, imgServer *fileloader.ImageServer) *Module {
	return &Module{
		explorerManager: persistence.NewExplorerManager(),
		fileLoader:      fileLoader,
		imgServer:       imgServer,
	}
}

// SetImageServer sets the image server dependency
func (m *Module) SetImageServer(imgServer *fileloader.ImageServer) {
	m.imgServer = imgServer
}

// SetContext sets the Wails context
func (m *Module) SetContext(ctx context.Context) {
	m.ctx = ctx
}

// AddBaseFolder adds a folder to the explorer roots
func (m *Module) AddBaseFolder(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return fmt.Errorf("path is not a directory")
	}

	folder := persistence.BaseFolder{
		Path:      path,
		Name:      filepath.Base(path),
		AddedAt:   time.Now().Format(time.RFC3339),
		IsVisible: true,
	}

	if err := m.explorerManager.Add(folder); err != nil {
		return err
	}

	runtime.EventsEmit(m.ctx, "explorer_updated")
	return nil
}

// RemoveBaseFolder removes a folder from the explorer roots
func (m *Module) RemoveBaseFolder(path string) error {
	if err := m.explorerManager.Remove(path); err != nil {
		return err
	}
	runtime.EventsEmit(m.ctx, "explorer_updated")
	runtime.EventsEmit(m.ctx, "explorer_updated")
	return nil
}

// ClearBaseFolders removes all folders from the explorer roots
func (m *Module) ClearBaseFolders() error {
	folders := m.explorerManager.GetAll()
	for _, f := range folders {
		if err := m.explorerManager.Remove(f.Path); err != nil {
			return err
		}
	}
	runtime.EventsEmit(m.ctx, "explorer_updated")
	return nil
}

// BaseFolderEntry represents a root folder with thumbnail info
type BaseFolderEntry struct {
	Path         string `json:"path"`
	Name         string `json:"name"`
	AddedAt      string `json:"addedAt"`
	IsVisible    bool   `json:"isVisible"`
	HasImages    bool   `json:"hasImages"`
	ThumbnailURL string `json:"thumbnailUrl"`
}

// GetBaseFolders returns all added base folders with thumbnail info
func (m *Module) GetBaseFolders() []BaseFolderEntry {
	folders := m.explorerManager.GetAll()
	result := make([]BaseFolderEntry, 0, len(folders))

	for _, f := range folders {
		entry := BaseFolderEntry{
			Path:      f.Path,
			Name:      f.Name,
			AddedAt:   f.AddedAt,
			IsVisible: f.IsVisible,
		}

		// Look for a thumbnail for this base folder
		imagePath, hasImages := m.fileLoader.FindFirstImage(f.Path)
		if hasImages {
			entry.HasImages = true
			dirHash := m.fileLoader.RegisterDirectory(f.Path)
			if m.imgServer != nil && m.imgServer.Addr != "" {
				baseURL := m.imgServer.Addr
				relPath, _ := filepath.Rel(f.Path, imagePath)
				entry.ThumbnailURL = fmt.Sprintf("%s/thumbnails?did=%s&fid=%s", baseURL, dirHash, url.QueryEscape(relPath))
			}
		}

		result = append(result, entry)
	}

	return result
}

// ExplorerEntry represents a file or folder in the explorer
type ExplorerEntry struct {
	Path         string `json:"path"`
	Name         string `json:"name"`
	IsDirectory  bool   `json:"isDirectory"`
	HasImages    bool   `json:"hasImages"`
	ImageCount   int    `json:"imageCount"`
	CoverImage   string `json:"coverImage"` // Path to first image if available
	ThumbnailURL string `json:"thumbnailUrl"`
	Size         int64  `json:"size"`
	LastModified int64  `json:"lastModified"`
}

// ListDirectory returns contents of a directory for exploration
func (m *Module) ListDirectory(path string) ([]ExplorerEntry, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var result []ExplorerEntry

	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		fullPath := filepath.Join(path, entry.Name())
		isDir := entry.IsDir()

		var imageCount int
		var hasImages bool
		var coverImage string
		var thumbnailURL string

		if isDir {
			// Check if folder has images (fast check for first image)
			var imagePath string
			imagePath, hasImages = m.fileLoader.FindFirstImage(fullPath)
			hasSubdirs := m.fileLoader.HasSubdirectories(fullPath)

			// FILTER: If no images and no subdirectories, skip this entry
			if !hasImages && !hasSubdirs {
				continue
			}

			// For count, we use shallow count or just 1 if images exist in subfolders to be fast.
			count := m.fileLoader.GetShallowImageCount(fullPath)
			imageCount = count

			if hasImages {
				coverImage = imagePath
				// Generate thumbnail URL using relative path for the file ID
				relPath, _ := filepath.Rel(fullPath, imagePath)
				dirHash := m.fileLoader.RegisterDirectory(fullPath)
				if m.imgServer != nil && m.imgServer.Addr != "" {
					baseURL := m.imgServer.Addr
					thumbnailURL = fmt.Sprintf("%s/thumbnails?did=%s&fid=%s", baseURL, dirHash, url.QueryEscape(relPath))
				}
			}
		} else {
			// It's a file - check if it's an image
			if !m.fileLoader.IsSupportedImage(entry.Name()) {
				continue
			}
			hasImages = true
			imageCount = 1
			coverImage = fullPath

			// Generate thumbnail URL for the file itself
			dirHash := m.fileLoader.RegisterDirectory(path)
			if m.imgServer != nil && m.imgServer.Addr != "" {
				baseURL := m.imgServer.Addr
				thumbnailURL = fmt.Sprintf("%s/thumbnails?did=%s&fid=%s", baseURL, dirHash, url.QueryEscape(entry.Name()))
			}
		}

		result = append(result, ExplorerEntry{
			Path:         fullPath,
			Name:         entry.Name(),
			IsDirectory:  isDir,
			HasImages:    hasImages,
			ImageCount:   imageCount,
			CoverImage:   coverImage,
			ThumbnailURL: thumbnailURL,
			Size:         info.Size(),
			LastModified: info.ModTime().Unix(),
		})
	}

	// Sort: Directories first, then alphabetical
	sort.Slice(result, func(i, j int) bool {
		if result[i].IsDirectory != result[j].IsDirectory {
			return result[i].IsDirectory
		}
		return strings.ToLower(result[i].Name) < strings.ToLower(result[j].Name)
	})

	return result, nil
}
