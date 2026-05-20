package services

import (
	"context"
	"manga-visor/internal/database"
	"manga-visor/internal/fileloader"
	"manga-visor/internal/thumbnails"
	"os"
	"path/filepath"
)

type Container struct {
	// Core Services
	FileLoader  *fileloader.FileLoader
	ThumbGen    *thumbnails.Generator
	ImageServer *fileloader.ImageServer
	URLBuilder  *URLBuilder
	Logger      *Logger

	// Database
	DB *database.Database

	// Persistence Repositories
	Settings        *database.SettingsRepository
	History         *database.HistoryRepository
	Library         *database.LibraryRepository
	Series          *database.SeriesRepository
	Explorer        *database.ExplorerRepository
	Orders          *database.ImageOrdersRepository
	FolderOrders    *database.FolderOrdersRepository
	FolderViewModes *database.FolderViewModeRepository
	FolderGridSizes *database.FolderGridSizeRepository
	Downloader      *database.DownloaderRepository
	Tabs            *database.TabsRepository
	ViewerStates    *database.ViewerStatesRepository
	UIPreferences   *database.UIPreferencesRepository

	ctx context.Context
}

func NewContainer() *Container {
	logger := NewLogger(LogLevelInfo)

	loggerAdapter := &loggerAdapter{logger: logger}
	fileLoader := fileloader.NewFileLoader(loggerAdapter)
	thumbGen := thumbnails.NewGenerator()
	urlBuilder := NewURLBuilder("")

	dataDir := getDataDir()

	db, err := database.New(dataDir)
	if err != nil {
		logger.Errorf("Failed to initialize database: %v", err)
	}

	settings := database.NewSettingsRepository(db)
	history := database.NewHistoryRepository(db)
	library := database.NewLibraryRepository(db)
	series := database.NewSeriesRepository(db)
	explorer := database.NewExplorerRepository(db)
	orders := database.NewImageOrdersRepository(db)
	folderOrders := database.NewFolderOrdersRepository(db)
	folderViewModes := database.NewFolderViewModeRepository(db)
	folderGridSizes := database.NewFolderGridSizeRepository(db)
	downloader := database.NewDownloaderRepository(db)
	tabs := database.NewTabsRepository(db)
	viewerStates := database.NewViewerStatesRepository(db)
	uiPrefs := database.NewUIPreferencesRepository(db)

	imageServer := fileloader.NewImageServer(fileLoader, thumbGen, loggerAdapter, func() bool {
		return settings.Get().GenerateThumbnails
	})

	return &Container{
		FileLoader:      fileLoader,
		ThumbGen:        thumbGen,
		ImageServer:     imageServer,
		URLBuilder:      urlBuilder,
		Logger:          logger,
		DB:              db,
		Settings:        settings,
		History:         history,
		Library:         library,
		Series:          series,
		Explorer:        explorer,
		Orders:          orders,
		FolderOrders:    folderOrders,
		FolderViewModes: folderViewModes,
		FolderGridSizes: folderGridSizes,
		Downloader:      downloader,
		Tabs:            tabs,
		ViewerStates:    viewerStates,
		UIPreferences:   uiPrefs,
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
