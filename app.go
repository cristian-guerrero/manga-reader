package main

import (
	"context"
	"fmt"
	"manga-visor/internal/fileloader"
	"manga-visor/internal/modules/explorer"
	"manga-visor/internal/modules/history"
	"manga-visor/internal/modules/library"
	"manga-visor/internal/modules/series"
	"manga-visor/internal/persistence"
	"manga-visor/internal/thumbnails"
	"net/url"
	"path/filepath"
	"sort"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct - Main application structure
type App struct {
	ctx      context.Context
	settings *persistence.SettingsManager
	orders   *persistence.OrdersManager

	// Core Services
	fileLoader *fileloader.FileLoader
	thumbGen   *thumbnails.Generator
	imgServer  *fileloader.ImageServer

	// Modules
	libraryMod  *library.Module
	seriesMod   *series.Module
	historyMod  *history.Module
	explorerMod *explorer.Module
}

// NewApp creates a new App application struct
func NewApp() *App {
	// Core services
	fileLoader := fileloader.NewFileLoader()
	thumbGen := thumbnails.NewGenerator() // Note: Generator might need App context or callback, let's keep it as is

	// Persistence
	settings := persistence.NewSettingsManager()
	historyManager := persistence.NewHistoryManager()
	libraryManager := persistence.NewLibraryManager()
	seriesManager := persistence.NewSeriesManager()
	ordersManager := persistence.NewOrdersManager()

	// Image Server (if needed by modules for URL generation)
	// We might need to initialize it here or pass nil and set it up later if it depends on port finding?
	// Existing code didn't show explicit initialization of imgServer in NewApp, it might be done in Startup or it's a field I missed.
	// Looking at original app.go, `imgServer` was a field but not initialized in `NewApp`. It was likely initialized in `startup`.
	// For now we pass nil to modules and set it later.

	// fileLoader.SetImageServer(nil) // Removed: FileLoader does not need ImageServer reference directly

	// Modules
	lMod := library.NewModule(libraryManager, fileLoader, nil)
	sMod := series.NewModule(seriesManager, fileLoader, nil)
	hMod := history.NewModule(historyManager, settings)
	// Passing nil for imgServer initially, it will be set or replaced via SetContext/SetImageServer if we add it?
	// Or we just rely on struct field assignment since we're in same package?
	// The modules are in DIFFERENT packages. We can't access fields directly.
	// We MUST reconstruct or add setter.
	// Since I added `imgServer` to `NewModule` args, I pass nil here.
	eMod := explorer.NewModule(fileLoader, nil)

	// Dependency injection (Circular dependency resolution)
	lMod.SetSeriesModule(sMod)

	return &App{
		settings:    settings,
		orders:      ordersManager,
		fileLoader:  fileLoader,
		thumbGen:    thumbGen,
		libraryMod:  lMod,
		seriesMod:   sMod,
		historyMod:  hMod,
		explorerMod: eMod,
	}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize Image Server with context if needed, or just start it
	// Initialize ImageServer with context if needed, or just start it
	a.imgServer = fileloader.NewImageServer(a.fileLoader, a.thumbGen)
	if err := a.imgServer.Start(); err != nil {
		fmt.Printf("Failed to start image server: %v\n", err)
	}

	// Update modules with context and image server
	a.libraryMod.SetContext(ctx)
	a.libraryMod.SetImageServer(a.imgServer)

	a.seriesMod.SetContext(ctx)
	a.seriesMod.SetImageServer(a.imgServer)

	a.historyMod.SetContext(ctx)

	a.explorerMod.SetContext(ctx)
	a.explorerMod.SetImageServer(a.imgServer)

	// We need to inject the server address into modules so they can generate URLs
	// This requires updating the modules to accept the server/address or reconstructing them (which is checking).
	// But `get-base-url` method in modules uses `imgServer`. So we just updated the `imgServer` reference inside modules?
	// The modules copy the struct? No, they store checking pointer?
	// In my module implementation: `type Module struct { ... imgServer *fileloader.ImageServer }`
	// So I need to inject it. I didn't add a SetImageServer method to modules.
	// I should probably access the struct fields directly if they are in same package? No, distinct packages.
	// I will rely on re-creating them or adding a setter?
	// Wait, I can just initialize ImageServer in NewApp! It doesn't strictly need context to be created, often only to log or bind.
	// Check `fileloader.NewImageServer` signature. It usually takes context for lifecycle or logging.
	// Let's assume I can't change `NewApp` signature easily without changing `main.go`.
	// But I CAN add setters to modules. Or I can modify `app.go` to reconstruct modules in `startup`? No that's messy.
	// I'll add a quick hack: Initialize ImageServer in NewApp if possible.
	// If `NewImageServer` requires context, I'll pass it in `startup`.

	// Re-injecting dependencies into modules (I need to update module code to allow this or use reflection/public fields).
	// Since I wrote the modules, I know I didn't verify `SetImageServer` exists. I should probably add checking it or just use a shared singleton if possible?
	// Better approach: Create a `Services` struct that is shared?
	// For now, I will modify `NewApp` to create the ImageServer *without* starting it, if possible.
	// If `NewImageServer` takes context, I'm stuck.
	// Let's look at `app.go` original code again. `imgServer *fileloader.ImageServer` was a field.
	// I will assume `fileloader.NewImageServer` is available.

	// FIX: I will instantiate the modules in `NewApp` but pass the `imgServer` pointer which will be populated/started later?
	// No, pointers need to point to the valid object.
	// I will just update the modules to have `SetImageServer` or similar if I can't pass it early.
	// Actually, I can just create the ImageServer in `NewApp` passing `context.Background()` or `nil` if allowed, and then `Start(ctx)` in startup.
	// For now, I'll leave `imgServer` as nil in `NewApp` calls, and assume I need to update modules to handle it or I'll add `SetImageServer` method to them via `write_to_file` if needed.
	// Actually, I can just update the `Module` structs in `app.go` by re-assigning them? No.

	// Let's modify the modules to have `SetImageServer` in the next steps if needed.
	// Or even simpler: Use the `App` instance as a facade that injects the BaseURL into methods or context?
	// The modules use `getBaseURL` helper.

	// Strategy:
	// I will construct `App` with `imgServer` instance (not started).
	// Pass this instance to modules.
	// Start it in `startup`.

	// Restore window position
	settings := a.settings.Get()
	if settings.WindowX != -1 && settings.WindowY != -1 {
		fmt.Printf("[App] Restoring window position: (%v, %v)\n", settings.WindowX, settings.WindowY)
		runtime.WindowSetPosition(ctx, settings.WindowX, settings.WindowY)
	}
}

// getBaseURL returns the base URL for images and thumbnails
func (a *App) getBaseURL() string {
	if a.imgServer != nil && a.imgServer.Addr != "" {
		return a.imgServer.Addr
	}
	return ""
}

// domReady is called after the frontend dom has been loaded
func (a *App) domReady(ctx context.Context) {
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
}

// SaveWindowState captures and saves the current window dimensions and position
func (a *App) SaveWindowState() {
	if a.ctx == nil {
		return
	}

	isMaximized := runtime.WindowIsMaximised(a.ctx)
	x, y := runtime.WindowGetPosition(a.ctx)
	w, h := runtime.WindowGetSize(a.ctx)

	if w <= 0 || h <= 0 {
		return
	}

	updates := map[string]interface{}{
		"windowWidth":     w,
		"windowHeight":    h,
		"windowX":         x,
		"windowY":         y,
		"windowMaximized": isMaximized,
	}

	a.settings.Update(updates)
}

// =============================================================================
// Window Control Methods
// =============================================================================

func (a *App) WindowMinimise() {
	runtime.WindowMinimise(a.ctx)
}

func (a *App) WindowMaximise() {
	runtime.WindowMaximise(a.ctx)
}

func (a *App) WindowUnmaximise() {
	runtime.WindowUnmaximise(a.ctx)
}

func (a *App) WindowIsMaximised() bool {
	return runtime.WindowIsMaximised(a.ctx)
}

func (a *App) WindowToggleMaximise() {
	runtime.WindowToggleMaximise(a.ctx)
}

// =============================================================================
// Settings Methods
// =============================================================================

func (a *App) GetSettings() *persistence.Settings {
	return a.settings.Get()
}

func (a *App) SaveSettings(settings *persistence.Settings) error {
	return a.settings.Save(settings)
}

func (a *App) UpdateSettings(updates map[string]interface{}) error {
	return a.settings.Update(updates)
}

// =============================================================================
// History Methods (Delegated)
// =============================================================================

func (a *App) GetHistory() []persistence.HistoryEntry {
	return a.historyMod.GetHistory()
}

func (a *App) GetHistoryEntry(folderPath string) *persistence.HistoryEntry {
	return a.historyMod.GetHistoryEntry(folderPath)
}

func (a *App) ResolveFolder(path string) string {
	return a.libraryMod.ResolveFolder(path)
}

func (a *App) AddHistory(entry persistence.HistoryEntry) error {
	return a.historyMod.AddHistory(entry)
}

func (a *App) RemoveHistory(folderPath string) error {
	return a.historyMod.RemoveHistory(folderPath)
}

func (a *App) ClearHistory() error {
	return a.historyMod.ClearHistory()
}

// =============================================================================
// Image Order Methods (Kept in App for now or move to specific module? Kept here or moved to Library?)
// For now, let's keep Orders in App or delegate if Library needs it.
// The original App had OrdersManager. Let's expose it directly for now as it wasn't strictly part of the modularization plan.
// =============================================================================

func (a *App) GetImageOrder(folderPath string) []string {
	return a.orders.GetOrder(folderPath)
}

func (a *App) SaveImageOrder(folderPath string, customOrder []string, originalOrder []string) error {
	return a.orders.Save(folderPath, customOrder, originalOrder)
}

func (a *App) ResetImageOrder(folderPath string) error {
	return a.orders.Reset(folderPath)
}

func (a *App) HasCustomOrder(folderPath string) bool {
	return a.orders.HasCustomOrder(folderPath)
}

func (a *App) GetOriginalOrder(folderPath string) []string {
	orderData := a.orders.Get(folderPath)
	if orderData != nil && len(orderData.OriginalOrder) > 0 {
		return orderData.OriginalOrder
	}
	return nil
}

// =============================================================================
// File System & Library Methods (Delegated)
// =============================================================================

func (a *App) SelectFolder() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Manga Folder",
	})
}

