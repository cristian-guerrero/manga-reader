package downloader

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"regexp"
	"strings"
)

type HentaivoxDownloader struct{}

type HentaivoxReaderPages struct {
	Title      string `json:"title"`
	BaseUriImg string `json:"baseUriImg"`
	LastPage   int    `json:"lastPage"`
	Pages      map[string]struct {
		F string `json:"f"`
	} `json:"pages"`
}

func (d *HentaivoxDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "hentaivox.com")
}

func (d *HentaivoxDownloader) GetSiteID() string {
	return "hentaivox.com"
}

func (d *HentaivoxDownloader) GetImages(url string) (*SiteInfo, error) {
	if !strings.Contains(url, "/gallery/") && !strings.Contains(url, "/view/") && !strings.Contains(url, "/g/") {
		return d.getSeriesInfo(url)
	}

	bodyStr, err := d.fetchPage(url)
	if err != nil {
		return nil, err
	}

	// Try the readerPages pattern first (New Hentaivox)
	if strings.Contains(bodyStr, "var readerPages") {
		return d.parseReaderPages(bodyStr, url)
	}

	// Try fetching the first page if we are on gallery root and didn't find metadata
	if (strings.Contains(url, "/view/") || strings.Contains(url, "/gallery/") || strings.Contains(url, "/g/")) &&
		!strings.Contains(bodyStr, "var readerPages") &&
		!strings.Contains(bodyStr, "load_server") {

		// Avoid infinite loops by checking if we already tried /1/
		if !strings.HasSuffix(strings.TrimSuffix(url, "/"), "/1") {
			// Construct URL for page 1
			readerURL := url
			if !strings.HasSuffix(readerURL, "/") {
				readerURL += "/"
			}
			readerURL += "1/"

			readerBody, err := d.fetchPage(readerURL)
			if err == nil {
				if strings.Contains(readerBody, "var readerPages") {
					return d.parseReaderPages(readerBody, url)
				}
				// If readerPages is not there, maybe the old format is on page 1?
				if strings.Contains(readerBody, "load_server") {
					bodyStr = readerBody // Use the reader page for old format extraction below
				}
			}
		}
	}

	// Fallback to old pattern (load_server, load_dir, etc)
	server := d.extractValue(bodyStr, "load_server")
	dir := d.extractValue(bodyStr, "load_dir")
	loadID := d.extractValue(bodyStr, "load_id")

	if server != "" && dir != "" && loadID != "" {
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
		if len(gthMatch) >= 2 {
			var gthData map[string]string
			if err := json.Unmarshal([]byte(gthMatch[1]), &gthData); err == nil {
				var images []ImageDownload
				for i := 1; i <= len(gthData); i++ {
					pageKey := fmt.Sprintf("%d", i)
					val, ok := gthData[pageKey]
					if !ok {
						continue
					}

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

					imageURL := fmt.Sprintf("https://m%s.hentaivox.com/%s/%s/%d%s", server, dir, loadID, i, extension)
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
					SiteID:      "hentaivox.com",
					Images:      images,
					Type:        "single",
				}, nil
			}
		}
	}

	return nil, fmt.Errorf("failed to extract metadata from page")
}

func (d *HentaivoxDownloader) parseReaderPages(bodyStr, url string) (*SiteInfo, error) {
	reReader := regexp.MustCompile(`var readerPages\s*=\s*JSON\.parse\(\s*atob\s*\(\s*"(.*?)"\s*\)\s*\)\s*;`)
	readerMatch := reReader.FindStringSubmatch(bodyStr)
	if len(readerMatch) < 2 {
		return nil, fmt.Errorf("failed to extract readerPages from page")
	}

	decoded, err := base64.StdEncoding.DecodeString(readerMatch[1])
	if err != nil {
		return nil, fmt.Errorf("failed to decode readerPages: %v", err)
	}

	var data HentaivoxReaderPages
	if err := json.Unmarshal(decoded, &data); err != nil {
		return nil, fmt.Errorf("failed to parse readerPages JSON: %v", err)
	}

	// Extract clean title
	title := html.UnescapeString(data.Title)
	title = strings.ReplaceAll(title, " - Page {:page}", "")
	title = strings.ReplaceAll(title, " - HentaiVox", "")
	title = strings.TrimSpace(title)

	var images []ImageDownload
	for i := 1; i <= data.LastPage; i++ {
		pageKey := fmt.Sprintf("%d", i)
		pageData, ok := data.Pages[pageKey]
		if !ok {
			continue
		}

		// Construct URL using baseUriImg
		// e.g. https://a1.hentaivox.com/i/images/1882022-%s
		imageURL := strings.Replace(data.BaseUriImg, "%s", pageData.F, 1)

		// Sanitize extension for filename
		ext := ".jpg"
		if idx := strings.LastIndex(pageData.F, "."); idx != -1 {
			ext = pageData.F[idx:]
		}

		images = append(images, ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d%s", i, ext),
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
		SiteID:      "hentaivox.com",
		Images:      images,
		Type:        "single",
	}, nil
}

func (d *HentaivoxDownloader) getSeriesInfo(url string) (*SiteInfo, error) {
	bodyStr, err := d.fetchPage(url)
	if err != nil {
		return nil, err
	}

	// Extract title
	title := "Hentaivox Series"
	reTitle := regexp.MustCompile(`<title>(.*?)</title>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	if len(titleMatch) > 1 {
		title = html.UnescapeString(titleMatch[1])
		title = strings.TrimSuffix(title, " - HentaiVox")
		title = strings.TrimSpace(title)
	}

	// Extract galleries
	reGallery := regexp.MustCompile(`(?s)<(?:h\d|div)\s+class="gallery_title">\s*<a\s+href="([^"]+)">\s*(.*?)\s*</a>\s*</(?:h\d|div)>`)
	matches := reGallery.FindAllStringSubmatch(bodyStr, -1)

	var chapters []ChapterInfo
	for _, m := range matches {
		galleryURL := m[1]
		galleryTitle := html.UnescapeString(strings.TrimSpace(m[2]))

		if !strings.HasPrefix(galleryURL, "http") {
			galleryURL = "https://hentaivox.com" + galleryURL
		}

		// Extract ID from /gallery/12345/ or /g/12345/
		reID := regexp.MustCompile(`/(?:gallery|g)/(\d+)/`)
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
		SiteID:     "hentaivox.com",
		Type:       "series",
		Chapters:   chapters,
	}, nil
}

func (d *HentaivoxDownloader) fetchPage(url string) (string, error) {
	// Follow the same pattern as HentaiEra for trailing slashes
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

func (d *HentaivoxDownloader) extractValue(html, id string) string {
	re := regexp.MustCompile(fmt.Sprintf(`(?:id|name)="%s"\s+value="(.*?)"`, id))
	match := re.FindStringSubmatch(html)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}
