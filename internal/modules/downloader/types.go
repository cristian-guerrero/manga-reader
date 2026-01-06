package downloader

type ImageDownload struct {
	URL      string
	Filename string
	Index    int
}

type SiteInfo struct {
	SeriesName  string
	ChapterName string
	Images      []ImageDownload
	SiteID      string
}

type DownloaderInterface interface {
	CanHandle(url string) bool
	GetImages(url string) (*SiteInfo, error)
	GetSiteID() string
}