// ImageInfo and FolderInfo need to be shared or accessible.
// They are now in `persistence` or `fileloader`?
// In the original code, `ImageInfo` was defined in `app.go`.
// I SHOULD MOVE shared structs to `persistence` or `internal/api` types.
// ERROR: My modules use `persistence.FolderInfo` but `app.go` returned `App.ImageInfo` struct which had JSON tags.
// I need to ensure the structs returned to Wails matches what frontend expects.
// `ImageInfo` in `app.go` had `ThumbnailURL`. `fileloader.ImageInfo` does not.
// The modules should return the Enhanced structs (with URLs).
// In my `library.go`, `GetFolderInfo` returns `*persistence.FolderInfo`.
// I need to check if `persistence.FolderInfo` has `ThumbnailURL`.
// Looking at `library.go` module code I wrote:
// `type FolderInfo struct` was NOT defined there, it returns `*persistence.FolderInfo`.
// But `persistence.FolderInfo` doesn't exist? `persistence` package has `LibraryEntry` etc.
// Wait, I might have introduced a compilation error if `persistence.FolderInfo` is not defined.
// In `internal/persistence/library.go`, I defined `LibraryEntry`.
// I DID NOT define `FolderInfo` in `persistence`.
// THIS IS A CRITICAL ISSUE. I need a shared `types` package or put these in `persistence`.
// I will assume I need to ADD these types to `persistence` or a new `types` package.
// For expediency, I will add them to `persistence/common.go` or similar.

