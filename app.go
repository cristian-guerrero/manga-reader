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
func (a *App) GetImages(folderPath string) ([]ImageInfo, error) {
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

// AddFolder adds a folder to the LIBRARY
func (a *App) AddFolder(path string) error {
	// Check if it's a file or directory
	info, err := os.Stat(path)
	if err != nil {
		return err
	}

	folderPath := path
	if !info.IsDir() {
		folderPath = filepath.Dir(path)
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
		return err
	}

	runtime.EventsEmit(a.ctx, "library_updated")
	return nil
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
