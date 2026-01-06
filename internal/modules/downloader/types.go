package downloader

import "time"

type ImageDownload struct {
	URL      string
	Filename string
	Index    int
	Headers  map[string]string
}

type ChapterInfo struct {
	ID        string
	Name      string
	URL       string
	Date      string
	ScanGroup string
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
}

type DownloaderInterface interface {
	CanHandle(url string) bool
	GetImages(url string) (*SiteInfo, error)
	GetSiteID() string
}