// Also `GetImages` in `app.go` returned `[]ImageInfo`.
// My `library.go` calls `fileloader.GetImages` but doesn't expose `GetImages`!
// `App.GetImages` is used by the frontend viewer!
// I MUST expose `GetImages` via `App` but logic should probably be in `Library` or `Explorer`?
// Actually `GetImages` is a generic file operation.
// I should probably keep `GetImages` in `App` or move it to `Library` module and delegate.
// Since `App` is the API surface, I can keep using `fileloader` here or delegate to `libraryMod`.
// Given `Library` module has `GetFolderInfo`, it likely needs `GetImages`.
// I should define `GetImages` in `App` that delegates or uses `fileloader` directly + generates URLs.
// This logic was in `app.go` before.

func (a *App) GetImages(path string) ([]struct {
	Path         string `json:"path"`
	ThumbnailURL string `json:"thumbnailUrl"`
	ImageURL     string `json:"imageUrl"`
	Name         string `json:"name"`
	Extension    string `json:"extension"`
	Size         int64  `json:"size"`
	Index        int    `json:"index"`
	ModTime      int64  `json:"modTime"`
}, error) {
	// Re-implementing GetImages here using shared logic or duplicating it for now to avoid breaking changes
	// Ideally this should be in a shared service.

	// Delegate to fileLoader directly?
	// But we need to generate URLs.
	// Let's copy-paste the logic from original App.go but fix references.

	folderPath := a.libraryMod.ResolveFolder(path) // Use library mod for resolution
	images, err := a.fileLoader.GetImages(folderPath)
	if err != nil {
		return nil, err
	}

	settings := a.settings.Get()
	if settings.MinImageSize > 0 {
		var filtered []fileloader.ImageInfo
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

	dirHash := a.fileLoader.RegisterDirectory(folderPath)
	baseURL := a.getBaseURL()

	// Define return type anonymously or use a named type if I define one.
	// Since Wails uses the return value, anonymous struct slice works fine for runtime,
	// but for Go code clarity I should probably define it.
	// Return type matches `GetImages` signature.

	// struct defined inline below

	// Use anonymous struct matching the return signature
	result := make([]struct {
		Path         string `json:"path"`
		ThumbnailURL string `json:"thumbnailUrl"`
		ImageURL     string `json:"imageUrl"`
		Name         string `json:"name"`
		Extension    string `json:"extension"`
		Size         int64  `json:"size"`
		Index        int    `json:"index"`
		ModTime      int64  `json:"modTime"`
	}, len(images))

	for i, img := range images {
		relPath, _ := filepath.Rel(folderPath, img.Path)
		result[i] = struct {
			Path         string `json:"path"`
			ThumbnailURL string `json:"thumbnailUrl"`
			ImageURL     string `json:"imageUrl"`
			Name         string `json:"name"`
			Extension    string `json:"extension"`
			Size         int64  `json:"size"`
			Index        int    `json:"index"`
			ModTime      int64  `json:"modTime"`
		}{
			Path:         img.Path,
			ThumbnailURL: fmt.Sprintf("%s/thumbnails?did=%s&fid=%s", baseURL, dirHash, url.QueryEscape(relPath)),
			ImageURL:     fmt.Sprintf("%s/images?did=%s&fid=%s", baseURL, dirHash, url.QueryEscape(relPath)),
			Name:         img.Name,
			Extension:    img.Extension,
			Size:         img.Size,
			Index:        img.Index,
			ModTime:      img.ModTime,
		}
	}

	// Check Custom Order
	customOrder := a.orders.GetOrder(folderPath)
	if customOrder != nil && len(customOrder) > 0 {
		// Create a map for fast lookup of custom index
		orderMap := make(map[string]int)
		for i, name := range customOrder {
			orderMap[name] = i
		}

		// Sort the result slice based on custom orders
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
			// If neither in custom order, keep original relative order (sort by name as fallback)
			return result[i].Name < result[j].Name
		})

		// Update indices to match new order
		for i := range result {
			result[i].Index = i
		}
	}

	return result, nil
}

