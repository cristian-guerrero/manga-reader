package downloader

import "time"

type ImageDownload struct {
	URL         string
	Filename    string
	Index       int
	Headers     map[string]string
	SkipHeaders bool // When true, no headers will be sent (required for some CDNs like MangaDex)
	// Original filename from the source (needed for URL refresh on some sites)
	SourceFilename string
}

type ChapterInfo struct {
	ID        string
	Name      string
	URL       string
	Date      string
	ScanGroup string
	Language  string
}

type SiteInfo struct {
	SeriesName    string
	ChapterName   string
	Images        []ImageDownload
	SiteID        string
	DownloadDelay time.Duration
	// New fields for series support
	Type     string // "single" or "series"
	Chapters []ChapterInfo
	// Extra data for downloaders that need to refresh URLs (e.g., MangaDex chapter ID)
	Extra map[string]string
}

type DownloaderInterface interface {
	CanHandle(url string) bool
	GetImages(url string) (*SiteInfo, error)
	GetSiteID() string
}
