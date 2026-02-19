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

type LHentaiDownloader struct{}

type lhentaiGalleryData struct {
	ID      json.Number `json:"id"`
	MediaID json.Number `json:"media_id"`
	Title   struct {
		English  string `json:"english"`
		Japanese string `json:"japanese"`
		Pretty   string `json:"pretty"`
	} `json:"title"`
	Images struct {
		Pages []struct {
			T string `json:"t"` // Type: "j" (jpg), "p" (png), "g" (gif), "w" (webp)
			W int    `json:"w"` // Width
			H int    `json:"h"` // Height
		} `json:"pages"`
	} `json:"images"`
	NumPages   int    `json:"num_pages"`
	NumFavorit int    `json:"num_favorites"`
	UploadDate string `json:"upload_date"`
}

func (d *LHentaiDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "lhentai.com")
}

func (d *LHentaiDownloader) GetSiteID() string {
	return "lhentai.com"
}

func (d *LHentaiDownloader) GetImages(url string) (*SiteInfo, error) {
	// URL format: https://lhentai.com/g/49486/
	// Normalize URL
	url = strings.TrimSuffix(url, "/") + "/"

	// Validate URL format
	reURL := regexp.MustCompile(`lhentai\.com/g/(\d+)/?`)
	match := reURL.FindStringSubmatch(url)
	if len(match) < 2 {
		return nil, fmt.Errorf("invalid lhentai.com URL format")
	}

	galleryID := match[1]

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// Set headers to mimic a browser
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Referer", "https://lhentai.com/")

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

	// Try to extract JSON data embedded in the page
	// Common patterns:
	// 1. JSON.parse('...')
	// 2. window._gallery = {...}
	// 3. var gallery = {...}

	var data lhentaiGalleryData
	var title string
	var mediaID string

	// Pattern 1: Try JSON.parse pattern (similar to nhentai)
	if d.tryExtractJSONParse(bodyStr, &data) {
		title = d.extractTitle(&data)
		mediaID = data.MediaID.String()
	} else if d.tryExtractWindowGallery(bodyStr, &data) {
		// Pattern 2: window._gallery or similar
		title = d.extractTitle(&data)
		mediaID = data.MediaID.String()
	} else if info, err := d.tryExtractPostVariables(bodyStr, galleryID); err == nil {
		// Pattern 3: post_url and images_ext variables
		return info, nil
	} else {
		// Pattern 4: Fallback - scrape HTML for image URLs directly
		return d.scrapeImagesFromHTML(bodyStr, galleryID)
	}

	if len(data.Images.Pages) == 0 {
		return nil, fmt.Errorf("no images found in gallery")
	}

	// Build image list
	images := make([]ImageDownload, len(data.Images.Pages))
	for i, page := range data.Images.Pages {
		ext := "jpg"
		switch page.T {
		case "p":
			ext = "png"
		case "g":
			ext = "gif"
		case "w":
			ext = "webp"
		case "j":
			ext = "jpg"
		}

		// Try common image URL patterns for lhentai
		// Pattern 1: https://ltn.hitomi.la/galleries/{media_id}/{page}.{ext}
		// Pattern 2: https://lhentai.com/galleries/{media_id}/{page}.{ext}
		// Pattern 3: https://i.lhentai.com/galleries/{media_id}/{page}.{ext}

		imageURL := fmt.Sprintf("https://ltn.hitomi.la/galleries/%s/%d.%s", mediaID, i+1, ext)

		images[i] = ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d.%s", i+1, ext),
			Index:    i,
			Headers: map[string]string{
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
				"Referer":    "https://lhentai.com/",
			},
		}
	}

	fullTitle := fmt.Sprintf("%s [%s]", title, galleryID)

	return &SiteInfo{
		SeriesName:    fullTitle,
		ChapterName:   "",
		Images:        images,
		SiteID:        d.GetSiteID(),
		DownloadDelay: 200 * time.Millisecond, // Be respectful with requests
		Type:          "single",
	}, nil
}

func (d *LHentaiDownloader) tryExtractJSONParse(bodyStr string, data *lhentaiGalleryData) bool {
	// Look for JSON.parse('...') or JSON.parse("...")
	// Note: Go's regexp package does not support backreferences like \1
	reJSON := regexp.MustCompile(`JSON\.parse\((["'])(.*?)(["'])\)`)
	match := reJSON.FindStringSubmatch(bodyStr)

	if len(match) < 4 || match[1] != match[3] {
		return false
	}

	// Reconstruct the quoted string for JSON unmarshaling
	jsonStringQuoted := match[1] + match[2] + match[3]

	var jsonRaw string
	// unmarshal unescapes the JSON string inside the parse() call
	if err := json.Unmarshal([]byte(jsonStringQuoted), &jsonRaw); err != nil {
		// Fallback: try using the content directly if unmarshal failed
		jsonRaw = match[2]
	}

	if err := json.Unmarshal([]byte(jsonRaw), data); err != nil {
		return false
	}

	return true
}

func (d *LHentaiDownloader) tryExtractWindowGallery(bodyStr string, data *lhentaiGalleryData) bool {
	// ... existing code ...
	return false
}

