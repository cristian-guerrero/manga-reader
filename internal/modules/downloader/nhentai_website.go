package downloader

import (
	"fmt"
	"regexp"
	"strings"
)

// NHentaiWebsiteDownloader adds support for nhentai.website by reusing
// the existing NHentaiDownloader logic against nhentai.net.
// It maps gallery URLs like:
//   https://nhentai.website/g/302957
// to:
//   https://nhentai.net/g/302957/
// and then overrides the SiteID so downloads are grouped under
// "nhentai.website" in the download folder and queue.
type NHentaiWebsiteDownloader struct{}

func (d *NHentaiWebsiteDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "nhentai.website")
}

func (d *NHentaiWebsiteDownloader) GetSiteID() string {
	return "nhentai.website"
}

func (d *NHentaiWebsiteDownloader) GetImages(url string) (*SiteInfo, error) {
	// Extract gallery ID from URL path: /g/{id}
	re := regexp.MustCompile(`/g/(\d+)`)
	match := re.FindStringSubmatch(url)
	if len(match) < 2 {
		return nil, fmt.Errorf("could not extract gallery id from URL: %s", url)
	}

	id := match[1]

	// Build canonical nhentai.net URL and reuse existing logic
	canonicalURL := fmt.Sprintf("https://nhentai.net/g/%s/", id)

	baseDownloader := &NHentaiDownloader{}
	info, err := baseDownloader.GetImages(canonicalURL)
	if err != nil {
		return nil, err
	}

	// Group downloads and concurrency under nhentai.website
	info.SiteID = d.GetSiteID()

	return info, nil
}

