package explorer

import (
	"context"
	"manga-visor/internal/database"
	"manga-visor/internal/persistence"
	"manga-visor/internal/services"
	"manga-visor/internal/thumbnails"
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
	explorerManager *database.ExplorerRepository
	folderOrders    *database.FolderOrdersRepository
	folderViewModes *database.FolderViewModeRepository
	folderGridSizes *database.FolderGridSizeRepository
	fileLoader      services.FileLoaderInterface
	urlBuilder      services.URLBuilderInterface
	logger          services.LoggerInterface
	thumbGen        *thumbnails.Generator

	// File watching
	watcher     *fsnotify.Watcher
	watchLock   sync.Mutex
	watchedDirs map[string]bool // Track which directories are being watched
}

// NewModule creates a new Explorer module
func NewModule(fileLoader services.FileLoaderInterface, urlBuilder services.URLBuilderInterface, logger services.LoggerInterface, explorer *database.ExplorerRepository, folderOrders *database.FolderOrdersRepository, folderViewModes *database.FolderViewModeRepository, folderGridSizes *database.FolderGridSizeRepository, thumbGen *thumbnails.Generator) *Module {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		if logger != nil {
			logger.Warnf("[Explorer] Warning: Could not create file watcher: %v", err)
		}
		watcher = nil
	}

	return &Module{
		explorerManager: explorer,
		folderOrders:    folderOrders,
		folderViewModes: folderViewModes,
		folderGridSizes: folderGridSizes,
		fileLoader:      fileLoader,
		urlBuilder:      urlBuilder,
		logger:          logger,
		thumbGen:        thumbGen,
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
						// Clear thumbnails for removed/renamed directories
						if event.Op&(fsnotify.Remove|fsnotify.Rename) != 0 {
							affectedPath := event.Name
							if !isDir {
								affectedPath = parentDir
							}
							if m.thumbGen != nil {
								go m.thumbGen.ClearCacheForFolder(affectedPath)
							}
						}

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
	PrevFolder   *FolderInfo  `json:"prevFolder,omitempty"`
	NextFolder   *FolderInfo  `json:"nextFolder,omitempty"`
	ParentPath   string       `json:"parentPath"`
	CurrentIndex int          `json:"currentIndex"`
	TotalFolders int          `json:"totalFolders"`
	AllFolders   []FolderInfo `json:"allFolders,omitempty"`
}

// FolderInfo represents a folder with basic info for navigation
type FolderInfo struct {
	Path string `json:"path"`
	Name string `json:"name"`
}

// ListDirectory returns contents of a directory for exploration
func (m *Module) ListDirectory(path string) ([]ExplorerEntry, error) {
	return m.ListDirectoryWithSort(path, "", "")
}

// ListDirectoryWithSort returns contents of a directory for exploration with a sort mode and order.
// sortMode can be "custom", "auto", or empty (default: directories first).
// sortOrder can be "asc" or "desc" (default "asc"). Only affects custom and auto modes.
func (m *Module) ListDirectoryWithSort(path string, sortMode string, sortOrder string) ([]ExplorerEntry, error) {
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

	// Sort based on mode
	pinned := m.folderOrders.GetPinned(path, sortMode)
	pinnedSet := make(map[string]bool, len(pinned))
	for _, name := range pinned {
		pinnedSet[name] = true
	}

	sort.SliceStable(result, func(i, j int) bool {
		// Directories before files
		if result[i].IsDirectory != result[j].IsDirectory {
			return result[i].IsDirectory && !result[j].IsDirectory
		}
		// If both are directories, check for order based on mode
		if result[i].IsDirectory && m.folderOrders != nil {
			iPinned := pinnedSet[result[i].Name]
			jPinned := pinnedSet[result[j].Name]
			if iPinned || jPinned {
				if iPinned && !jPinned {
					return true
				}
				if !iPinned && jPinned {
					return false
				}
				// Both pinned: maintain pinned order
				for _, name := range pinned {
					if name == result[i].Name {
						return true
					}
					if name == result[j].Name {
						return false
					}
				}
			}
			if sortMode == "custom" {
				customOrder := m.folderOrders.GetOrder(path)
				if len(customOrder) > 0 {
					order := customOrder
					if sortOrder == "desc" {
						reversed := make([]string, len(order))
						for k, v := range order {
							reversed[len(order)-1-k] = v
						}
						order = reversed
					}
					return applyNamedOrder(order, result[i].Name, result[j].Name)
				}
			} else if sortMode == "auto" {
				autoOrder := m.folderOrders.GetAutoOrder(path)
				if len(autoOrder) > 0 {
					order := autoOrder
					if sortOrder == "desc" {
						reversed := make([]string, len(order))
						for k, v := range order {
							reversed[len(order)-1-k] = v
						}
						order = reversed
					}
					return applyNamedOrder(order, result[i].Name, result[j].Name)
				}
				// Fallback: newest first by lastModified
				if sortOrder == "desc" {
					return result[i].LastModified < result[j].LastModified
				}
				return result[i].LastModified > result[j].LastModified
			}
		}
		return false
	})

	return result, nil
}

