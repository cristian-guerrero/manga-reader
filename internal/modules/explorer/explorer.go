package explorer

import (
	"context"
	"manga-visor/internal/persistence"
	"manga-visor/internal/services"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Module handles Explorer logic
type Module struct {
	ctx             context.Context
	explorerManager *persistence.ExplorerManager
	folderOrders    *persistence.FolderOrdersManager
	folderViewModes *persistence.FolderViewModeManager
	fileLoader      services.FileLoaderInterface
	urlBuilder      services.URLBuilderInterface
	logger          services.LoggerInterface

	// File watching
	watcher     *fsnotify.Watcher
	watchLock   sync.Mutex
	watchedDirs map[string]bool // Track which directories are being watched
}

// NewModule creates a new Explorer module
func NewModule(fileLoader services.FileLoaderInterface, urlBuilder services.URLBuilderInterface, logger services.LoggerInterface, folderOrders *persistence.FolderOrdersManager, folderViewModes *persistence.FolderViewModeManager) *Module {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		// If file watching fails, continue without it
		if logger != nil {
			logger.Warnf("[Explorer] Warning: Could not create file watcher: %v", err)
		}
		watcher = nil
	}

	return &Module{
		explorerManager: persistence.NewExplorerManager(),
		folderOrders:    folderOrders,
		folderViewModes: folderViewModes,
		fileLoader:      fileLoader,
		urlBuilder:      urlBuilder,
		logger:          logger,
		watcher:         watcher,
		watchedDirs:     make(map[string]bool),
	}
}

// SetContext sets the Wails context and starts file watching
func (m *Module) SetContext(ctx context.Context) {
	m.ctx = ctx

	// Start file watching goroutine if watcher is available
	if m.watcher != nil {
		go m.watchFileChanges()
		// Watch existing base folders
		m.refreshWatcher()
	}
}

// watchFileChanges processes file system events and emits explorer_updated when changes occur
func (m *Module) watchFileChanges() {
	if m.watcher == nil {
		return
	}

	// Debounce: only emit event once per second maximum to avoid spam
	var lastEmitTime time.Time
	emitDebounceDuration := 1 * time.Second

	for {
		select {
		case event, ok := <-m.watcher.Events:
			if !ok {
				return
			}

			// Only react to create/remove/rename events on directories
			if event.Op&(fsnotify.Create|fsnotify.Remove|fsnotify.Rename) != 0 {
				// Check if it's a directory or if a directory was affected
				info, err := os.Stat(event.Name)
				isDir := err == nil && info.IsDir()

				// Also check parent directory (in case a directory was created/removed)
				parentDir := filepath.Dir(event.Name)
				parentInfo, parentErr := os.Stat(parentDir)
				isParentDir := parentErr == nil && parentInfo.IsDir()

				// Only emit if this affects a directory we're watching or its parent
				if isDir || isParentDir {
					// Check if this path or its parent is being watched
					if m.isWatchedPath(event.Name) || m.isWatchedPath(parentDir) {
						// Debounce: only emit if enough time has passed
						now := time.Now()
						if now.Sub(lastEmitTime) >= emitDebounceDuration {
							if m.ctx != nil {
								runtime.EventsEmit(m.ctx, "explorer_updated")
								lastEmitTime = now
								if m.logger != nil {
									m.logger.Debugf("[Explorer] File system change detected: %s (op: %v)", event.Name, event.Op)
								}
							}
						}
					}
				}
			}

		case err, ok := <-m.watcher.Errors:
			if !ok {
				return
			}
			if m.logger != nil {
				m.logger.Errorf("[Explorer] File watcher error: %v", err)
			}
		}
	}
}

// isWatchedPath checks if a path or any of its ancestors is being watched
func (m *Module) isWatchedPath(path string) bool {
	m.watchLock.Lock()
	defer m.watchLock.Unlock()

	// Check exact match and all parent directories
	current := path
	for {
		if m.watchedDirs[current] {
			return true
		}
		parent := filepath.Dir(current)
		if parent == current {
			break
		}
		current = parent
	}
	return false
}

