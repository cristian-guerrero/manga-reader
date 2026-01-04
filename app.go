package main

import (
	"context"
	"fmt"
	"manga-visor/internal/fileloader"
	"manga-visor/internal/persistence"
	"manga-visor/internal/thumbnails"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct - Main application structure
type App struct {
	ctx      context.Context
	settings *persistence.SettingsManager
	history  *persistence.HistoryManager
	library  *persistence.LibraryManager
	orders   *persistence.OrdersManager

	fileLoader *fileloader.FileLoader
	thumbGen   *thumbnails.Generator
	series     *persistence.SeriesManager
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		settings: persistence.NewSettingsManager(),

		history: persistence.NewHistoryManager(),
		library: persistence.NewLibraryManager(),
		orders:  persistence.NewOrdersManager(),

		fileLoader: fileloader.NewFileLoader(),
		thumbGen:   thumbnails.NewGenerator(),
		series:     persistence.NewSeriesManager(),
	}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// domReady is called after the frontend dom has been loaded
func (a *App) domReady(ctx context.Context) {
	// Can be used for any initialization after DOM is ready
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	// Cleanup code here
}

// =============================================================================
// Window Control Methods
// =============================================================================

// WindowMinimise minimizes the window
func (a *App) WindowMinimise() {
	runtime.WindowMinimise(a.ctx)
}

// WindowMaximise maximizes the window
func (a *App) WindowMaximise() {
	runtime.WindowMaximise(a.ctx)
}

// WindowUnmaximise restores the window from maximized state
func (a *App) WindowUnmaximise() {
	runtime.WindowUnmaximise(a.ctx)
}

// WindowIsMaximised checks if window is maximized
func (a *App) WindowIsMaximised() bool {
	return runtime.WindowIsMaximised(a.ctx)
}

// WindowToggleMaximise toggles between maximized and normal state
func (a *App) WindowToggleMaximise() {
	runtime.WindowToggleMaximise(a.ctx)
}

// =============================================================================
// Settings Methods
// =============================================================================

// GetSettings returns the current settings
func (a *App) GetSettings() *persistence.Settings {
	return a.settings.Get()
}

// SaveSettings saves the settings
func (a *App) SaveSettings(settings *persistence.Settings) error {
	return a.settings.Save(settings)
}

// UpdateSettings updates specific settings fields
func (a *App) UpdateSettings(updates map[string]interface{}) error {
	return a.settings.Update(updates)
}

// =============================================================================
// History Methods
// =============================================================================

// GetHistory returns all history entries
func (a *App) GetHistory() []persistence.HistoryEntry {
	return a.history.GetAll()
}

// GetHistoryEntry returns a specific history entry
func (a *App) GetHistoryEntry(folderPath string) *persistence.HistoryEntry {
	return a.history.Get(folderPath)
}

// resolveToFolder returns the path itself if it's a directory, or the parent directory if it's a file.
func (a *App) resolveToFolder(path string) string {
	info, err := os.Stat(path)
	if err != nil {
		fmt.Printf("[App] Error stating path %s: %v\n", path, err)
		return path
	}
	if info.IsDir() {
		return path
	}
	parent := filepath.Dir(path)
	fmt.Printf("[App] Resolved file path %s to folder %s\n", path, parent)
	return parent
}

// ResolveFolder exposes path resolution to the frontend
func (a *App) ResolveFolder(path string) string {
	return a.resolveToFolder(path)
}

// AddHistory adds or updates a history entry
func (a *App) AddHistory(entry persistence.HistoryEntry) error {
	// Check if history is enabled
	settings := a.settings.Get()
	if !settings.EnableHistory {
		return nil
	}

	if err := a.history.Add(entry); err != nil {
		return err
	}
	runtime.EventsEmit(a.ctx, "history_updated")
	return nil
}

// RemoveHistory removes a history entry
func (a *App) RemoveHistory(folderPath string) error {
	return a.history.Remove(folderPath)
}

// ClearHistory clears all history
func (a *App) ClearHistory() error {
	return a.history.Clear()
}

// =============================================================================
// Image Order Methods
// =============================================================================

// GetImageOrder returns the image order for a folder
func (a *App) GetImageOrder(folderPath string) []string {
	return a.orders.GetOrder(folderPath)
}

// SaveImageOrder saves a custom image order
func (a *App) SaveImageOrder(folderPath string, customOrder []string, originalOrder []string) error {
	return a.orders.Save(folderPath, customOrder, originalOrder)
}

// ResetImageOrder resets the image order to original
func (a *App) ResetImageOrder(folderPath string) error {
	return a.orders.Reset(folderPath)
}

// HasCustomOrder checks if a folder has a custom order
func (a *App) HasCustomOrder(folderPath string) bool {
	return a.orders.HasCustomOrder(folderPath)
}

// GetOriginalOrder returns the original file order for a folder (before any customization)
func (a *App) GetOriginalOrder(folderPath string) []string {
	orderData := a.orders.Get(folderPath)
	if orderData != nil && len(orderData.OriginalOrder) > 0 {
		return orderData.OriginalOrder
	}
	return nil
}

// =============================================================================
// File System Methods
// =============================================================================

// SelectFolder opens a folder selection dialog
func (a *App) SelectFolder() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Manga Folder",
	})
}

