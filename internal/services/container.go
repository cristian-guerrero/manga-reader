package services

import (
	"context"
	"manga-visor/internal/fileloader"
	"manga-visor/internal/persistence"
	"manga-visor/internal/thumbnails"
)

// Container holds all application services and provides dependency injection
type Container struct {
	// Core Services
	FileLoader  *fileloader.FileLoader
	ThumbGen    *thumbnails.Generator
	ImageServer *fileloader.ImageServer
	URLBuilder  *URLBuilder
	Logger      *Logger

	// Persistence Managers
	Settings     *persistence.SettingsManager
	History      *persistence.HistoryManager
	Library      *persistence.LibraryManager
	Series       *persistence.SeriesManager
	Orders       *persistence.OrdersManager
	Downloader   *persistence.DownloaderManager
	Tabs         *persistence.TabsManager
	ViewerStates *persistence.ViewerStatesManager

	// Context (set after startup)
	ctx context.Context
}

// NewContainer creates a new service container with all dependencies initialized
func NewContainer() *Container {
	// Logger (initialize first so other services can use it)
	logger := NewLogger(LogLevelInfo)

	// Core services
	// Create logger adapter for fileloader (to avoid import cycle)
	loggerAdapter := &loggerAdapter{logger: logger}
	fileLoader := fileloader.NewFileLoader(loggerAdapter)
	thumbGen := thumbnails.NewGenerator()
	urlBuilder := NewURLBuilder("") // Base URL will be set after ImageServer starts

	// Persistence managers
	settings := persistence.NewSettingsManager()
	history := persistence.NewHistoryManager()
	library := persistence.NewLibraryManager()
	series := persistence.NewSeriesManager()
	orders := persistence.NewOrdersManager()
	downloader := persistence.NewDownloaderManager()
	tabs := persistence.NewTabsManager()
	viewerStates := persistence.NewViewerStatesManager()

	// Image server (not started yet, will be started in Initialize)
	imageServer := fileloader.NewImageServer(fileLoader, thumbGen, loggerAdapter)

	return &Container{
		FileLoader:   fileLoader,
		ThumbGen:     thumbGen,
		ImageServer:  imageServer,
		URLBuilder:   urlBuilder,
		Logger:       logger,
		Settings:     settings,
		History:      history,
		Library:      library,
		Series:       series,
		Orders:       orders,
		Downloader:   downloader,
		Tabs:         tabs,
		ViewerStates: viewerStates,
	}
}

// Initialize starts services that require initialization (like ImageServer)
func (c *Container) Initialize(ctx context.Context) error {
	c.ctx = ctx

	c.Logger.Info("Initializing services...")

	// Start image server
	if err := c.ImageServer.Start(); err != nil {
		c.Logger.Errorf("Failed to start image server: %v", err)
		return err
	}

	// Update URL builder with the server address
	c.URLBuilder.SetBaseURL(c.ImageServer.Addr)
	c.Logger.Infof("Image server started on %s", c.ImageServer.Addr)

	c.Logger.Info("Services initialized successfully")
	return nil
}

// Context returns the application context
func (c *Container) Context() context.Context {
	return c.ctx
}

// loggerAdapter adapts services.Logger to fileloader.LoggerInterface
type loggerAdapter struct {
	logger *Logger
}

func (a *loggerAdapter) Debugf(format string, args ...interface{}) {
	a.logger.Debugf(format, args...)
}

func (a *loggerAdapter) Infof(format string, args ...interface{}) {
	a.logger.Infof(format, args...)
}

func (a *loggerAdapter) Warnf(format string, args ...interface{}) {
	a.logger.Warnf(format, args...)
}

func (a *loggerAdapter) Errorf(format string, args ...interface{}) {
	a.logger.Errorf(format, args...)
}