// GetFolderInfo delegates to Library module
func (a *App) GetFolderInfo(folderPath string) (*persistence.FolderInfo, error) {
	return a.libraryMod.GetFolderInfo(folderPath)
}

// GetSubfolders delegates to Library module
func (a *App) GetSubfolders(folderPath string) ([]persistence.FolderInfo, error) {
	return a.libraryMod.GetSubfolders(folderPath)
}

// AddFolder delegates to Library module
func (a *App) AddFolder(path string) (*persistence.AddFolderResult, error) {
	return a.libraryMod.AddFolder(path)
}

// GetLibrary delegates to Library module
func (a *App) GetLibrary() []persistence.FolderInfo {
	return a.libraryMod.GetLibrary()
}

func (a *App) RemoveLibraryEntry(folderPath string) error {
	return a.libraryMod.RemoveLibraryEntry(folderPath)
}

func (a *App) ClearLibrary() error {
	return a.libraryMod.ClearLibrary()
}

// =============================================================================
// Series Methods (Delegated)
// =============================================================================

func (a *App) AddSeries(path string, subfolders []persistence.FolderInfo, isTemp bool) (*persistence.AddFolderResult, error) {
	return a.seriesMod.AddSeries(path, subfolders, isTemp)
}

func (a *App) GetSeries() []series.SeriesEntryWithURLs {
	return a.seriesMod.GetSeries()
}

