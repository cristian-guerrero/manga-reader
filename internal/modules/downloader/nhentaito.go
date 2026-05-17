package downloader

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type NHentaiToDownloader struct{}

func (d *NHentaiToDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "nhentai.to")
}

func (d *NHentaiToDownloader) GetSiteID() string {
	return "nhentai.to"
}

func (d *NHentaiToDownloader) NormalizeURL(url string) string {
	url = strings.TrimSuffix(url, "/")

	// Strip page number from reader URLs: /g/123/1/ -> /g/123/
	rePage := regexp.MustCompile(`(/g/\d+)/\d+$`)
	if match := rePage.FindStringSubmatch(url); len(match) > 1 {
		return fmt.Sprintf("https://nhentai.to%s/", match[1])
	}

	// Handle gallery URLs: /gallery/123/ -> /g/123/
	reGallery := regexp.MustCompile(`nhentai\.to/gallery/(\d+)`)
	if match := reGallery.FindStringSubmatch(url); len(match) > 1 {
		return fmt.Sprintf("https://nhentai.to/g/%s/", match[1])
	}

	// If it's already /g/{id}/, ensure trailing slash
	if strings.Contains(url, "/g/") {
		reG := regexp.MustCompile(`nhentai\.to/g/\d+$`)
		if reG.MatchString(url) {
			return url + "/"
		}
	}

	return url
}

func (d *NHentaiToDownloader) GetImages(url string) (*SiteInfo, error) {
	url = strings.TrimSuffix(url, "/") + "/"

	reURL := regexp.MustCompile(`nhentai\.to/g/(\d+)/`)
	match := reURL.FindStringSubmatch(url)
	if len(match) < 2 {
		return nil, fmt.Errorf("invalid nhentai.to URL format")
	}

	galleryID := match[1]
	galleryURL := fmt.Sprintf("https://nhentai.to/g/%s/", galleryID)

	client := &http.Client{Timeout: 30 * time.Second}

	req, err := http.NewRequest("GET", galleryURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Referer", "https://nhentai.to/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch page: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch page, status code: %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	bodyStr := string(bodyBytes)

	// Extract media_id from thumbnail data-src
	// e.g. data-src="https://zrocdn.xyz/galleries/2857059/1t.jpg"
	reMediaID := regexp.MustCompile(`data-src=["']https://[^/]+/galleries/(\d+)/\d+t\.\w+["']`)
	mediaIDMatch := reMediaID.FindStringSubmatch(bodyStr)
	if len(mediaIDMatch) < 2 {
		return nil, fmt.Errorf("could not extract media_id from page")
	}
	mediaID := mediaIDMatch[1]

	// Extract page count from "Pages: XX" text
	numPages := 0
	rePages := regexp.MustCompile(`Pages:\s*(\d+)`)
	if pagesMatch := rePages.FindStringSubmatch(bodyStr); len(pagesMatch) > 1 {
		fmt.Sscanf(pagesMatch[1], "%d", &numPages)
	}

	// Fallback: count thumbnails
	if numPages == 0 {
		reThumbCount := regexp.MustCompile(`data-src=["']https://[^/]+/galleries/\d+/(\d+)t\.\w+["']`)
		thumbMatches := reThumbCount.FindAllStringSubmatch(bodyStr, -1)
		if len(thumbMatches) > 0 {
			numPages = len(thumbMatches)
		}
	}

	if numPages == 0 {
		return nil, fmt.Errorf("could not determine number of pages")
	}

	// Extract title from <h1>
	title := fmt.Sprintf("Gallery %s", galleryID)
	reTitle := regexp.MustCompile(`<h1[^>]*>(.*?)</h1>`)
	if titleMatch := reTitle.FindStringSubmatch(bodyStr); len(titleMatch) > 1 {
		title = strings.TrimSpace(titleMatch[1])
	}

	// Build image URLs
	images := make([]ImageDownload, numPages)
	imageHost := "https://zrocdn.xyz"
	for pageNum := 1; pageNum <= numPages; pageNum++ {
		imageURL := fmt.Sprintf("%s/galleries/%s/%d.jpg", imageHost, mediaID, pageNum)

		images[pageNum-1] = ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d.jpg", pageNum),
			Index:    pageNum - 1,
			Headers: map[string]string{
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
				"Referer":    "https://nhentai.to/",
			},
		}
	}

	return &SiteInfo{
		SeriesName:    title,
		ChapterName:   "",
		Images:        images,
		SiteID:        d.GetSiteID(),
		DownloadDelay: 200 * time.Millisecond,
		Type:          "single",
	}, nil
}