// refreshWatcher updates watched directories based on current base folders
func (m *Module) refreshWatcher() {
	if m.watcher == nil {
		return
	}

	m.watchLock.Lock()
	defer m.watchLock.Unlock()

	// Get current base folders
	folders := m.explorerManager.GetAll()
	newWatchedDirs := make(map[string]bool)

	// Add all base folders to watch list
	for _, folder := range folders {
		if folder.IsVisible {
			// Watch the base folder itself
			newWatchedDirs[folder.Path] = true

			// Try to add to watcher
			if !m.watchedDirs[folder.Path] {
				err := m.watcher.Add(folder.Path)
				if err != nil {
					if m.logger != nil {
						m.logger.Warnf("[Explorer] Warning: Could not watch directory %s: %v", folder.Path, err)
					}
				} else {
					if m.logger != nil {
						m.logger.Debugf("[Explorer] Now watching directory: %s", folder.Path)
					}
				}
			}
		}
	}

	// Remove directories that are no longer base folders
	for dir := range m.watchedDirs {
		if !newWatchedDirs[dir] {
			err := m.watcher.Remove(dir)
			if err != nil {
				if m.logger != nil {
					m.logger.Warnf("[Explorer] Warning: Could not unwatch directory %s: %v", dir, err)
				}
			} else {
				if m.logger != nil {
					m.logger.Debugf("[Explorer] Stopped watching directory: %s", dir)
				}
			}
		}
	}

	m.watchedDirs = newWatchedDirs
}

// AddBaseFolder adds a folder to the explorer roots
func (m *Module) AddBaseFolder(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return services.NewValidationError("path is not a directory", nil)
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

	// Add to file watcher
	if m.watcher != nil && folder.IsVisible {
		m.watchLock.Lock()
		if !m.watchedDirs[path] {
			err := m.watcher.Add(path)
			if err != nil {
				if m.logger != nil {
					m.logger.Warnf("[Explorer] Warning: Could not watch directory %s: %v", path, err)
				}
			} else {
				m.watchedDirs[path] = true
				if m.logger != nil {
					m.logger.Debugf("[Explorer] Now watching directory: %s", path)
				}
			}
		}
		m.watchLock.Unlock()
	}

	runtime.EventsEmit(m.ctx, "explorer_updated")
	return nil
}

// RemoveBaseFolder removes a folder from the explorer roots
func (m *Module) RemoveBaseFolder(path string) error {
	if err := m.explorerManager.Remove(path); err != nil {
		return err
	}

	// Remove from file watcher
	if m.watcher != nil {
		m.watchLock.Lock()
		if m.watchedDirs[path] {
			err := m.watcher.Remove(path)
			if err != nil {
				if m.logger != nil {
					m.logger.Warnf("[Explorer] Warning: Could not unwatch directory %s: %v", path, err)
				}
			} else {
				delete(m.watchedDirs, path)
				if m.logger != nil {
					m.logger.Debugf("[Explorer] Stopped watching directory: %s", path)
				}
			}
		}
		m.watchLock.Unlock()
	}

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

	// Clear all watchers
	if m.watcher != nil {
		m.watchLock.Lock()
		for path := range m.watchedDirs {
			m.watcher.Remove(path)
		}
		m.watchedDirs = make(map[string]bool)
		m.watchLock.Unlock()
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
// Optimized to use shallow search to avoid blocking the UI
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

		// Check cache first
		imagePath := f.CoverImage
		hasImages := imagePath != ""

		// If not cached, or cached path no longer exists, search for it
		if !hasImages || !fileExists(imagePath) {
			imagePath, hasImages = m.fileLoader.FindFirstImage(f.Path)
			if hasImages {
				// Update cache for next time
				m.explorerManager.UpdateCoverImage(f.Path, imagePath)
			}
		}

		if hasImages {
			entry.HasImages = true
			// For thumbnails, we need to register the directory of the image itself
			// but for consistency with the explorer view, we register the base folder
			// and use the relative path.
			dirHash := m.fileLoader.RegisterDirectory(f.Path)
			entry.ThumbnailURL = m.urlBuilder.BuildThumbnailURLFromPath(dirHash, imagePath)
		}

		result = append(result, entry)
	}

	return result
}

