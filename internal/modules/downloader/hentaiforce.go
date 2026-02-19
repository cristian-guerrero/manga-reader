package downloader

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

type HentaiforceDownloader struct{}

func (d *HentaiforceDownloader) CanHandle(url string) bool {
	// gallery: https://hentaiforce.net/view/75850
	// reader: https://hentaiforce.net/view/75850/1
	return strings.Contains(url, "hentaiforce.net")
}

func (d *HentaiforceDownloader) GetSiteID() string {
	return "hentaiforce.net"
}

func (d *HentaiforceDownloader) GetImages(url string) (*SiteInfo, error) {
	if !strings.Contains(url, "/view/") {
		return d.getSeriesInfo(url)
	}

	bodyStr, err := d.fetchPage(url)
	if err != nil {
		return nil, err
	}

	// Attempt to extract title
	title := "HentaiForce"
	reTitle := regexp.MustCompile(`(?s)<h[12][^>]*class="[^"]*font-weight-bold[^"]*"[^>]*>(.*?)</h[12]>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	if len(titleMatch) > 1 {
		title = strings.TrimSpace(titleMatch[1])
	} else {
		reTitleFallback := regexp.MustCompile(`<title>(.*?)</title>`)
		titleMatchFallback := reTitleFallback.FindStringSubmatch(bodyStr)
		if len(titleMatchFallback) > 1 {
			title = strings.TrimSuffix(titleMatchFallback[1], " - HentaiForce")
			title = strings.TrimSuffix(title, " - Page 1") // In case it's a reader page
			title = strings.TrimSpace(title)
		}
	}

	// Find the internal ID and server
	// Pattern: data-src="https://m1.hentaiforce.net/img/256939-cover.jpg"
	// or data-src="https://m1.hentaiforce.net/img/256939-1t.jpg"
	reImageBase := regexp.MustCompile(`https://(m\d+)\.hentaiforce\.net/img/(\d+)-(cover|\d+t)\.jpg`)
	match := reImageBase.FindStringSubmatch(bodyStr)

	if len(match) < 3 {
		return nil, fmt.Errorf("could not find internal image mapping in the page")
	}

	server := match[1]
	internalID := match[2]

	// Find page count
	// Pattern: Pages: 20
	rePages := regexp.MustCompile(`Pages:\s*(\d+)`)
	pagesMatch := rePages.FindStringSubmatch(bodyStr)
	pageCount := 0
	if len(pagesMatch) > 1 {
		pageCount, _ = strconv.Atoi(pagesMatch[1])
	}

	// Fallback page count from thumbnails
	if pageCount == 0 {
		reThumbnails := regexp.MustCompile(`img/\d+-(\d+)t\.jpg`)
		matches := reThumbnails.FindAllStringSubmatch(bodyStr, -1)
		maxPage := 0
		for _, m := range matches {
			p, _ := strconv.Atoi(m[1])
			if p > maxPage {
				maxPage = p
			}
		}
		pageCount = maxPage
	}

	if pageCount == 0 {
		return nil, fmt.Errorf("could not determine page count")
	}

	var images []ImageDownload
	for i := 1; i <= pageCount; i++ {
		// Assumption: most images are .jpg. If we needed to be 100% sure we'd need the readerPages JSON
		// which requires another request if not present. For now, .jpg is the standard for this site.
		imageURL := fmt.Sprintf("https://%s.hentaiforce.net/img/%s-%d.jpg", server, internalID, i)
		images = append(images, ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d.jpg", i),
			Index:    i,
			Headers: map[string]string{
				"Referer":    url,
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
			},
		})
	}

	return &SiteInfo{
		SeriesName:  title,
		ChapterName: "", // HentaiForce entries are usually single chapters
		SiteID:      "hentaiforce.net",
		Images:      images,
		Type:        "single",
	}, nil
}

func (d *HentaiforceDownloader) getSeriesInfo(url string) (*SiteInfo, error) {
	bodyStr, err := d.fetchPage(url)
	if err != nil {
		return nil, err
	}

	// Extract artist/list title
	title := "HentaiForce Series"
	reTitle := regexp.MustCompile(`<title>(.*?)</title>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	if len(titleMatch) > 1 {
		title = strings.TrimSuffix(titleMatch[1], " - HentaiForce")
		title = strings.TrimSuffix(title, " Hentai Manga & Hentai Comic")
		title = strings.TrimSpace(title)
	}

	// Extract gallery links
	// Pattern: <div class="gallery-name"> <h2> <a href="..."> TITLE </a>
	reGallery := regexp.MustCompile(`(?s)<div class="gallery-name">\s*<h2>\s*<a href="([^"]+)">\s*(.*?)\s*</a>`)
	matches := reGallery.FindAllStringSubmatch(bodyStr, -1)

	var chapters []ChapterInfo
	for _, m := range matches {
		galleryURL := m[1]
		galleryTitle := strings.TrimSpace(m[2])
		// Extract IDs
		reID := regexp.MustCompile(`/view/(\d+)`)
		idMatch := reID.FindStringSubmatch(galleryURL)
		id := ""
		if len(idMatch) > 1 {
			id = idMatch[1]
		}

		chapters = append(chapters, ChapterInfo{
			ID:   id,
			Name: galleryTitle,
			URL:  galleryURL,
		})
	}

	if len(chapters) == 0 {
		return nil, fmt.Errorf("could not find any galleries in this list")
	}

	return &SiteInfo{
		SeriesName: title,
		Type:       "series",
		Chapters:   chapters,
		SiteID:     "hentaiforce.net",
	}, nil
}

func (d *HentaiforceDownloader) fetchPage(url string) (string, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch page: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to fetch page, status code: %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(bodyBytes), nil
}
