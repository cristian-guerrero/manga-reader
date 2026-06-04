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

type HentaieraDownloader struct{}

func (d *HentaieraDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "hentaiera.com")
}

func (d *HentaieraDownloader) GetSiteID() string {
	return "hentaiera.com"
}

func (d *HentaieraDownloader) GetImages(url string) (*SiteInfo, error) {
	if !strings.Contains(url, "/gallery/") && !strings.Contains(url, "/view/") {
		return d.getSeriesInfo(url)
	}

	bodyStr, err := d.fetchPage(url)
	if err != nil {
		return nil, err
	}

	// Extract metadata from hidden inputs
	server := d.extractValue(bodyStr, "load_server")
	dir := d.extractValue(bodyStr, "load_dir")
	loadID := d.extractValue(bodyStr, "load_id")
	// pagesStr := d.extractValue(bodyStr, "load_pages")

	if server == "" || dir == "" || loadID == "" {
		return nil, fmt.Errorf("failed to extract metadata from page")
	}

	// Extract title
	reTitle := regexp.MustCompile(`<h1>(.*?)</h1>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	title := "Unknown"
	if len(titleMatch) > 1 {
		title = html.UnescapeString(titleMatch[1])
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
	// The keys are page numbers like "1", "2"...
	// We should sort them or just iterate based on count
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
		} else if extLetter == "w" {
			extension = ".webp"
		}

		imageURL := fmt.Sprintf("https://m%s.hentaiera.com/%s/%s/%d%s", server, dir, loadID, i, extension)
		images = append(images, ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d%s", i, extension),
			Index:    i - 1,
			Headers: map[string]string{
				"Referer":    url,
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
			},
		})
	}

	return &SiteInfo{
		SeriesName:  title,
		ChapterName: "",
		SiteID:      "hentaiera.com",
		Images:      images,
		Type:        "single",
	}, nil
}

// Language ID to ISO code mapping from hentaiera.com data-languages attribute
var hentaieraLanguageMap = map[string]string{
	"1":  "ja",
	"2":  "en",
	"3":  "es",
	"6":  "es",
	"8":  "fr",
	"10": "ru",
}

func (d *HentaieraDownloader) getSeriesInfo(rawURL string) (*SiteInfo, error) {
	// Parse URL to preserve query params (e.g. ?page=2)
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}

	langFilter := parsedURL.Query().Get("lang")

	// Build clean base path (strip query params for pagination)
	basePath := parsedURL.Path
	if !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	firstPageURL := fmt.Sprintf("https://hentaiera.com%s", basePath)

	bodyStr, err := d.fetchPage(firstPageURL)
	if err != nil {
		return nil, err
	}

	// Extract title
	title := "Hentaiera Series"
	reTitle := regexp.MustCompile(`<title>(.*?)</title>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	if len(titleMatch) > 1 {
		title = strings.TrimSuffix(titleMatch[1], " - Hentai Manga, Doujinshi & Comic Porn")
		title = strings.TrimSpace(title)
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
			pageURL := fmt.Sprintf("https://hentaiera.com%s?page=%d", basePath, page)
			bodyStr, err = d.fetchPage(pageURL)
			if err != nil {
				break
			}
		}

		chapters := d.parseGalleryEntries(bodyStr, langFilter, seen)
		allChapters = append(allChapters, chapters...)
	}

	if len(allChapters) == 0 {
		return nil, fmt.Errorf("could not find any galleries in this list")
	}

	return &SiteInfo{
		SeriesName: title,
		SiteID:     "hentaiera.com",
		Type:       "series",
		Chapters:   allChapters,
	}, nil
}

func (d *HentaieraDownloader) parseGalleryEntries(bodyStr, langFilter string, seen map[string]bool) []ChapterInfo {
	// Match thumb divs with data-languages and gallery_title inside
	reThumb := regexp.MustCompile(`(?s)data-languages="([^"]*)"[^>]*>.*?<h2 class="gallery_title">\s*<a href="(/gallery/(\d+)/)">(.*?)</a>\s*</h2>`)
	matches := reThumb.FindAllStringSubmatch(bodyStr, -1)

	var chapters []ChapterInfo
	for _, m := range matches {
		langIDs := strings.Fields(m[1])
		galleryURL := "https://hentaiera.com" + m[2]
		galleryID := m[3]
		galleryTitle := html.UnescapeString(strings.TrimSpace(m[4]))

		if seen[galleryURL] {
			continue
		}
		seen[galleryURL] = true

		// Determine language codes for this gallery
		var langCodes []string
		for _, lid := range langIDs {
			if code, ok := hentaieraLanguageMap[lid]; ok {
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

func (d *HentaieraDownloader) fetchPage(url string) (string, error) {
	// Hentaiera is very strict with trailing slashes on artist/search pages.
	// If the URL is an artist or search page and doesn't end with / (and has no query), append it.
	if strings.Contains(url, "/artist/") || strings.Contains(url, "/search/") || strings.Contains(url, "/tag/") {
		if !strings.HasSuffix(url, "/") && !strings.Contains(url, "?") {
			url += "/"
		}
	}

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
		return "", fmt.Errorf("failed to fetch page, status code: %d (at %s)", resp.StatusCode, url)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(bodyBytes), nil
}

func (d *HentaieraDownloader) extractValue(html, id string) string {
	re := regexp.MustCompile(fmt.Sprintf(`id="%s" value="(.*?)"`, id))
	match := re.FindStringSubmatch(html)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}