// ImageInfo represents information about an image file
type ImageInfo struct {
	Path      string `json:"path"`
	Name      string `json:"name"`
	Extension string `json:"extension"`
	Size      int64  `json:"size"`
	Index     int    `json:"index"`
}

// GetImages returns a list of images in the specified folder
func (a *App) GetImages(path string) ([]ImageInfo, error) {
	folderPath := a.resolveToFolder(path)
	images, err := a.fileLoader.GetImages(folderPath)
	if err != nil {
		return nil, err
	}

	// Filter by min size
	settings := a.settings.Get()
	if settings.MinImageSize > 0 {
		var filtered []fileloader.ImageInfo
		minBytes := settings.MinImageSize * 1024 // KB to Bytes
		fmt.Printf("Filtering images: MinSize=%d KB (%d bytes)\n", settings.MinImageSize, minBytes)
		for _, img := range images {
			if img.Size >= minBytes {
				filtered = append(filtered, img)
			} else {
				fmt.Printf("Skipping image %s: %d bytes\n", img.Name, img.Size)
			}
		}

		// Re-index
		for i := range filtered {
			filtered[i].Index = i
		}
		images = filtered
	}

	// Convert to our type
	result := make([]ImageInfo, len(images))
	for i, img := range images {
		result[i] = ImageInfo{
			Path:      img.Path,
			Name:      img.Name,
			Extension: img.Extension,
			Size:      img.Size,
			Index:     img.Index,
		}
	}

	// Check if we have a custom order
	customOrder := a.orders.GetOrder(folderPath)
	if customOrder != nil && len(customOrder) > 0 {
		// Create a map for quick lookup
		orderMap := make(map[string]int)
		for i, name := range customOrder {
			orderMap[name] = i
		}

		// Sort by custom order
		sort.Slice(result, func(i, j int) bool {
			iOrder, iExists := orderMap[result[i].Name]
			jOrder, jExists := orderMap[result[j].Name]

			if !iExists && !jExists {
				return result[i].Name < result[j].Name
			}
			if !iExists {
				return false
			}
			if !jExists {
				return true
			}
			return iOrder < jOrder
		})

		// Update indices
		for i := range result {
			result[i].Index = i
		}
	} else {
		// Store original order
		originalOrder := make([]string, len(result))
		for i, img := range result {
			originalOrder[i] = img.Name
		}
		a.orders.SetOriginalOrder(folderPath, originalOrder)
	}

	return result, nil
}

// FolderInfo represents information about a folder
type FolderInfo struct {
	Path         string `json:"path"`
	Name         string `json:"name"`
	ImageCount   int    `json:"imageCount"`
	CoverImage   string `json:"coverImage"`
	LastModified string `json:"lastModified"`
}

// GetFolderInfo returns information about a folder
func (a *App) GetFolderInfo(folderPath string) (*FolderInfo, error) {
	images, err := a.GetImages(folderPath)
	if err != nil {
		return nil, err
	}

	var coverImage string
	if len(images) > 0 {
		coverImage = images[0].Path
	}

	return &FolderInfo{
		Path:       folderPath,
		Name:       filepath.Base(folderPath),
		ImageCount: len(images),
		CoverImage: coverImage,
	}, nil
}

// GetSubfolders returns a list of subfolders that contain images
func (a *App) GetSubfolders(folderPath string) ([]FolderInfo, error) {
	var folders []FolderInfo

	entries, err := filepath.Glob(filepath.Join(folderPath, "*"))
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		info, err := a.GetFolderInfo(entry)
		if err != nil {
			continue
		}

		// Only include folders with images
		if info.ImageCount > 0 {
			folders = append(folders, *info)
		}
	}

	// Sort naturally by name
	sort.Slice(folders, func(i, j int) bool {
		return strings.ToLower(folders[i].Name) < strings.ToLower(folders[j].Name)
	})

	return folders, nil
}

