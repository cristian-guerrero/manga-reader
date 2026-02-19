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

type NHentaiXXXDownloader struct{}

func (d *NHentaiXXXDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "nhentai.xxx")
}

func (d *NHentaiXXXDownloader) GetSiteID() string {
	return "nhentai.xxx"
}

func (d *NHentaiXXXDownloader) GetImages(url string) (*SiteInfo, error) {
	// Normalize URL
	// https://nhentai.xxx/g/371495/1/ -> https://nhentai.xxx/g/371495/
	if strings.Contains(url, "/g/") {
		re := regexp.MustCompile(`/g/(\d+)/?(\d+)?/?`)
		match := re.FindStringSubmatch(url)
		if len(match) > 1 {
			url = fmt.Sprintf("https://nhentai.xxx/g/%s/", match[1])
		}
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
	pagesStr := d.extractValue(bodyStr, "load_pages")

	if server == "" || dir == "" || loadID == "" {
		return nil, fmt.Errorf("failed to extract metadata from page")
	}

	totalPages := 0
	if pagesStr != "" {
		fmt.Sscanf(pagesStr, "%d", &totalPages)
	}

	// Extract title
	// The title is in <h1 id="gallery_title">...</h1> or just <h1>
	reTitle := regexp.MustCompile(`<h1[^>]*>(.*?)</h1>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	title := "Unknown"
	if len(titleMatch) > 1 {
		title = html.UnescapeString(titleMatch[1])
	}

	// Extract gallery ID from URL to add it to the name
	galleryID := ""
	reID := regexp.MustCompile(`/g/(\d+)/`)
	idMatch := reID.FindStringSubmatch(url)
	if len(idMatch) > 1 {
		galleryID = idMatch[1]
		title = fmt.Sprintf("%s [%s]", title, galleryID)
	}

	// Extract image extensions from g_th JSON
	reGth := regexp.MustCompile(`var g_th = \$\.parseJSON\('(.*?)'\);`)
	gthMatch := reGth.FindStringSubmatch(bodyStr)
	if len(gthMatch) < 2 {
		return nil, fmt.Errorf("could not find g_th metadata")
	}

	var gthRaw map[string]interface{}
	if err := json.Unmarshal([]byte(gthMatch[1]), &gthRaw); err != nil {
		return nil, fmt.Errorf("failed to parse g_th JSON: %v", err)
	}

	// nhentai.xxx uses {"fl": {"1": "w,...", ...}, "th": {...}, "ct": {...}}
	gthData, ok := gthRaw["fl"].(map[string]interface{})
	if !ok {
		// Fallback: maybe it's not nested? (like imhentai or hentaiera)
		gthData = gthRaw
	}

	if totalPages == 0 {
		totalPages = len(gthData)
	}

	var images []ImageDownload
	for i := 1; i <= totalPages; i++ {
		pageKey := fmt.Sprintf("%d", i)
		valRaw, ok := gthData[pageKey]
		if !ok {
			continue
		}

		val, ok := valRaw.(string)
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

		imageURL := fmt.Sprintf("https://i%s.nhentaimg.com/%s/%s/%d%s", server, dir, loadID, i, extension)
		images = append(images, ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d%s", i, extension),
			Index:    i - 1,
			Headers: map[string]string{
				"Referer":    "https://nhentai.xxx/",
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
			},
		})
	}

	return &SiteInfo{
		SeriesName: title,
		Images:     images,
		SiteID:     "nhentai.xxx",
		Type:       "single",
	}, nil
}

func (d *NHentaiXXXDownloader) extractValue(body, id string) string {
	re := regexp.MustCompile(fmt.Sprintf(`id="%s" value="(.*?)"`, id))
	match := re.FindStringSubmatch(body)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}
