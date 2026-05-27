package downloader

import (
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

type IMHentaiDownloader struct{}

func (d *IMHentaiDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "imhentai.xxx")
}

func (d *IMHentaiDownloader) NormalizeURL(url string) string {
	// Remove query params
	if idx := strings.Index(url, "?"); idx != -1 {
		url = url[:idx]
	}

	// If it's a view page, convert to gallery page
	// https://imhentai.xxx/view/1063156/1/ -> https://imhentai.xxx/gallery/1063156/
	if strings.Contains(url, "/view/") {
		re := regexp.MustCompile(`imhentai\.xxx/view/(\d+)/`)
		match := re.FindStringSubmatch(url)
		if len(match) > 1 {
			return fmt.Sprintf("https://imhentai.xxx/gallery/%s/", match[1])
		}
	}

	// Ensure trailing slash for gallery
	if strings.Contains(url, "/gallery/") && !strings.HasSuffix(url, "/") {
		url += "/"
	}

	return url
}

func (d *IMHentaiDownloader) GetSiteID() string {
	return "imhentai.xxx"
}

func (d *IMHentaiDownloader) GetImages(url string) (*SiteInfo, error) {
	if strings.Contains(url, "/artist/") {
		return d.getArtistInfo(url)
	}

	url = d.NormalizeURL(url)

	if !strings.Contains(url, "/gallery/") {
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

	// Extract metadata from hidden inputs
	server := d.extractValue(bodyStr, "load_server")
	dir := d.extractValue(bodyStr, "load_dir")
	loadID := d.extractValue(bodyStr, "load_id")
	title := html.UnescapeString(d.extractValue(bodyStr, "gallery_title"))

	if server == "" || dir == "" || loadID == "" {
		return nil, fmt.Errorf("failed to extract metadata from page")
	}

	if title == "" {
		title = "IMHentai Gallery"
	}

	// Extract image extensions from g_th JSON
	reGth := regexp.MustCompile(`var g_th = \$.parseJSON\('(.*?)'\);`)
	gthMatch := reGth.FindStringSubmatch(bodyStr)
	if len(gthMatch) < 2 {
		return nil, fmt.Errorf("could not find g_th metadata")
	}

	var gthData map[string]string
	if err := json.Unmarshal([]byte(gthMatch[1]), &gthData); err != nil {
		return nil, fmt.Errorf("failed to parse g_th JSON: %v", err)
	}

	var images []ImageDownload
	for i := 1; i <= len(gthData); i++ {
		pageKey := fmt.Sprintf("%d", i)
		val, ok := gthData[pageKey]
		if !ok {
			continue
		}

		// Format is "extension,width,height" e.g., "j,1280,1816"
		parts := strings.Split(val, ",")
		extLetter := parts[0]
		extension := ".jpg"
		if extLetter == "p" {
			extension = ".png"
		} else if extLetter == "g" {
			extension = ".gif"
		} else if extLetter == "j" {
			extension = ".jpg"
		} else if extLetter == "w" {
			extension = ".webp"
		}

		imageURL := fmt.Sprintf("https://m%s.imhentai.xxx/%s/%s/%d%s", server, dir, loadID, i, extension)
		images = append(images, ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d%s", i, extension),
			Index:    i - 1,
			Headers: map[string]string{
				"Referer": "https://imhentai.xxx/",
			},
		})
	}

	return &SiteInfo{
		SeriesName: title,
		Images:     images,
		SiteID:     "imhentai.xxx",
		Type:       "single",
	}, nil
}

// Language ID to ISO code mapping from imhentai.xxx data-languages attribute
var imhentaiLanguageMap = map[string]string{
	"1": "ja",
	"2": "zh",
	"3": "en",
	"5": "de",
	"6": "es",
}

