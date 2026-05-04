package downloader

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
)

type IMHentaiToDownloader struct{}

func (d *IMHentaiToDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "imhentai.to")
}

func (d *IMHentaiToDownloader) NormalizeURL(url string) string {
	// Remove query params
	if idx := strings.Index(url, "?"); idx != -1 {
		url = url[:idx]
	}

	// If it's a view page, convert to gallery page
	// https://imhentai.to/view/645455/1/ -> https://imhentai.to/g/645455/
	if strings.Contains(url, "/view/") {
		re := regexp.MustCompile(`imhentai\.to/view/(\d+)/`)
		match := re.FindStringSubmatch(url)
		if len(match) > 1 {
			return fmt.Sprintf("https://imhentai.to/g/%s/", match[1])
		}
	}

	// If URL has page number, strip it
	// https://imhentai.to/g/645455/1/ -> https://imhentai.to/g/645455/
	if strings.Contains(url, "/g/") {
		re := regexp.MustCompile(`(/g/\d+/)\d+/`)
		match := re.FindStringSubmatch(url)
		if len(match) > 1 {
			return fmt.Sprintf("https://imhentai.to%s", match[1])
		}
	}

	// Ensure trailing slash for gallery
	if strings.Contains(url, "/g/") && !strings.HasSuffix(url, "/") {
		url += "/"
	}

	return url
}

func (d *IMHentaiToDownloader) GetSiteID() string {
	return "imhentai.to"
}

func (d *IMHentaiToDownloader) GetImages(url string) (*SiteInfo, error) {
	url = d.NormalizeURL(url)

	if !strings.Contains(url, "/g/") {
		return nil, fmt.Errorf("URL is not an IMHentai gallery page")
	}

	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

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

	// Extract title from <h1> tag
	reTitle := regexp.MustCompile(`<h1>(.*?)</h1>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	title := "IMHentai Gallery"
	if len(titleMatch) > 1 {
		title = strings.TrimSpace(titleMatch[1])
	}

	// Extract media_id from cover image URL
	// Pattern: https://zrocdn.xyz/galleries/{media_id}/cover.webp
	reMediaID := regexp.MustCompile(`https://zrocdn\.xyz/galleries/(\d+)/cover\.webp`)
	mediaMatch := reMediaID.FindStringSubmatch(bodyStr)
	if len(mediaMatch) < 2 {
		return nil, fmt.Errorf("could not extract media ID from page")
	}
	mediaID := mediaMatch[1]

	// Extract page count from <span class="pages_num">{count}</span>
	rePages := regexp.MustCompile(`<span class="pages_num">(\d+)</span>`)
	pagesMatch := rePages.FindStringSubmatch(bodyStr)
	if len(pagesMatch) < 2 {
		return nil, fmt.Errorf("could not extract page count from page")
	}

	var totalPages int
	fmt.Sscanf(pagesMatch[1], "%d", &totalPages)

	if totalPages == 0 {
		return nil, fmt.Errorf("no pages found")
	}

	// Build image URLs
	// Pattern: https://zrocdn.xyz/galleries/{media_id}/{page}.webp
	var images []ImageDownload
	for i := 1; i <= totalPages; i++ {
		imageURL := fmt.Sprintf("https://zrocdn.xyz/galleries/%s/%d.webp", mediaID, i)
		images = append(images, ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d.webp", i),
			Index:    i - 1,
			Headers: map[string]string{
				"Referer": "https://imhentai.to/",
			},
		})
	}

	return &SiteInfo{
		SeriesName: title,
		Images:     images,
		SiteID:     "imhentai.to",
		Type:       "single",
	}, nil
}