// ExplorerEntry represents a file or folder in the explorer
type ExplorerEntry struct {
	Path              string `json:"path"`
	Name              string `json:"name"`
	IsDirectory       bool   `json:"isDirectory"`
	HasImages         bool   `json:"hasImages"`
	ImageCount        int    `json:"imageCount"`
	SubdirectoryCount int    `json:"subdirectoryCount"`
	CoverImage        string `json:"coverImage"` // Path to first image if available
	ThumbnailURL      string `json:"thumbnailUrl"`
	Size              int64  `json:"size"`
	LastModified      int64  `json:"lastModified"`
}

// FolderNavigation represents previous/next folder navigation for explorer
type FolderNavigation struct {
	PrevFolder   *FolderInfo `json:"prevFolder,omitempty"`
	NextFolder   *FolderInfo `json:"nextFolder,omitempty"`
	ParentPath   string      `json:"parentPath"`
	CurrentIndex int         `json:"currentIndex"`
	TotalFolders int         `json:"totalFolders"`
}

// FolderInfo represents a folder with basic info for navigation
type FolderInfo struct {
	Path string `json:"path"`
	Name string `json:"name"`
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
		var subdirCount int

		if isDir {
			// Use optimized search (shallow first, then recursive)
			var imagePath string
			imagePath, hasImages = m.fileLoader.FindFirstImage(fullPath)
			hasSubdirs := m.fileLoader.HasSubdirectories(fullPath)

			// FILTER: If no images and no subdirectories, skip this entry
			if !hasImages && !hasSubdirs {
				continue
			}

			// For count, we use shallow count (only immediate directory images)
			count := m.fileLoader.GetShallowImageCount(fullPath)
			imageCount = count
			subdirCount = m.fileLoader.GetSubdirectoryCount(fullPath)

			if hasImages {
				coverImage = imagePath
				// Generate thumbnail URL using relative path for the file ID
				dirHash := m.fileLoader.RegisterDirectory(fullPath)
				thumbnailURL = m.urlBuilder.BuildThumbnailURLFromPath(dirHash, imagePath)
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
			thumbnailURL = m.urlBuilder.BuildThumbnailURL(dirHash, entry.Name())
		}

		result = append(result, ExplorerEntry{
			Path:              fullPath,
			Name:              entry.Name(),
			IsDirectory:       isDir,
			HasImages:         hasImages,
			ImageCount:        imageCount,
			SubdirectoryCount: subdirCount,
			CoverImage:        coverImage,
			ThumbnailURL:      thumbnailURL,
			Size:              info.Size(),
			LastModified:      info.ModTime().Unix(),
		})
	}

	// Sort: Directories first; frontend handles detailed sorting within each group
	sort.SliceStable(result, func(i, j int) bool {
		// Directories before files
		if result[i].IsDirectory != result[j].IsDirectory {
			return result[i].IsDirectory && !result[j].IsDirectory
		}
		// If both are directories, check for custom order
		if result[i].IsDirectory && m.folderOrders != nil {
			customOrder := m.folderOrders.GetOrder(path)
			if len(customOrder) > 0 {
				return applyCustomOrder(customOrder, result[i].Name, result[j].Name)
			}
		}
		return false
	})

	return result, nil
}

// applyCustomOrder returns true if nameA should sort before nameB per customOrder.
func applyCustomOrder(customOrder []string, nameA, nameB string) bool {
	idxA := -1
	idxB := -1
	for i, name := range customOrder {
		if name == nameA {
			idxA = i
		}
		if name == nameB {
			idxB = i
		}
	}
	// If both are in the custom order, compare by their position
	if idxA >= 0 && idxB >= 0 {
		return idxA < idxB
	}
	// Items in the custom order come before items not in it
	if idxA >= 0 {
		return true
	}
	if idxB >= 0 {
		return false
	}
	// Neither is in the custom order, sort alphabetically
	return nameA < nameB
}

