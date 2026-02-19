package downloader

import (
	"fmt"
	"html"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type Hentai2ReadDownloader struct{}

func (d *Hentai2ReadDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "hentai2read.com")
}

func (d *Hentai2ReadDownloader) GetSiteID() string {
	return "hentai2read.com"
}

func (d *Hentai2ReadDownloader) GetImages(url string) (*SiteInfo, error) {
	// Example reader URL: https://hentai2read.com/ntr_midnight_pool_season_2/1/
	// Example series URL: https://hentai2read.com/ntr_midnight_pool_season_2/

	// Trim trailing slash for consistent handling
	trimmedURL := strings.TrimRight(url, "/")

	// Check if it's a reader URL (ends with a number) OR a series URL
	reReader := regexp.MustCompile(`/[0-9]+$`)
	isReader := reReader.MatchString(trimmedURL)

	if isReader {
		return d.getImagesFromReader(url)
	}

	return d.getChaptersFromSeries(url)
}

func (d *Hentai2ReadDownloader) getImagesFromReader(url string) (*SiteInfo, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch reader page: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch reader page, status code: %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	bodyStr := string(bodyBytes)

	// Get base URL for images from an existing image tag
	// <img decoding="async" id="arf-reader" src="https://static.hentai.direct/hentai/62737/1/ccdn0001.jpg" alt="...">
	reFirstImage := regexp.MustCompile(`id="arf-reader"\s+src="(https?://[^"]+)"`)
	firstImageMatch := reFirstImage.FindStringSubmatch(bodyStr)

	var baseURL string
	var firstImagePath string

	// Get images array from gData
	// 'images' : ["\/62737\/1\/ccdn0001.jpg","\/62737\/1\/ccdn0002.jpg", ...]
	reImages := regexp.MustCompile(`'images'\s*:\s*\[(.*?)\]`)
	imagesMatch := reImages.FindStringSubmatch(bodyStr)

	if len(imagesMatch) < 2 {
		return nil, fmt.Errorf("could not find images array in page")
	}

	// Clean up the images array string
	imagesRaw := imagesMatch[1]
	imagesRaw = strings.ReplaceAll(imagesRaw, `"`, "")
	imagesRaw = strings.ReplaceAll(imagesRaw, `\/`, "/")
	imagePaths := strings.Split(imagesRaw, ",")

	if len(firstImageMatch) >= 2 {
		firstImageURL := firstImageMatch[1]
		// Find where the first image path ends in the full URL
		// For example: URL: https://static.hentai.direct/hentai/62737/1/ccdn0001.jpg
		// Path: /62737/1/ccdn0001.jpg
		// Base: https://static.hentai.direct/hentai

		// Using the first path from imagePaths
		if len(imagePaths) > 0 {
			firstImagePath = imagePaths[0]
			if strings.HasSuffix(firstImageURL, firstImagePath) {
				baseURL = strings.TrimSuffix(firstImageURL, firstImagePath)
			}
		}
	}

	// Fallback if we couldn't determine baseURL
	if baseURL == "" {
		baseURL = "https://static.hentai.direct/hentai" // Most common
	}

	// Extract title metadata
	seriesName := ""
	chapterName := ""

	reTitle := regexp.MustCompile(`<title>(.*?)</title>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	if len(titleMatch) >= 2 {
		fullTitle := html.UnescapeString(titleMatch[1])
		// Reading NTR Midnight Pool Season 2 (Original) Hentai by Clone Ningen - 1: NTR Midnight Pool Season 2 #1 - Page 1
		// We can split by " - " or ":"
		parts := strings.Split(fullTitle, " - ")
		if len(parts) > 0 {
			seriesName = strings.TrimPrefix(parts[0], "Reading ")
			// Clean up " (Original) Hentai by ..."
			if idx := strings.Index(seriesName, " ("); idx != -1 {
				seriesName = seriesName[:idx]
			}
		}
		if len(parts) > 1 {
			chapterName = parts[1]
			// Clean up "- Page 1 ..."
			if idx := strings.Index(chapterName, " - Page"); idx != -1 {
				chapterName = chapterName[:idx]
			}
		}
	}

	var images []ImageDownload
	for i, path := range imagePaths {
		images = append(images, ImageDownload{
			URL:      baseURL + strings.TrimSpace(path),
			Filename: fmt.Sprintf("%04d.jpg", i+1),
			Index:    i,
			Headers: map[string]string{
				"Referer":    url,
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
			},
		})
	}

	return &SiteInfo{
		SeriesName:    seriesName,
		ChapterName:   chapterName,
		Images:        images,
		SiteID:        "hentai2read.com",
		Type:          "single",
		DownloadDelay: 50 * time.Millisecond,
	}, nil
}

func (d *Hentai2ReadDownloader) getChaptersFromSeries(url string) (*SiteInfo, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch series page: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch series page, status code: %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	bodyStr := string(bodyBytes)

	// Extract series name from title
	seriesName := ""
	reTitle := regexp.MustCompile(`<title>(.*?)</title>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	if len(titleMatch) >= 2 {
		title := html.UnescapeString(titleMatch[1])
		// Clean up: NTR Midnight Pool Season 2 online for free - hentai2read
		title = strings.Split(title, " - ")[0]
		seriesName = strings.TrimSuffix(title, " online for free")
	}

	// Extract chapters
	// <ul class="nav-chapters">
	// <li>... <a class="pull-left font-w600" href="...URL...">3 - NTR Midnight Pool Season 2 #3 ...</a> ...</li>
	reChapter := regexp.MustCompile(`(?s)<a class="pull-left font-w600" href="([^"]+)">(.*?)(?:<div|</a>)`)
	matches := reChapter.FindAllStringSubmatch(bodyStr, -1)

	var chapters []ChapterInfo
	for _, m := range matches {
		chapterURL := m[1]
		if !strings.HasPrefix(chapterURL, "http") {
			chapterURL = "https://hentai2read.com" + chapterURL
		}

		// Extract ID from URL (last part ofslug/1/)
		trimmed := strings.Trim(chapterURL, "/")
		parts := strings.Split(trimmed, "/")
		chapterID := parts[len(parts)-1]

		chapters = append(chapters, ChapterInfo{
			ID:   chapterID,
			URL:  chapterURL,
			Name: html.UnescapeString(strings.TrimSpace(m[2])),
		})
	}

	// Reverse to have oldest first
	for i := len(chapters)/2 - 1; i >= 0; i-- {
		opp := len(chapters) - 1 - i
		chapters[i], chapters[opp] = chapters[opp], chapters[i]
	}

	return &SiteInfo{
		SeriesName: seriesName,
		SiteID:     "hentai2read.com",
		Type:       "series",
		Chapters:   chapters,
	}, nil
}
