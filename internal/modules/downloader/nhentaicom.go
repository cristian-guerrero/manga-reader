package downloader

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"
)

type NHentaiComDownloader struct{}

func (d *NHentaiComDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "nhentai.com")
}

func (d *NHentaiComDownloader) GetSiteID() string {
	return "nhentai.com"
}

type nhentaiComResponse struct {
	Comic struct {
		ID    int    `json:"id"`
		Title string `json:"title"`
		Slug  string `json:"slug"`
		Pages int    `json:"pages"`
	} `json:"comic"`
	Images []struct {
		Page      int    `json:"page"`
		SourceURL string `json:"source_url"`
	} `json:"images"`
}

func (d *NHentaiComDownloader) GetImages(url string) (*SiteInfo, error) {
	slug := d.extractSlug(url)
	if slug == "" {
		return nil, fmt.Errorf("could not extract comic slug from URL")
	}

	apiURL := fmt.Sprintf("https://nhentai.com/api/comics/%s/images", slug)
	client := &http.Client{}
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch API: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status: %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var apiResp nhentaiComResponse
	if err := json.Unmarshal(bodyBytes, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse API response: %v", err)
	}

	if len(apiResp.Images) == 0 {
		return nil, fmt.Errorf("no images found in API response")
	}

	var images []ImageDownload
	for _, img := range apiResp.Images {
		if img.SourceURL == "" {
			continue
		}

		ext := filepath.Ext(img.SourceURL)
		if ext == "" {
			ext = ".jpg"
		}

		images = append(images, ImageDownload{
			URL:      img.SourceURL,
			Filename: fmt.Sprintf("%03d%s", img.Page, ext),
			Index:    img.Page - 1,
			Headers: map[string]string{
				"Referer":    "https://nhentai.com/",
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
			},
		})
	}

	return &SiteInfo{
		SeriesName:  apiResp.Comic.Title,
		ChapterName: "",
		Images:      images,
		SiteID:      "nhentai.com",
		Type:        "single",
	}, nil
}

func (d *NHentaiComDownloader) extractSlug(url string) string {
	re := regexp.MustCompile(`/en/comic/([^/?#]+)`)
	match := re.FindStringSubmatch(url)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}
