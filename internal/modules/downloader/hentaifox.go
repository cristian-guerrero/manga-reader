package downloader

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type HentaiFoxDownloader struct{}

func (d *HentaiFoxDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "hentaifox.com")
}

func (d *HentaiFoxDownloader) GetSiteID() string {
	return "hentaifox.com"
}

func (d *HentaiFoxDownloader) GetImages(url string) (*SiteInfo, error) {
	url = strings.TrimSuffix(url, "/") + "/"

	reURL := regexp.MustCompile(`hentaifox\.com/(?:gallery/|g/)(\d+)`)
	match := reURL.FindStringSubmatch(url)
	if len(match) < 2 {
		return nil, fmt.Errorf("invalid hentaifox.com URL format")
	}

	galleryID := match[1]
	galleryURL := fmt.Sprintf("https://hentaifox.com/gallery/%s/", galleryID)

	client := &http.Client{Timeout: 30 * time.Second}

	req, err := http.NewRequest("GET", galleryURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Referer", "https://hentaifox.com/")

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

	// Extract hidden inputs: load_dir, load_id, load_pages
	reValue := func(name string) string {
		re := regexp.MustCompile(fmt.Sprintf(`name=["']%s["'][^>]*value=["']([^"']+)["']`, regexp.QuoteMeta(name)))
		if m := re.FindStringSubmatch(bodyStr); len(m) > 1 {
			return m[1]
		}
		return ""
	}

	loadDir := reValue("load_dir")
	loadID := reValue("load_id")
	loadPagesStr := reValue("load_pages")

	if loadDir == "" || loadID == "" || loadPagesStr == "" {
		return nil, fmt.Errorf("could not extract gallery metadata from page")
	}

	numPages := 0
	fmt.Sscanf(loadPagesStr, "%d", &numPages)
	if numPages == 0 {
		return nil, fmt.Errorf("could not determine number of pages")
	}

	// Extract title from <h1>
	title := fmt.Sprintf("Gallery %s", galleryID)
	reTitle := regexp.MustCompile(`<h1[^>]*>(.*?)</h1>`)
	if titleMatch := reTitle.FindStringSubmatch(bodyStr); len(titleMatch) > 1 {
		title = strings.TrimSpace(titleMatch[1])
	}

	// Extract g_th JSON for per-page format (j=jpg, p=png, g=gif, w=webp)
	// Format: var g_th = $.parseJSON('{"1":"j,1062,1500","2":"j,1062,1500",...}');
	pageTypes := make(map[int]string)
	reGth := regexp.MustCompile(`var\s+g_th\s*=\s*\$\s*\.\s*parseJSON\s*\(\s*'([^']+)'\s*\)`)
	if gthMatch := reGth.FindStringSubmatch(bodyStr); len(gthMatch) > 1 {
		var gthMap map[string]string
		if err := json.Unmarshal([]byte(gthMatch[1]), &gthMap); err == nil {
			for pageStr, val := range gthMap {
				var pageNum int
				if _, err := fmt.Sscanf(pageStr, "%d", &pageNum); err == nil {
					parts := strings.Split(val, ",")
					if len(parts) > 0 {
						pageTypes[pageNum] = parts[0]
					}
				}
			}
		}
	}

	// Extract the CDN subdomain from the cover image.
	// Each gallery stores images on a specific subdomain (i, i2, i3, etc.)
	// Using the cover image <img src="https://i3.hentaifox.com/.../cover.jpg">
	defaultHost := "i"
	reCover := regexp.MustCompile(`<img[^>]+src=["']https://([^.]+)\.hentaifox\.com/[^"']+cover\.(?:jpg|png|webp)["']`)
	if coverMatch := reCover.FindStringSubmatch(bodyStr); len(coverMatch) > 1 {
		defaultHost = coverMatch[1]
	}

	// Extract per-page CDN host from visible thumbnail data-src URLs
	// data-src="https://i3.hentaifox.com/004/3942058/2t.jpg"
	pageHost := make(map[int]string)
	reThumb := regexp.MustCompile(`data-src=["']https://([^.]+)\.hentaifox\.com/[^"']*/(\d+)t\.(?:jpe?g|png|gif|webp)["']`)
	for _, tm := range reThumb.FindAllStringSubmatch(bodyStr, -1) {
		if len(tm) >= 3 {
			var pageNum int
			if _, err := fmt.Sscanf(tm[2], "%d", &pageNum); err == nil {
				pageHost[pageNum] = tm[1]
			}
		}
	}

	// Build image URLs
	images := make([]ImageDownload, 0, numPages)

	for pageNum := 1; pageNum <= numPages; pageNum++ {
		ext := "jpg"
		if t, ok := pageTypes[pageNum]; ok {
			switch t {
			case "p":
				ext = "png"
			case "g":
				ext = "gif"
			case "w":
				ext = "webp"
			}
		}

		// Use per-page host from thumbnail if available, otherwise fall back to cover host
		host, ok := pageHost[pageNum]
		if !ok {
			host = defaultHost
		}

		imageURL := fmt.Sprintf("https://%s.hentaifox.com/%s/%s/%d.%s", host, loadDir, loadID, pageNum, ext)

		images = append(images, ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d.%s", pageNum, ext),
			Index:    pageNum - 1,
			Headers: map[string]string{
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
				"Referer":    "https://hentaifox.com/",
			},
		})
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
