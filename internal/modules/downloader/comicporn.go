package downloader

import (
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

type ComicPornDownloader struct{}

func (d *ComicPornDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "comicporn.xxx")
}

func (d *ComicPornDownloader) GetSiteID() string {
	return "comicporn.xxx"
}

func (d *ComicPornDownloader) GetImages(url string) (*SiteInfo, error) {
	// Ensure we are using the gallery URL
	if strings.Contains(url, "/view/") {
		// Convert view URL to gallery URL: /view/ID/PAGE -> /gallery/ID/
		re := regexp.MustCompile(`/view/(\d+)/`)
		match := re.FindStringSubmatch(url)
		if len(match) > 1 {
			url = fmt.Sprintf("https://comicporn.xxx/gallery/%s/", match[1])
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

	if server == "" || dir == "" || loadID == "" || pagesStr == "" {
		return nil, fmt.Errorf("failed to extract metadata from page")
	}

	totalPages, _ := strconv.Atoi(pagesStr)

	// Extract title
	reTitle := regexp.MustCompile(`<h1>(.*?)</h1>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	title := "Unknown"
	if len(titleMatch) > 1 {
		title = html.UnescapeString(titleMatch[1])
	}

	// Extract image extensions from g_th JSON
	reGth := regexp.MustCompile(`var g_th = \$\.parseJSON\('(.*?)'\);`)
	gthMatch := reGth.FindStringSubmatch(bodyStr)
	if len(gthMatch) < 2 {
		return nil, fmt.Errorf("could not find g_th metadata")
	}

	var gthData map[string]string
	if err := json.Unmarshal([]byte(gthMatch[1]), &gthData); err != nil {
		return nil, fmt.Errorf("failed to parse g_th JSON: %v", err)
	}

	var images []ImageDownload
	for i := 1; i <= totalPages; i++ {
		pageKey := fmt.Sprintf("%d", i)
		val, ok := gthData[pageKey]
		if !ok {
			continue
		}

		// Format is "extension,width,height" e.g., "j,1280,1816"
		parts := strings.Split(val, ",")
		extLetter := ""
		if len(parts) > 0 {
			extLetter = parts[0]
		}

		extension := ".jpg"
		if extLetter == "p" {
			extension = ".png"
		} else if extLetter == "g" {
			extension = ".gif"
		} else if extLetter == "w" {
			extension = ".webp"
		}

		imageURL := fmt.Sprintf("https://m%s.comicporn.xxx/%s/%s/%d%s", server, dir, loadID, i, extension)
		images = append(images, ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d%s", i, extension),
		})
	}

	return &SiteInfo{
		SeriesName: title,
		Images:     images,
	}, nil
}

func (d *ComicPornDownloader) extractValue(html, id string) string {
	re := regexp.MustCompile(fmt.Sprintf(`id="%s" value="(.*?)"`, id))
	match := re.FindStringSubmatch(html)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}