func (d *IMHentaiDownloader) getArtistInfo(rawURL string) (*SiteInfo, error) {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}

	langFilter := parsedURL.Query().Get("lang")

	// Build clean artist path
	artistPath := parsedURL.Path
	if !strings.HasSuffix(artistPath, "/") {
		artistPath += "/"
	}
	firstPageURL := fmt.Sprintf("https://imhentai.xxx%s", artistPath)

	bodyStr, err := d.fetchPage(firstPageURL)
	if err != nil {
		return nil, err
	}

	// Extract title from <h1>
	title := "IMHentai Artist"
	reTitle := regexp.MustCompile(`<h1[^>]*>(.*?)</h1>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	if len(titleMatch) > 1 {
		title = html.UnescapeString(regexp.MustCompile(`<[^>]*>`).ReplaceAllString(strings.TrimSpace(titleMatch[1]), ""))
	}

	// Get total pages from pagination
	totalPages := 1
	rePage := regexp.MustCompile(`\?page=(\d+)`)
	for _, m := range rePage.FindAllStringSubmatch(bodyStr, -1) {
		if n, err := strconv.Atoi(m[1]); err == nil && n > totalPages {
			totalPages = n
		}
	}

	// Limit pages to prevent abuse
	if totalPages > 50 {
		totalPages = 50
	}

	var allChapters []ChapterInfo
	seen := make(map[string]bool)

	for page := 1; page <= totalPages; page++ {
		if page > 1 {
			pageURL := fmt.Sprintf("https://imhentai.xxx%s?page=%d", strings.TrimSuffix(artistPath, "/"), page)
			bodyStr, err = d.fetchPage(pageURL)
			if err != nil {
				break
			}
		}

		chapters := d.parseGalleryEntries(bodyStr, langFilter, seen)
		allChapters = append(allChapters, chapters...)
	}

	if len(allChapters) == 0 {
		return nil, fmt.Errorf("could not find any galleries for this artist")
	}

	return &SiteInfo{
		SeriesName: title,
		SiteID:     "imhentai.xxx",
		Type:       "series",
		Chapters:   allChapters,
	}, nil
}

func (d *IMHentaiDownloader) parseGalleryEntries(bodyStr, langFilter string, seen map[string]bool) []ChapterInfo {
	reThumb := regexp.MustCompile(`(?s)data-languages="([^"]*)"[^>]*>.*?<h2 class="gallery_title">\s*<a href="(/gallery/(\d+)/)">(.*?)</a>\s*</h2>`)
	matches := reThumb.FindAllStringSubmatch(bodyStr, -1)

	var chapters []ChapterInfo
	for _, m := range matches {
		langIDs := strings.Fields(m[1])
		galleryURL := "https://imhentai.xxx" + m[2]
		galleryID := m[3]
		galleryTitle := html.UnescapeString(strings.TrimSpace(m[4]))

		if seen[galleryURL] {
			continue
		}
		seen[galleryURL] = true

		// Determine language codes for this gallery
		var langCodes []string
		for _, lid := range langIDs {
			if code, ok := imhentaiLanguageMap[lid]; ok {
				langCodes = append(langCodes, code)
			}
		}
		chapterLang := strings.Join(langCodes, ",")

		// Apply language filter if set
		if langFilter != "" {
			matchesFilter := false
			for _, code := range langCodes {
				if code == langFilter {
					matchesFilter = true
					break
				}
			}
			if !matchesFilter {
				continue
			}
		}

		chapters = append(chapters, ChapterInfo{
			ID:       galleryID,
			Name:     galleryTitle,
			URL:      galleryURL,
			Language: chapterLang,
		})
	}

	return chapters
}

func (d *IMHentaiDownloader) fetchPage(pageURL string) (string, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", pageURL, nil)
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
		return "", fmt.Errorf("failed to fetch page, status code: %d (at %s)", resp.StatusCode, pageURL)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(bodyBytes), nil
}

func (d *IMHentaiDownloader) extractValue(body, id string) string {
	re := regexp.MustCompile(fmt.Sprintf(`id="%s" value="(.*?)"`, id))
	match := re.FindStringSubmatch(body)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}
