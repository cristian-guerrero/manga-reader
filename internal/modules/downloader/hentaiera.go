package downloader

import (
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"regexp"
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

func (d *HentaieraDownloader) getSeriesInfo(url string) (*SiteInfo, error) {
	bodyStr, err := d.fetchPage(url)
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

	// Extract galleries
	// Matches both <h2 class="gallery_title"> and <div class="gallery_title"> for robustness
	reGallery := regexp.MustCompile(`(?s)<(?:h\d|div)\s+class="gallery_title">\s*<a\s+href="([^"]+)">\s*(.*?)\s*</a>\s*</(?:h\d|div)>`)
	matches := reGallery.FindAllStringSubmatch(bodyStr, -1)

	var chapters []ChapterInfo
	for _, m := range matches {
		galleryURL := m[1]
		galleryTitle := strings.TrimSpace(m[2])

		if !strings.HasPrefix(galleryURL, "http") {
			galleryURL = "https://hentaiera.com" + galleryURL
		}

		// Extract ID from /gallery/12345/
		reID := regexp.MustCompile(`/gallery/(\d+)/`)
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
		SiteID:     "hentaiera.com",
		Type:       "series",
		Chapters:   chapters,
	}, nil
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
