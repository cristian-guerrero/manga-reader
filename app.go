package main

import (
	"context"
	"fmt"
	"manga-visor/internal/fileloader"
	"manga-visor/internal/modules/colorizer"
	"manga-visor/internal/modules/downloader"
	"manga-visor/internal/modules/explorer"
	"manga-visor/internal/modules/history"
	"manga-visor/internal/modules/library"
	"manga-visor/internal/modules/series"
	"manga-visor/internal/persistence"
	"manga-visor/internal/services"
	"manga-visor/internal/thumbnails"
	"os"
	"os/exec"
	"path/filepath"
	stdruntime "runtime"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct - Main application structure
type App struct {
	ctx      context.Context
	services *services.Container

	// Modules
	libraryMod    *library.Module
	seriesMod     *series.Module
	historyMod    *history.Module
	explorerMod   *explorer.Module
	downloaderMod *downloader.Module
	colorizerMod  *colorizer.Manager
}

// Convenience getters for backward compatibility
func (a *App) settings() *persistence.SettingsManager {
	return a.services.Settings
}

func (a *App) orders() *persistence.OrdersManager {
	return a.services.Orders
}

func (a *App) fileLoader() *fileloader.FileLoader {
	return a.services.FileLoader
}

func (a *App) thumbGen() *thumbnails.Generator {
	return a.services.ThumbGen
}

func (a *App) imgServer() *fileloader.ImageServer {
	return a.services.ImageServer
}

func (a *App) tabsManager() *persistence.TabsManager {
	return a.services.Tabs
}

func (a *App) viewerStatesManager() *persistence.ViewerStatesManager {
	return a.services.ViewerStates
}

// NewApp creates a new App application struct
func NewApp() *App {
	// Create service container (manages all dependencies)
	container := services.NewContainer()

	// Create modules with their dependencies
	// Note: URLBuilder will be updated after ImageServer starts in startup()
	lMod := library.NewModule(container.Library, container.FileLoader, container.URLBuilder, container.Logger)
	sMod := series.NewModule(container.Series, container.FileLoader, container.URLBuilder, container.Logger)
	hMod := history.NewModule(container.History, container.Settings)
	eMod := explorer.NewModule(container.FileLoader, container.URLBuilder, container.Logger)
	dMod := downloader.NewModule(container.Downloader, container.Settings, container.Logger)

	// Dependency injection (Circular dependency resolution)
	lMod.SetSeriesModule(sMod)

	// Colorizer module (initialized in startup with data dir)
	var cMod *colorizer.Manager

	return &App{
		services:      container,
		libraryMod:    lMod,
		seriesMod:     sMod,
		historyMod:    hMod,
		explorerMod:   eMod,
		downloaderMod: dMod,
		colorizerMod:  cMod,
	}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize services (starts ImageServer and updates URLBuilder)
	if err := a.services.Initialize(ctx); err != nil {
		a.services.Logger.Errorf("Failed to initialize services: %v", err)
		return
	}

	// Update modules with context
	// Note: Modules already have URLBuilder injected, which is now updated with the base URL
	a.libraryMod.SetContext(ctx)
	a.seriesMod.SetContext(ctx)
	a.historyMod.SetContext(ctx)
	a.explorerMod.SetContext(ctx)
	a.downloaderMod.SetContext(ctx)

	// Initialize colorizer module
	homeDir, _ := os.UserHomeDir()
	colorizerDataDir := filepath.Join(homeDir, ".manga-visor", "colorizer")
	a.colorizerMod = colorizer.NewManager(colorizerDataDir, func(progress colorizer.InstallProgress) {
		a.services.Logger.Infof("[Colorizer] %s: %s (%.0f%%)", progress.Status, progress.Message, progress.Percent)
	})
	a.services.Logger.Infof("[Colorizer] Data directory: %s", colorizerDataDir)

	// Restore window position
	settings := a.settings().Get()
	// Validation: Windows often sets coordinates to -32000 when minimized.
	// We ensure coordinates are within a reasonable visible range.
	if settings.WindowX != -1 && settings.WindowY != -1 {
		if settings.WindowX > -10000 && settings.WindowY > -10000 {
			a.services.Logger.Infof("Restoring window position: (%v, %v)", settings.WindowX, settings.WindowY)
			runtime.WindowSetPosition(ctx, settings.WindowX, settings.WindowY)
		} else {
			a.services.Logger.Warnf("Invalid window position detected (%v, %v), ignoring restoration", settings.WindowX, settings.WindowY)
			// Optional: Reset in settings? Not strictly necessary as next save will overwrite
		}
	}
}

// getBaseURL returns the base URL for images and thumbnails
func (a *App) getBaseURL() string {
	if a.services != nil && a.services.ImageServer != nil && a.services.ImageServer.Addr() != "" {
		return a.services.ImageServer.Addr()
	}
	return ""
}

// domReady is called after the frontend dom has been loaded
func (a *App) domReady(ctx context.Context) {
	// Emit event to notify frontend that bindings are ready
	runtime.EventsEmit(ctx, "app_ready")
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	a.services.Logger.Info("Flushing settings to disk...")
	a.settings().Flush()

	// Stop colorizer server if running
	if a.colorizerMod != nil {
		a.colorizerMod.StopServer()
	}

	// Kill any orphaned python.exe processes
	colorizer.CleanupOrphanedPython()
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

	a.settings().Update(updates)
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
	return a.settings().Get()
}

func (a *App) SaveSettings(settings *persistence.Settings) error {
	return a.settings().Save(settings)
}

// =============================================================================
// Tab Persistence Methods
// =============================================================================

func (a *App) GetTabs() *persistence.TabsData {
	return a.tabsManager().GetTabs()
}

func (a *App) SaveTabs(data *persistence.TabsData) error {
	return a.tabsManager().SaveTabs(data)
}

// =============================================================================
// Viewer State Persistence Methods
// =============================================================================

func (a *App) GetViewerState(folderPath string) *persistence.ViewerState {
	return a.viewerStatesManager().GetState(folderPath)
}

func (a *App) SaveViewerState(folderPath string, currentIndex int, verticalWidth int, scrollPosition float64) error {
	return a.viewerStatesManager().UpdateState(folderPath, currentIndex, verticalWidth, scrollPosition)
}

func (a *App) UpdateSettings(updates map[string]interface{}) error {
	return a.settings().Update(updates)
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
	return a.orders().GetOrder(folderPath)
}

func (a *App) SaveImageOrder(folderPath string, customOrder []string, originalOrder []string) error {
	return a.orders().Save(folderPath, customOrder, originalOrder)
}

func (a *App) ResetImageOrder(folderPath string) error {
	return a.orders().Reset(folderPath)
}

func (a *App) HasCustomOrder(folderPath string) bool {
	return a.orders().HasCustomOrder(folderPath)
}

func (a *App) GetOriginalOrder(folderPath string) []string {
	orderData := a.orders().Get(folderPath)
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

func (a *App) GetImages(path string) ([]persistence.ImageInfo, error) {
	images, err := a.libraryMod.GetImages(path, a.settings().Get(), a.orders())
	if err == nil && len(images) > 0 && stdruntime.GOOS == "linux" {
		var paths []string
		for _, img := range images {
			paths = append(paths, img.Path)
		}
		a.imgServer().PreloadConverted(paths)
	}
	return images, err
}

// GetImagesShallow returns a list of images in the specified folder (non-recursive, only immediate directory)
func (a *App) GetImagesShallow(path string) ([]persistence.ImageInfo, error) {
	images, err := a.libraryMod.GetImagesShallow(path, a.settings().Get(), a.orders())
	if err == nil && len(images) > 0 && stdruntime.GOOS == "linux" {
		var paths []string
		for _, img := range images {
			paths = append(paths, img.Path)
		}
		a.imgServer().PreloadConverted(paths)
	}
	return images, err
}

// GetFolderInfo delegates to Library module
func (a *App) GetFolderInfo(folderPath string) (*persistence.FolderInfo, error) {
	return a.libraryMod.GetFolderInfo(folderPath)
}

// GetFolderInfoShallow delegates to Library module for shallow (non-recursive) folder info
func (a *App) GetFolderInfoShallow(folderPath string) (*persistence.FolderInfo, error) {
	return a.libraryMod.GetFolderInfoShallow(folderPath)
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
	dirHash := a.fileLoader().RegisterDirectory(filepath.Dir(imagePath))
	return a.services.URLBuilder.BuildThumbnailURLFromPath(dirHash, imagePath), nil
}

func (a *App) PreloadThumbnails(imagePaths []string) {
	go a.thumbGen().PreloadThumbnails(imagePaths)
}

func (a *App) ClearThumbnailCache() error {
	return a.thumbGen().ClearCache()
}

func (a *App) SetThumbnailsPaused(paused bool) {
	if a.services != nil && a.services.ThumbGen != nil {
		a.services.ThumbGen.SetPaused(paused)
	}
}

// =============================================================================
// Downloader Methods (Delegated)
// =============================================================================

func (a *App) StartDownload(url string, overrideSeries string, overrideChapter string) (string, error) {
	return a.downloaderMod.StartDownload(url, overrideSeries, overrideChapter)
}

func (a *App) GetDownloadHistory() []persistence.DownloadJob {
	return a.downloaderMod.GetHistory()
}

func (a *App) ClearDownloadHistory() {
	a.downloaderMod.ClearHistory()
}

func (a *App) RemoveDownloadJob(id string) {
	a.downloaderMod.RemoveJob(id)
}

func (a *App) FetchMangaInfo(url string) (*downloader.SiteInfo, error) {
	return a.downloaderMod.FetchMangaInfo(url)
}

func (a *App) ResumeIncompleteDownloads(autoResume bool) error {
	return a.downloaderMod.ResumeIncompleteDownloads(autoResume)
}

// OpenInFileManager opens a path in the system's file manager
func (a *App) OpenInFileManager(path string) error {
	var cmd *exec.Cmd
	switch stdruntime.GOOS {
	case "windows":
		// explorer on Windows
		cmd = exec.Command("explorer", path)
	case "darwin":
		// open on macOS
		cmd = exec.Command("open", path)
	default:
		// xdg-open on Linux
		cmd = exec.Command("xdg-open", path)
	}
	return cmd.Start()
}

// AddDownloadedFolder adds a downloaded folder (chapter) to OneShot and returns the path
// Used when clicking Play on an individual chapter in the download manager
func (a *App) AddDownloadedFolder(downloadPath string) (string, error) {
	// Check if the path exists
	info, err := os.Stat(downloadPath)
	if err != nil {
		return "", fmt.Errorf("path not found: %v", err)
	}
	if !info.IsDir() {
		downloadPath = filepath.Dir(downloadPath)
	}

	// Add the specific folder/chapter to oneshot
	_, err = a.libraryMod.AddFolder(downloadPath)
	if err != nil {
		return "", err
	}
	return downloadPath, nil
}

// AddDownloadedSeries adds a downloaded series (parent folder with chapters) to Series
// Used when clicking Play on a series header in the download manager
func (a *App) AddDownloadedSeries(chapterPath string) (string, error) {
	// Get the parent folder (series folder)
	seriesPath := filepath.Dir(chapterPath)

	// Check if the series path exists
	info, err := os.Stat(seriesPath)
	if err != nil {
		return "", fmt.Errorf("series path not found: %v", err)
	}
	if !info.IsDir() {
		return "", fmt.Errorf("series path is not a directory")
	}

	// Get subfolders (chapters)
	subfolders, err := a.libraryMod.GetSubfolders(seriesPath)
	if err != nil {
		return "", err
	}

	if len(subfolders) == 0 {
		return "", fmt.Errorf("no chapters found in series folder")
	}

	// Add as series
	_, err = a.seriesMod.AddSeries(seriesPath, subfolders, false)
	if err != nil {
		return "", err
	}

	return seriesPath, nil
}

// ClearAllData wipes all application data (cache, history, library, etc.)
func (a *App) ClearAllData() error {
	a.services.Logger.Info("Clearing all application data...")

	// 1. Clear History
	if err := a.historyMod.ClearHistory(); err != nil {
		a.services.Logger.Errorf("Failed to clear history: %v", err)
	}

	// 2. Clear Library
	if err := a.libraryMod.ClearLibrary(); err != nil {
		a.services.Logger.Errorf("Failed to clear library: %v", err)
	}

	// 3. Clear Series
	if err := a.seriesMod.ClearSeries(); err != nil {
		a.services.Logger.Errorf("Failed to clear series: %v", err)
	}

	// 4. Clear Thumbnails
	if err := a.thumbGen().ClearCache(); err != nil {
		a.services.Logger.Errorf("Failed to clear thumbnails: %v", err)
	}

	// 5. Clear Downloads (History + Files)
	if err := a.downloaderMod.ClearDownloadsData(); err != nil {
		a.services.Logger.Errorf("Failed to clear downloads: %v", err)
	}

	// 6. Clear Explorer Folders
	if err := a.explorerMod.ClearBaseFolders(); err != nil {
		a.services.Logger.Errorf("Failed to clear explorer folders: %v", err)
	}

	// 7. Clear Converted Images Cache
	if a.services != nil && a.services.ImageServer != nil {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			homeDir = "."
		}
		convertedCacheDir := filepath.Join(homeDir, ".manga-visor", "cache", "converted")
		if err := os.RemoveAll(convertedCacheDir); err != nil {
			a.services.Logger.Errorf("Failed to clear converted images cache: %v", err)
		} else {
			os.MkdirAll(convertedCacheDir, 0755)
		}
	}

	// 8. Reset specific settings (LastPage, LastFolder)
	updates := map[string]interface{}{
		"lastPage":   "home",
		"lastFolder": "",
	}
	a.settings().Update(updates)

	a.services.Logger.Info("All data cleared successfully")
	return nil
}

// UpdateTaskbarIcon dynamically changes the Windows taskbar icon
// Implementation is in app_windows.go for Windows, and app_other.go for other platforms
func (a *App) UpdateTaskbarIcon(base64Data string) {
	updateTaskbarIconImpl(a, base64Data)
}

// =============================================================================
// Colorizer Methods
// =============================================================================

// ColorizerGetStatus returns the current installation/status state
func (a *App) ColorizerGetStatus() colorizer.InstallProgress {
	if a.colorizerMod == nil {
		return colorizer.InstallProgress{
			Status:  colorizer.StatusNotInstalled,
			Message: "Colorizer module not initialized",
			Percent: 0,
		}
	}
	return a.colorizerMod.GetStatus()
}

// ColorizerInstall starts the installation process (downloads Python + backend + deps)
func (a *App) ColorizerInstall() error {
	if a.colorizerMod == nil {
		return fmt.Errorf("colorizer module not initialized")
	}
	return a.colorizerMod.Install()
}

// ColorizerStartServer starts the Flask colorizer server
func (a *App) ColorizerStartServer() error {
	if a.colorizerMod == nil {
		return fmt.Errorf("colorizer module not initialized")
	}
	return a.colorizerMod.StartServer()
}

// ColorizerStopServer stops the Flask colorizer server
func (a *App) ColorizerStopServer() error {
	if a.colorizerMod == nil {
		return fmt.Errorf("colorizer module not initialized")
	}
	return a.colorizerMod.StopServer()
}

// ColorizerRestartServer stops and restarts the Flask colorizer server
func (a *App) ColorizerRestartServer() error {
	if a.colorizerMod == nil {
		return fmt.Errorf("colorizer module not initialized")
	}
	if err := a.colorizerMod.StopServer(); err != nil {
		fmt.Printf("[Colorizer] Warning: failed to stop server: %v\n", err)
	}
	time.Sleep(500 * time.Millisecond)
	return a.colorizerMod.StartServer()
}

// ColorizerIsRunning checks if the colorizer server is currently running
func (a *App) ColorizerIsRunning() bool {
	if a.colorizerMod == nil {
		return false
	}
	return a.colorizerMod.IsRunning()
}

// ColorizerIsInstalled checks if the colorizer is installed (Python + backend)
func (a *App) ColorizerIsInstalled() bool {
	if a.colorizerMod == nil {
		return false
	}
	return a.colorizerMod.IsInstalled()
}

// ColorizerHealthCheck performs a health check on the colorizer server
func (a *App) ColorizerHealthCheck() bool {
	if a.colorizerMod == nil {
		return false
	}
	return a.colorizerMod.HealthCheck()
}

// ColorizerGetServerURL returns the URL of the running colorizer server
func (a *App) ColorizerGetServerURL() string {
	if a.colorizerMod == nil {
		return ""
	}
	return a.colorizerMod.GetServerURL()
}

// ColorizeImage sends an image to the colorizer server for processing
func (a *App) ColorizeImage(imagePath string, colorize, upscale, denoise bool, denoiseSigma, upscaleFactor int) (*colorizer.ColorizeResponse, error) {
	if a.colorizerMod == nil {
		return nil, fmt.Errorf("colorizer module not initialized")
	}
	if !a.colorizerMod.IsRunning() {
		return nil, fmt.Errorf("colorizer server is not running")
	}

	req := colorizer.ColorizeRequest{
		ImagePath:     imagePath,
		Colorize:      colorize,
		Upscale:       upscale,
		Denoise:       denoise,
		DenoiseSigma:  denoiseSigma,
		UpscaleFactor: upscaleFactor,
	}

	return a.colorizerMod.ColorizeImage(req)
}

// LoadImageAsBase64 reads an image file and returns it as a base64 data URI for frontend preview
func (a *App) LoadImageAsBase64(imagePath string) (string, error) {
	if a.colorizerMod == nil {
		return "", fmt.Errorf("colorizer module not initialized")
	}
	return a.colorizerMod.LoadImageAsBase64(imagePath)
}