func (d *LHentaiDownloader) tryExtractPostVariables(bodyStr, galleryID string) (*SiteInfo, error) {
	// Look for var post_url = "..."; and var images_ext = [...];
	reURL := regexp.MustCompile(`var\s+post_url\s*=\s*"(.*?)";`)
	reExts := regexp.MustCompile(`var\s+images_ext\s*=\s*(\[.*?\]);`)

	matchURL := reURL.FindStringSubmatch(bodyStr)
	matchExts := reExts.FindStringSubmatch(bodyStr)

	if len(matchURL) < 2 || len(matchExts) < 2 {
		return nil, fmt.Errorf("variables not found")
	}

	postURL := matchURL[1]
	var exts []string
	if err := json.Unmarshal([]byte(matchExts[1]), &exts); err != nil {
		return nil, err
	}

	title := "lhentai Gallery " + galleryID
	reTitle := regexp.MustCompile(`<h1.*?>(.*?)</h1>|<title>(.*?)</title>`)
	if match := reTitle.FindStringSubmatch(bodyStr); len(match) > 1 {
		for i := 1; i < len(match); i++ {
			if match[i] != "" {
				title = strings.TrimSpace(match[i])
				title = strings.TrimSuffix(title, " - lhentai")
				title = strings.TrimSuffix(title, " » lhentai")
				break
			}
		}
	}

	images := make([]ImageDownload, len(exts))
	for i, extToken := range exts {
		ext := "jpg"
		switch extToken {
		case "p":
			ext = "png"
		case "g":
			ext = "gif"
		}

		// URL structure: post_url + (index+1) + "." + extension
		imageURL := fmt.Sprintf("%s%d.%s", postURL, i+1, ext)

		images[i] = ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d.%s", i+1, ext),
			Index:    i,
			Headers: map[string]string{
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
				"Referer":    "https://lhentai.com/",
			},
		}
	}

	return &SiteInfo{
		SeriesName:    fmt.Sprintf("%s [%s]", title, galleryID),
		Images:        images,
		SiteID:        d.GetSiteID(),
		DownloadDelay: 200 * time.Millisecond,
		Type:          "single",
	}, nil
}

func (d *LHentaiDownloader) scrapeImagesFromHTML(bodyStr, galleryID string) (*SiteInfo, error) {
	// Extract title from <title> tag or h1
	title := "lhentai Gallery " + galleryID

	// Try to extract title from <title> tag
	reTitle := regexp.MustCompile(`<title>(.*?)</title>`)
	if match := reTitle.FindStringSubmatch(bodyStr); len(match) > 1 {
		title = strings.TrimSpace(match[1])
		// Clean up common suffixes
		title = strings.TrimSuffix(title, " - lhentai")
		title = strings.TrimSuffix(title, " » lhentai")
	}

	// Try to find image URLs directly in the page
	// Common patterns:
	// 1. <img src="https://..." data-src="https://...">
	// 2. <a href="/g/ID/page/"><img src="..."></a>
	// 3. Thumbnail pattern that we can convert to full image

	var images []ImageDownload

	// Pattern 1: Look for thumbnail images in galleries or /g/ folders
	reThumb := regexp.MustCompile(`(?:href|src)=["'](https?://[^"']*?/(?:galleries|g)/[^"']+?)["']`)
	matches := reThumb.FindAllStringSubmatch(bodyStr, -1)

	seenURLs := make(map[string]bool)
	for _, match := range matches {
		if len(match) > 1 {
			imgURL := match[1]
			// Convert thumbnail to full image if it's a known thumbnail pattern
			// e.g., .../1t.jpg -> .../1.jpg
			if strings.Contains(imgURL, "t.") {
				imgURL = strings.ReplaceAll(imgURL, "t.jpg", ".jpg")
				imgURL = strings.ReplaceAll(imgURL, "t.png", ".png")
				imgURL = strings.ReplaceAll(imgURL, "t.gif", ".gif")
				imgURL = strings.ReplaceAll(imgURL, "t.webp", ".webp")
			}

			// Also handle /thumbs/ to /galleries/ if it exists
			imgURL = strings.ReplaceAll(imgURL, "/thumbs/", "/galleries/")

			if !seenURLs[imgURL] {
				seenURLs[imgURL] = true

				// Determine extension for filename
				ext := ".jpg"
				if strings.HasSuffix(imgURL, ".png") {
					ext = ".png"
				} else if strings.HasSuffix(imgURL, ".gif") {
					ext = ".gif"
				} else if strings.HasSuffix(imgURL, ".webp") {
					ext = ".webp"
				}

				images = append(images, ImageDownload{
					URL:      imgURL,
					Filename: fmt.Sprintf("%03d%s", len(images)+1, ext),
					Index:    len(images),
					Headers: map[string]string{
						"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
						"Referer":    "https://lhentai.com/",
					},
				})
			}
		}
	}

	if len(images) == 0 {
		return nil, fmt.Errorf("could not extract images from lhentai page")
	}

	fullTitle := fmt.Sprintf("%s [%s]", title, galleryID)

	return &SiteInfo{
		SeriesName:    fullTitle,
		ChapterName:   "",
		Images:        images,
		SiteID:        d.GetSiteID(),
		DownloadDelay: 200 * time.Millisecond,
		Type:          "single",
	}, nil
}

func (d *LHentaiDownloader) extractTitle(data *lhentaiGalleryData) string {
	if data.Title.English != "" {
		return data.Title.English
	}
	if data.Title.Pretty != "" {
		return data.Title.Pretty
	}
	if data.Title.Japanese != "" {
		return data.Title.Japanese
	}
	return "lhentai Gallery"
}