// applyNamedOrder returns true if nameA should sort before nameB per the given order.
func applyNamedOrder(order []string, nameA, nameB string) bool {
	idxA := -1
	idxB := -1
	for i, name := range order {
		if name == nameA {
			idxA = i
		}
		if name == nameB {
			idxB = i
		}
	}
	// If both are in the order, compare by their position
	if idxA >= 0 && idxB >= 0 {
		return idxA < idxB
	}
	// Items in the order come before items not in it
	if idxA >= 0 {
		return true
	}
	if idxB >= 0 {
		return false
	}
	// Neither is in the order, sort alphabetically
	return nameA < nameB
}

// getEnabledSubdirs returns subdirectories of dirPath that have images (shallow check), sorted alphabetically
func (m *Module) getEnabledSubdirs(dirPath string) []FolderInfo {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil
	}

	var folders []FolderInfo
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		subdirPath := filepath.Join(dirPath, entry.Name())

		shallowImageCount := m.fileLoader.GetShallowImageCount(subdirPath)
		if shallowImageCount == 0 {
			continue
		}

		folders = append(folders, FolderInfo{
			Path: subdirPath,
			Name: entry.Name(),
		})
	}

	sort.Slice(folders, func(i, j int) bool {
		return strings.ToLower(folders[i].Name) < strings.ToLower(folders[j].Name)
	})

	return folders
}

