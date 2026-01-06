package downloader

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
)

type NHentaiDownloader struct{}

type nhentaiData struct {
	ID      json.Number `json:"id"`
	MediaID json.Number `json:"media_id"`
	Title   struct {
		English string `json:"english"`
		Pretty  string `json:"pretty"`
	} `json:"title"`
	Images struct {
		Pages []struct {
			T string `json:"t"` // "j", "p", "g"
		} `json:"pages"`
	} `json:"images"`
}

func (d *NHentaiDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "nhentai.net")
}

func (d *NHentaiDownloader) GetSiteID() string {
	return "nhentai.net"
}

func (d *NHentaiDownloader) GetImages(url string) (*SiteInfo, error) {
	// Extract ID from URL if possible, though we mainly need to fetch the page
	// URL example: https://nhentai.net/g/12345/

	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// Mimic a browser to avoid some basic filtering
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

	// Extract JSON embedded in HTML
	// Look for JSON.parse('...');
	// Note: The Python script used: split('JSON.parse(')[1].split(');')[0]
	// The content inside JSON.parse is often a string that needs to be unescaped content-wise or just parsed.
	// Actually, usually it's `JSON.parse("{\"id\":...}")`.

	// Let's try to find the JSON string.
	reJSON := regexp.MustCompile(`JSON\.parse\((.*?)\);`)
	match := reJSON.FindStringSubmatch(bodyStr)

	if len(match) < 2 {
		return nil, fmt.Errorf("could not find metadata JSON in page")
	}

	// The matched string is typically a quoted string like "..." containing escaped JSON.
	// We need to unmarshal it as a string first to get the actual JSON string, then unmarshal that.
	jsonStringQuoted := match[1]

	var jsonRaw string
	if err := json.Unmarshal([]byte(jsonStringQuoted), &jsonRaw); err != nil {
		// Fallback: maybe it wasn't a quoted string?
		jsonRaw = jsonStringQuoted
	}

	var data nhentaiData
	if err := json.Unmarshal([]byte(jsonRaw), &data); err != nil {
		return nil, fmt.Errorf("failed to parse metadata JSON: %v", err)
	}

	// Build image list
	mediaID := data.MediaID.String()
	title := data.Title.English
	if title == "" {
		title = data.Title.Pretty
	}

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
		}

		// URL structure: https://i.nhentai.net/galleries/{media_id}/{page}.{ext}
		// Page numbers start at 1
		imageURL := fmt.Sprintf("https://i.nhentai.net/galleries/%s/%d.%s", mediaID, i+1, ext)

		images[i] = ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d.%s", i+1, ext),
			Index:    i,
			Headers: map[string]string{
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
				"Referer":    "https://nhentai.net/",
			},
		}
	}

	// Incorporate ID into the series name to avoid a nested folder for the ID
	// Desired structure: nhentai.net / Title [ID] / images
	fullTitle := fmt.Sprintf("%s [%s]", title, mediaID) // actually use the gallery ID, not mediaID for the folder name usually?
	// Wait, the user's example showed ID at the end of path: .../SeriesName/ID/
	// He said "the id could be part of the name".
	// Usually people want "Title [12345]".
	// ID variable comes from data.ID.

	// Let's use data.ID
	fullTitle = fmt.Sprintf("%s [%s]", title, data.ID.String())

	return &SiteInfo{
		SeriesName:  fullTitle,
		ChapterName: "", // Empty to prevent subfolder creation
		Images:      images,
		SiteID:      d.GetSiteID(),
	}, nil
}