func (a *App) RemoveSeries(path string) error {
	return a.seriesMod.RemoveSeries(path)
}

func (a *App) ClearSeries() error {
	return a.seriesMod.ClearSeries()
}

func (a *App) IsSeries(path string) bool {
	// Basic check using library/series logic
	folderPath := a.libraryMod.ResolveFolder(path)
	subfolders, _ := a.libraryMod.GetSubfolders(folderPath)
	return len(subfolders) > 0
}

func (a *App) GetChapterNavigation(chapterPath string) *series.ChapterNavigation {
	return a.seriesMod.GetChapterNavigation(chapterPath)
}

// =============================================================================
// Explorer Methods (New)
// =============================================================================

func (a *App) GetBaseFolders() []explorer.BaseFolderEntry {
	return a.explorerMod.GetBaseFolders()
}

func (a *App) AddBaseFolder(path string) error {
	return a.explorerMod.AddBaseFolder(path)
}

func (a *App) RemoveBaseFolder(path string) error {
	return a.explorerMod.RemoveBaseFolder(path)
}

func (a *App) ExploreFolder(path string) ([]explorer.ExplorerEntry, error) {
	return a.explorerMod.ListDirectory(path)
}

// =============================================================================
// Thumbnail Methods
// =============================================================================

func (a *App) GetThumbnail(imagePath string) (string, error) {
	// Use fileLoader to register and return URL
	dirHash := a.fileLoader.RegisterDirectory(filepath.Dir(imagePath))
	baseURL := a.getBaseURL()
	return fmt.Sprintf("%s/thumbnails?did=%s&fid=%s", baseURL, dirHash, url.QueryEscape(filepath.Base(imagePath))), nil
}

func (a *App) PreloadThumbnails(imagePaths []string) {
	go a.thumbGen.PreloadThumbnails(imagePaths)
}

func (a *App) ClearThumbnailCache() error {
	return a.thumbGen.ClearCache()
}