// GetFolderNavigation returns prev/next folder for a given folder path.
// When the folder has children (subdirs with images), navigation walks root → children (flat, include root).
// When the folder has no children, falls back to sibling folders in the parent directory.
func (m *Module) GetFolderNavigation(folderPath string) *FolderNavigation {
	// Strategy 1: folder has children → flat children nav (include self as first item)
	children := m.getEnabledSubdirs(folderPath)
	if len(children) > 0 {
		folderName := filepath.Base(folderPath)
		all := make([]FolderInfo, 0, len(children)+1)
		all = append(all, FolderInfo{Path: folderPath, Name: folderName})
		all = append(all, children...)

		if len(all) <= 1 {
			return nil
		}

		allCopy := make([]FolderInfo, len(all))
		copy(allCopy, all)

		nav := &FolderNavigation{
			ParentPath:   folderPath,
			CurrentIndex: 0,
			TotalFolders: len(all),
			AllFolders:   allCopy,
		}

		if len(all) > 1 {
			next := all[1]
			nav.NextFolder = &next
		}

		return nav
	}

	// Strategy 2: no children → navigate through siblings in parent directory
	parentPath := filepath.Dir(folderPath)
	siblingFolders := m.getEnabledSubdirs(parentPath)

	if len(siblingFolders) == 0 {
		return nil
	}

	// Find current folder among siblings
	currentIndex := -1
	for i, f := range siblingFolders {
		if f.Path == folderPath {
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

// getEnabledSubdirsWithSort is like getEnabledSubdirs but applies Explorer sort preferences.
func (m *Module) getEnabledSubdirsWithSort(dirPath string, sortMode string, sortOrder string) []FolderInfo {
	folders := m.getEnabledSubdirs(dirPath)
	if len(folders) == 0 {
		return nil
	}

	if sortMode == "" {
		sortMode = "name"
	}
	if sortOrder == "" {
		sortOrder = "asc"
	}

	pinned := m.folderOrders.GetPinned(dirPath, sortMode)
	pinnedSet := make(map[string]bool, len(pinned))
	for _, name := range pinned {
		pinnedSet[name] = true
	}

	var pinnedFolders, restFolders []FolderInfo
	for _, f := range folders {
		if pinnedSet[f.Name] {
			pinnedFolders = append(pinnedFolders, f)
		} else {
			restFolders = append(restFolders, f)
		}
	}

	// Sort pinned folders by pinned order
	if len(pinnedFolders) > 1 {
		sort.SliceStable(pinnedFolders, func(i, j int) bool {
			for idx, name := range pinned {
				if name == pinnedFolders[i].Name {
					iIdx := idx
					for jIdx, jName := range pinned {
						if jName == pinnedFolders[j].Name {
							return iIdx < jIdx
						}
					}
					_ = iIdx
				}
			}
			return false
		})
	}

	sortRest := func(list []FolderInfo) {
		switch sortMode {
		case "custom":
			if m.folderOrders == nil {
				break
			}
			order := m.folderOrders.GetOrder(dirPath)
			if len(order) > 0 {
				applyOrderToFolderInfos(list, order, sortOrder)
			}
		case "auto":
			if m.folderOrders == nil {
				break
			}
			order := m.folderOrders.GetAutoOrder(dirPath)
			if len(order) > 0 {
				applyOrderToFolderInfos(list, order, sortOrder)
			} else {
				sort.SliceStable(list, func(i, j int) bool {
					if sortOrder == "desc" {
						return strings.ToLower(list[i].Name) > strings.ToLower(list[j].Name)
					}
					return strings.ToLower(list[i].Name) < strings.ToLower(list[j].Name)
				})
			}
		case "date":
			sort.SliceStable(list, func(i, j int) bool {
				infoI, errI := os.Stat(filepath.Join(dirPath, list[i].Name))
				infoJ, errJ := os.Stat(filepath.Join(dirPath, list[j].Name))
				modI := int64(0)
				modJ := int64(0)
				if errI == nil {
					modI = infoI.ModTime().Unix()
				}
				if errJ == nil {
					modJ = infoJ.ModTime().Unix()
				}
				if sortOrder == "desc" {
					return modI > modJ
				}
				return modI < modJ
			})
		default: // "name"
			sort.SliceStable(list, func(i, j int) bool {
				if sortOrder == "desc" {
					return strings.ToLower(list[i].Name) > strings.ToLower(list[j].Name)
				}
				return strings.ToLower(list[i].Name) < strings.ToLower(list[j].Name)
			})
		}
	}

	sortRest(restFolders)

	return append(pinnedFolders, restFolders...)
}

// applyOrderToFolderInfos re-sorts a FolderInfo slice to follow the given name order.
func applyOrderToFolderInfos(folders []FolderInfo, order []string, sortOrder string) {
	orderMap := make(map[string]int, len(order))
	for i, name := range order {
		orderMap[name] = i
	}

	sort.SliceStable(folders, func(i, j int) bool {
		idxI, hasI := orderMap[folders[i].Name]
		idxJ, hasJ := orderMap[folders[j].Name]
		if hasI && hasJ {
			if sortOrder == "desc" {
				return idxI > idxJ
			}
			return idxI < idxJ
		}
		if hasI {
			return true
		}
		if hasJ {
			return false
		}
		if sortOrder == "desc" {
			return strings.ToLower(folders[i].Name) > strings.ToLower(folders[j].Name)
		}
		return strings.ToLower(folders[i].Name) < strings.ToLower(folders[j].Name)
	})
}

// GetFolderNavigationWithSort returns prev/next folder navigation respecting Explorer sort preferences.
func (m *Module) GetFolderNavigationWithSort(folderPath string, sortMode string, sortOrder string) *FolderNavigation {
	children := m.getEnabledSubdirsWithSort(folderPath, sortMode, sortOrder)
	if len(children) > 0 {
		folderName := filepath.Base(folderPath)
		all := make([]FolderInfo, 0, len(children)+1)
		all = append(all, FolderInfo{Path: folderPath, Name: folderName})
		all = append(all, children...)

		if len(all) <= 1 {
			return nil
		}

		allCopy := make([]FolderInfo, len(all))
		copy(allCopy, all)

		nav := &FolderNavigation{
			ParentPath:   folderPath,
			CurrentIndex: 0,
			TotalFolders: len(all),
			AllFolders:   allCopy,
		}

		if len(all) > 1 {
			next := all[1]
			nav.NextFolder = &next
		}

		return nav
	}

	// No children -> siblings in parent directory
	parentPath := filepath.Dir(folderPath)
	siblingFolders := m.getEnabledSubdirsWithSort(parentPath, sortMode, sortOrder)

	if len(siblingFolders) == 0 {
		return nil
	}

	currentIndex := -1
	for i, f := range siblingFolders {
		if f.Path == folderPath {
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

// GetFolderAutoOrder returns the auto order for a parent directory.
func (m *Module) GetFolderAutoOrder(parentPath string) []string {
	if m.folderOrders == nil {
		return nil
	}
	return m.folderOrders.GetAutoOrder(parentPath)
}

// SetFolderAutoOrder saves an auto order for a parent directory.
func (m *Module) SetFolderAutoOrder(parentPath string, autoOrder []string, originalOrder []string) error {
	if m.folderOrders == nil {
		return nil
	}
	if m.logger != nil {
		m.logger.Infof("[Explorer] Saving auto order for %s: %v", parentPath, autoOrder)
	}
	err := m.folderOrders.SetAutoOrder(parentPath, autoOrder, originalOrder)
	if err != nil && m.logger != nil {
		m.logger.Errorf("[Explorer] Failed to save auto order: %v", err)
	}
	return err
}

// HasFolderAutoOrder returns true if the parent directory has an auto order.
func (m *Module) HasFolderAutoOrder(parentPath string) bool {
	if m.folderOrders == nil {
		return false
	}
	return m.folderOrders.HasAutoOrder(parentPath)
}

// PromoteToAutoOrder moves an entry to the front of the auto order for the parent directory.
func (m *Module) PromoteToAutoOrder(parentPath string, entryName string, allEntries []string) ([]string, error) {
	if m.folderOrders == nil {
		return nil, nil
	}
	return m.folderOrders.PromoteToFront(parentPath, entryName, allEntries)
}

// ResetFolderAutoOrder removes the auto order, falling back to date sort.
func (m *Module) ResetFolderAutoOrder(parentPath string) error {
	if m.folderOrders == nil {
		return nil
	}
	return m.folderOrders.ResetAutoOrder(parentPath)
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

// GetFolderGridSize returns the stored grid item size for a parent directory.
func (m *Module) GetFolderGridSize(parentPath string) int {
	if m.folderGridSizes == nil {
		return 200
	}
	size := m.folderGridSizes.Get(parentPath)
	if size == nil {
		return 200
	}
	return *size
}

// SetFolderGridSize saves the grid item size preference for a parent directory.
func (m *Module) SetFolderGridSize(parentPath string, gridSize int) error {
	if m.folderGridSizes == nil {
		return nil
	}
	if m.logger != nil {
		m.logger.Infof("[Explorer] Saving grid size for %s: %d", parentPath, gridSize)
	}
	err := m.folderGridSizes.Set(parentPath, gridSize)
	if err != nil && m.logger != nil {
		m.logger.Errorf("[Explorer] Failed to save grid size: %v", err)
	}
	return err
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

// GetFolderOrdersRepo exposes the folder orders repository for use by App layer
func (m *Module) GetFolderOrdersRepo() *database.FolderOrdersRepository {
	return m.folderOrders
}

// PinFolder pins a folder for the given sort mode
func (m *Module) PinFolder(parentPath, sortMode, entryName string) error {
	if m.folderOrders == nil {
		return nil
	}
	return m.folderOrders.PinFolder(parentPath, sortMode, entryName)
}

// UnpinFolder unpins a folder for the given sort mode
func (m *Module) UnpinFolder(parentPath, sortMode, entryName string) error {
	if m.folderOrders == nil {
		return nil
	}
	return m.folderOrders.UnpinFolder(parentPath, sortMode, entryName)
}

// GetPinnedFolders returns pinned folders for the given sort mode
func (m *Module) GetPinnedFolders(parentPath, sortMode string) []string {
	if m.folderOrders == nil {
		return nil
	}
	return m.folderOrders.GetPinned(parentPath, sortMode)
}

// SortImagesByExplorerPreference sorts images according to Explorer sort preferences.
// This mirrors the sorting logic in ListDirectoryWithSort but for ImageInfo slices.
// sortMode: "custom", "auto", "name", "date"
// sortOrder: "asc", "desc"
func SortImagesByExplorerPreference(images []persistence.ImageInfo, parentPath string, sortMode string, sortOrder string, folderOrders *database.FolderOrdersRepository) {
	if folderOrders == nil || len(images) == 0 {
		return
	}

	switch sortMode {
	case "custom":
		order := folderOrders.GetOrder(parentPath)
		if len(order) > 0 {
			applyOrderToImages(images, order, sortOrder)
		}
	case "auto":
		order := folderOrders.GetAutoOrder(parentPath)
		if len(order) > 0 {
			applyOrderToImages(images, order, sortOrder)
		} else {
			// Fallback: newest first by lastModified
			sort.SliceStable(images, func(i, j int) bool {
				if sortOrder == "desc" {
					return images[i].ModTime > images[j].ModTime
				}
				return images[i].ModTime > images[j].ModTime
			})
		}
	case "date":
		sort.SliceStable(images, func(i, j int) bool {
			if sortOrder == "desc" {
				return images[i].ModTime > images[j].ModTime
			}
			return images[i].ModTime < images[j].ModTime
		})
	default: // "name"
		sort.SliceStable(images, func(i, j int) bool {
			if sortOrder == "desc" {
				return strings.ToLower(images[i].Name) > strings.ToLower(images[j].Name)
			}
			return strings.ToLower(images[i].Name) < strings.ToLower(images[j].Name)
		})
	}
}

// applyOrderToImages re-sorts the image slice to follow the given name order.
func applyOrderToImages(images []persistence.ImageInfo, order []string, sortOrder string) {
	orderMap := make(map[string]int, len(order))
	for i, name := range order {
		orderMap[name] = i
	}

	sort.SliceStable(images, func(i, j int) bool {
		idxI, hasI := orderMap[images[i].Name]
		idxJ, hasJ := orderMap[images[j].Name]
		if hasI && hasJ {
			if sortOrder == "desc" {
				return idxI > idxJ
			}
			return idxI < idxJ
		}
		if hasI {
			return true
		}
		if hasJ {
			return false
		}
		// Neither in order, sort alphabetically
		if sortOrder == "desc" {
			return strings.ToLower(images[i].Name) > strings.ToLower(images[j].Name)
		}
		return strings.ToLower(images[i].Name) < strings.ToLower(images[j].Name)
	})
}

// fileExists checks if a file exists and is not a directory
func fileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}