// GetFolderNavigation returns prev/next folder for a given folder path within its parent directory
func (m *Module) GetFolderNavigation(folderPath string) *FolderNavigation {
	// Get parent directory
	parentPath := filepath.Dir(folderPath)

	// List parent directory contents
	entries, err := os.ReadDir(parentPath)
	if err != nil {
		return nil
	}

	// Find subdirectories that have images (same filter as ListDirectory)
	var siblingFolders []FolderInfo
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		subdirPath := filepath.Join(parentPath, entry.Name())

		// Check if this subdirectory has images in its immediate directory (shallow check)
		// The viewer uses GetImagesShallow, so only folders with immediate images should be navigable
		shallowImageCount := m.fileLoader.GetShallowImageCount(subdirPath)
		if shallowImageCount == 0 {
			continue
		}

		siblingFolders = append(siblingFolders, FolderInfo{
			Path: subdirPath,
			Name: entry.Name(),
		})
	}

	// Sort folders alphabetically (same as ListDirectory)
	sort.Slice(siblingFolders, func(i, j int) bool {
		return strings.ToLower(siblingFolders[i].Name) < strings.ToLower(siblingFolders[j].Name)
	})

	// Find current folder index
	currentIndex := -1
	for i, folder := range siblingFolders {
		if folder.Path == folderPath {
			currentIndex = i
			break
		}
	}

	if currentIndex == -1 || len(siblingFolders) <= 1 {
		return nil
	}

	nav := &FolderNavigation{
		ParentPath:   parentPath,
		CurrentIndex: currentIndex,
		TotalFolders: len(siblingFolders),
	}

	if currentIndex > 0 {
		prev := siblingFolders[currentIndex-1]
		nav.PrevFolder = &prev
	}

	if currentIndex < len(siblingFolders)-1 {
		next := siblingFolders[currentIndex+1]
		nav.NextFolder = &next
	}

	return nav
}

// GetFolderOrder returns the custom folder order for a parent directory.
func (m *Module) GetFolderOrder(parentPath string) []string {
	if m.folderOrders == nil {
		return nil
	}
	return m.folderOrders.GetOrder(parentPath)
}

// SetFolderOrder saves a custom folder order for a parent directory.
func (m *Module) SetFolderOrder(parentPath string, customOrder []string, originalOrder []string) error {
	if m.folderOrders == nil {
		return nil
	}
	if m.logger != nil {
		m.logger.Infof("[Explorer] Saving folder order for %s: %v", parentPath, customOrder)
	}
	err := m.folderOrders.Save(parentPath, customOrder, originalOrder)
	if err != nil && m.logger != nil {
		m.logger.Errorf("[Explorer] Failed to save folder order: %v", err)
	}
	return err
}

// ResetFolderOrder removes the custom order, falling back to alphabetical.
func (m *Module) ResetFolderOrder(parentPath string) error {
	if m.folderOrders == nil {
		return nil
	}
	return m.folderOrders.Reset(parentPath)
}

// HasFolderCustomOrder returns true if the parent directory has a custom order.
func (m *Module) HasFolderCustomOrder(parentPath string) bool {
	if m.folderOrders == nil {
		return false
	}
	return m.folderOrders.HasCustomOrder(parentPath)
}

// GetFolderOriginalOrder returns the original (alphabetical) order for a parent directory.
func (m *Module) GetFolderOriginalOrder(parentPath string) []string {
	if m.folderOrders == nil {
		return nil
	}
	order := m.folderOrders.Get(parentPath)
	if order != nil && len(order.OriginalOrder) > 0 {
		return order.OriginalOrder
	}
	return nil
}

// GetFolderViewMode returns the stored view mode for a parent directory (grid or list).
func (m *Module) GetFolderViewMode(parentPath string) string {
	if m.folderViewModes == nil {
		return "grid"
	}
	mode := m.folderViewModes.Get(parentPath)
	if mode == nil {
		return "grid"
	}
	return *mode
}

// SetFolderViewMode saves the view mode preference for a parent directory.
func (m *Module) SetFolderViewMode(parentPath string, viewMode string) error {
	if m.folderViewModes == nil {
		return nil
	}
	if m.logger != nil {
		m.logger.Infof("[Explorer] Saving view mode for %s: %s", parentPath, viewMode)
	}
	err := m.folderViewModes.Set(parentPath, viewMode)
	if err != nil && m.logger != nil {
		m.logger.Errorf("[Explorer] Failed to save view mode: %v", err)
	}
	return err
}

// fileExists checks if a file exists and is not a directory
func fileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}
