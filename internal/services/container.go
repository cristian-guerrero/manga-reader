package services

import (
	"context"
	"fmt"
	"manga-visor/internal/database"
	"manga-visor/internal/fileloader"
	"manga-visor/internal/modules/librarymanager"
	"manga-visor/internal/thumbnails"
	"os"
	"path/filepath"
)

type Container struct {
	// Core Services
	FileLoader     *fileloader.FileLoader
	ThumbGen       *thumbnails.Generator
	ImageServer    *fileloader.ImageServer
	URLBuilder     *URLBuilder
	Logger         *Logger
	LibraryManager *librarymanager.Module

	// Active Database (the currently open library DB containing ALL data)
	DB *database.Database

	// All Repositories (point to the active DB, switched together)
	Settings        *database.SettingsRepository
	UIPreferences   *database.UIPreferencesRepository
	Library         *database.LibraryRepository
	History         *database.HistoryRepository
	Series          *database.SeriesRepository
	Explorer        *database.ExplorerRepository
	Orders          *database.ImageOrdersRepository
	FolderOrders    *database.FolderOrdersRepository
	FolderViewModes *database.FolderViewModeRepository
	FolderGridSizes *database.FolderGridSizeRepository
	Downloader      *database.DownloaderRepository
	Tabs            *database.TabsRepository
	ViewerStates    *database.ViewerStatesRepository

	ctx context.Context
}

func NewContainer() *Container {
	logger := NewLogger(LogLevelInfo)

	loggerAdapter := &loggerAdapter{logger: logger}
	fileLoader := fileloader.NewFileLoader(loggerAdapter)
	thumbGen := thumbnails.NewGenerator()
	urlBuilder := NewURLBuilder("")

	dataDir := getDataDir()

	// Initialize the library registry (JSON file)
	libManager := librarymanager.NewModule(dataDir)

	// Ensure default library entry exists in the registry
	if err := libManager.EnsureDefault(); err != nil {
		logger.Errorf("Failed to ensure default library: %v", err)
	}

	// Open the active library database
	activeLib := libManager.Get(libManager.GetActiveID())
	if activeLib == nil {
		activeLib = libManager.GetDefault()
	}
	db, err := database.NewLibraryDB(dataDir, activeLib.Filename)
	if err != nil {
		logger.Errorf("Failed to open library database: %v", err)
	}

	// Create ALL repos pointing to the one active DB
	settings := database.NewSettingsRepository(db)
	uiPrefs := database.NewUIPreferencesRepository(db)
	library := database.NewLibraryRepository(db)
	history := database.NewHistoryRepository(db)
	series := database.NewSeriesRepository(db)
	explorer := database.NewExplorerRepository(db)
	orders := database.NewImageOrdersRepository(db)
	folderOrders := database.NewFolderOrdersRepository(db)
	folderViewModes := database.NewFolderViewModeRepository(db)
	folderGridSizes := database.NewFolderGridSizeRepository(db)
	downloader := database.NewDownloaderRepository(db)
	tabs := database.NewTabsRepository(db)
	viewerStates := database.NewViewerStatesRepository(db)

	imageServer := fileloader.NewImageServer(fileLoader, thumbGen, loggerAdapter, func() bool {
		return settings.Get().GenerateThumbnails
	})

	return &Container{
		FileLoader:      fileLoader,
		ThumbGen:        thumbGen,
		ImageServer:     imageServer,
		URLBuilder:      urlBuilder,
		Logger:          logger,
		LibraryManager:  libManager,
		DB:              db,
		Settings:        settings,
		UIPreferences:   uiPrefs,
		Library:         library,
		History:         history,
		Series:          series,
		Explorer:        explorer,
		Orders:          orders,
		FolderOrders:    folderOrders,
		FolderViewModes: folderViewModes,
		FolderGridSizes: folderGridSizes,
		Downloader:      downloader,
		Tabs:            tabs,
		ViewerStates:    viewerStates,
	}
}

func (c *Container) Initialize(ctx context.Context) error {
	c.ctx = ctx
	c.Logger.Info("Initializing services...")
	if err := c.ImageServer.Start(); err != nil {
		c.Logger.Errorf("Failed to start image server: %v", err)
		return err
	}
	c.URLBuilder.SetBaseURL(c.ImageServer.Addr())
	c.Logger.Infof("Image server started on %s", c.ImageServer.Addr())
	c.Logger.Info("Services initialized successfully")
	return nil
}

func (c *Container) Context() context.Context {
	return c.ctx
}

func (c *Container) Shutdown() {
	if c.DB != nil {
		if err := c.DB.Close(); err != nil {
			c.Logger.Errorf("Error closing database: %v", err)
		}
	}
}

// SwitchLibrary switches to a different library database
func (c *Container) SwitchLibrary(libID string) error {
	lib := c.LibraryManager.Get(libID)
	if lib == nil {
		return fmt.Errorf("library not found: %s", libID)
	}

	newDB, err := database.NewLibraryDB(c.DB.DataDir(), lib.Filename)
	if err != nil {
		return fmt.Errorf("open library database: %w", err)
	}

	// Close previous DB
	oldDB := c.DB
	c.DB = newDB

	// Switch ALL repos to new DB
	c.Settings.SetDB(newDB)
	c.UIPreferences.SetDB(newDB)
	c.Library.SetDB(newDB)
	c.History.SetDB(newDB)
	c.Series.SetDB(newDB)
	c.Explorer.SetDB(newDB)
	c.Orders.SetDB(newDB)
	c.FolderOrders.SetDB(newDB)
	c.FolderViewModes.SetDB(newDB)
	c.FolderGridSizes.SetDB(newDB)
	c.Downloader.SetDB(newDB)
	c.Tabs.SetDB(newDB)
	c.ViewerStates.SetDB(newDB)

	// Reload all repos from new DB
	repos := []struct {
		name string
		load func() error
	}{
		{"settings", c.Settings.Load},
		{"library", c.Library.Load},
		{"history", c.History.Load},
		{"series", c.Series.Load},
		{"explorer", c.Explorer.Load},
		{"orders", c.Orders.Load},
		{"folder_orders", c.FolderOrders.Load},
		{"folder_view_modes", c.FolderViewModes.Load},
		{"folder_grid_sizes", c.FolderGridSizes.Load},
		{"downloader", c.Downloader.Load},
		{"tabs", c.Tabs.Load},
		{"viewer_states", c.ViewerStates.Load},
	}
	for _, r := range repos {
		if err := r.load(); err != nil {
			c.Logger.Warnf("Failed to reload %s: %v", r.name, err)
		}
	}

	// Save active library to JSON registry
	if err := c.LibraryManager.SetActiveID(libID); err != nil {
		c.Logger.Warnf("Failed to save active library: %v", err)
	}

	// Close previous DB
	if oldDB != nil && oldDB != newDB {
		oldDB.Close()
	}

	c.Logger.Infof("Switched to library: %s", lib.Name)
	return nil
}

func getDataDir() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "."
	}
	dir := filepath.Join(homeDir, ".manga-visor")
	os.MkdirAll(dir, 0755)
	return dir
}

type loggerAdapter struct {
	logger *Logger
}

func (a *loggerAdapter) Debugf(format string, args ...interface{})  { a.logger.Debugf(format, args...) }
func (a *loggerAdapter) Infof(format string, args ...interface{})   { a.logger.Infof(format, args...) }
func (a *loggerAdapter) Warnf(format string, args ...interface{})   { a.logger.Warnf(format, args...) }
func (a *loggerAdapter) Errorf(format string, args ...interface{}) { a.logger.Errorf(format, args...) }
