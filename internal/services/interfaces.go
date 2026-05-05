package services

import (
	"context"
	"manga-visor/internal/fileloader"
	"manga-visor/internal/persistence"
)

// ImageServerInterface defines the interface for image server operations
type ImageServerInterface interface {
	Start() error
	Addr() string
	PreloadConverted(imagePaths []string)
}

// FileLoaderInterface defines the interface for file loading operations
type FileLoaderInterface interface {
	RegisterDirectory(dirPath string) string
	GetDirectory(hash string) (string, bool)
	GetImages(folderPath string) ([]fileloader.ImageInfo, error)
	GetImagesShallow(folderPath string) ([]fileloader.ImageInfo, error)
	IsSupportedImage(filename string) bool
	GetMimeType(filename string) string
	FindFirstImage(folderPath string) (string, bool)
	FindFirstImageShallow(folderPath string) (string, bool)
	GetShallowImageCount(folderPath string) int
	HasSubdirectories(folderPath string) bool
	GetSubdirectoryCount(folderPath string) int
}

// URLBuilderInterface defines the interface for URL construction
type URLBuilderInterface interface {
	SetBaseURL(baseURL string)
	BuildImageURL(dirHash, filename string) string
	BuildThumbnailURL(dirHash, filename string) string
	BuildThumbnailURLFromPath(dirHash, fullPath string) string
	BuildImageURLFromPath(dirHash, dirPath, fullPath string) string
}

// SettingsManagerInterface defines the interface for settings management
type SettingsManagerInterface interface {
	Get() *persistence.Settings
	Save(settings *persistence.Settings) error
	Update(updates map[string]interface{}) error
	Flush()
}

// LibraryManagerInterface defines the interface for library management
type LibraryManagerInterface interface {
	Add(entry persistence.LibraryEntry) error
	Get(folderPath string) *persistence.LibraryEntry
	GetAll() []persistence.LibraryEntry
	Remove(folderPath string) error
	Clear() error
}

// SeriesManagerInterface defines the interface for series management
type SeriesManagerInterface interface {
	Add(entry persistence.SeriesEntry) error
	Get(id string) *persistence.SeriesEntry
	GetAll() []persistence.SeriesEntry
	Remove(path string) error
	Clear() error
}

// HistoryManagerInterface defines the interface for history management
type HistoryManagerInterface interface {
	Add(entry persistence.HistoryEntry) error
	Get(folderPath string) *persistence.HistoryEntry
	GetAll() []persistence.HistoryEntry
	Remove(folderPath string) error
	Clear() error
}

// OrdersManagerInterface defines the interface for image order management
type OrdersManagerInterface interface {
	Get(folderPath string) *persistence.ImageOrder
	GetOrder(folderPath string) []string
	Save(folderPath string, customOrder []string, originalOrder []string) error
	Reset(folderPath string) error
	HasCustomOrder(folderPath string) bool
}

// LoggerInterface defines the interface for logging operations
type LoggerInterface interface {
	Debugf(format string, args ...interface{})
	Infof(format string, args ...interface{})
	Warnf(format string, args ...interface{})
	Errorf(format string, args ...interface{})
}

// ContextProvider provides access to the application context
type ContextProvider interface {
	Context() context.Context
}