// AddFolder adds a folder to the LIBRARY or SERIES (if it has subfolders)
func (a *App) AddFolder(path string) error {
	folderPath := a.resolveToFolder(path)

	// Check if it's a series (has subfolders with images)
	subfolders, _ := a.GetSubfolders(folderPath)
	if len(subfolders) > 0 {
		return a.AddSeries(folderPath, subfolders)
	}

	folderInfo, err := a.GetFolderInfo(folderPath)
	if err != nil {
		return err
	}

	if folderInfo.ImageCount == 0 {
		return fmt.Errorf("no images found in folder")
	}

	entry := persistence.LibraryEntry{
		FolderPath:  folderInfo.Path,
		FolderName:  folderInfo.Name,
		TotalImages: folderInfo.ImageCount,
		CoverImage:  folderInfo.CoverImage,
		AddedAt:     time.Now().Format(time.RFC3339),
	}

	if err := a.library.Add(entry); err != nil {
		fmt.Printf("Error adding folder to library: %v\n", err)
		return err
	}

	runtime.EventsEmit(a.ctx, "library_updated")
	fmt.Printf("Folder added to library: %s\n", folderPath)
	return nil
}

// AddSeries adds a series with its chapters
func (a *App) AddSeries(path string, subfolders []FolderInfo) error {
	// 1. Find cover image
	rootImages, _ := a.GetImages(path)
	var coverImage string

	if len(rootImages) > 0 {
		// Prefer root image as cover.
		// Heuristic: If multiple images, look for "cover", "folder", "thumb" or just any small file
		coverImage = rootImages[0].Path
		for _, img := range rootImages {
			lowerName := strings.ToLower(img.Name)
			// Preference for standard cover filenames
			if strings.Contains(lowerName, "cover") || strings.Contains(lowerName, "folder") || strings.Contains(lowerName, "thumb") {
				coverImage = img.Path
				break
			}
			// If not found yet, and we see an image that is relatively small (possible thumbnail), keep it as candidate
			if coverImage == rootImages[0].Path && img.Size < 500*1024 { // < 500KB
				coverImage = img.Path
			}
		}
	} else if len(subfolders) > 0 {
		// Use first image of first subfolder as fallback
		coverImage = subfolders[0].CoverImage
	}

	chapters := make([]persistence.ChapterInfo, len(subfolders))
	for i, sub := range subfolders {
		chapters[i] = persistence.ChapterInfo{
			Path:       sub.Path,
			Name:       sub.Name,
			ImageCount: sub.ImageCount,
		}
	}

	entry := persistence.SeriesEntry{
		Path:       path,
		Name:       filepath.Base(path),
		CoverImage: coverImage,
		AddedAt:    time.Now().Format(time.RFC3339),
		Chapters:   chapters,
	}

	if err := a.series.Add(entry); err != nil {
		fmt.Printf("Error adding series: %v\n", err)
		return err
	}

	runtime.EventsEmit(a.ctx, "series_updated")
	fmt.Printf("Series added: %s with %d chapters\n", path, len(subfolders))
	return nil
}

// GetSeries returns all series entries
func (a *App) GetSeries() []persistence.SeriesEntry {
	return a.series.GetAll()
}

// RemoveSeries removes a series entry
func (a *App) RemoveSeries(path string) error {
	err := a.series.Remove(path)
	if err == nil {
		runtime.EventsEmit(a.ctx, "series_updated")
	}
	return err
}

// IsSeries checks if a folder should be treated as a series
func (a *App) IsSeries(path string) bool {
	folderPath := a.resolveToFolder(path)
	subfolders, _ := a.GetSubfolders(folderPath)
	return len(subfolders) > 0
}

// GetLibrary returns all library entries
func (a *App) GetLibrary() []persistence.LibraryEntry {
	return a.library.GetAll()
}

// RemoveLibraryEntry removes a library entry
func (a *App) RemoveLibraryEntry(folderPath string) error {
	return a.library.Remove(folderPath)
}

// =============================================================================
// Image Loading Methods
// =============================================================================

// LoadImage loads an image as base64 data URL
func (a *App) LoadImage(imagePath string) (string, error) {
	return a.fileLoader.LoadImageAsBase64(imagePath)
}

// GetThumbnail generates or retrieves a thumbnail for an image
func (a *App) GetThumbnail(imagePath string) (string, error) {
	return a.thumbGen.GetThumbnail(imagePath)
}

// PreloadThumbnails generates thumbnails for a list of images in the background
func (a *App) PreloadThumbnails(imagePaths []string) {
	go a.thumbGen.PreloadThumbnails(imagePaths)
}

// ClearThumbnailCache clears the thumbnail cache
func (a *App) ClearThumbnailCache() error {
	return a.thumbGen.ClearCache()
}
