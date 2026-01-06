package downloader

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type ManhwaWebDownloader struct{}

type ManhwaChapter struct {
	Chapter struct {
		Img []string `json:"img"`
	} `json:"chapter"`
}

type ManhwaSeriesResponse struct {
	ID       string `json:"_id"`
	NameEsp  string `json:"name_esp"`
	Chapters []struct {
		Chapter float64 `json:"chapter"`
		Link    string  `json:"link"`
	} `json:"chapters"`
}

func (d *ManhwaWebDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "manhwaweb.com")
}

func (d *ManhwaWebDownloader) GetSiteID() string {
	return "manhwaweb"
}

func (d *ManhwaWebDownloader) GetImages(url string) (*SiteInfo, error) {
	if strings.Contains(url, "/manhwa/") {
		return d.getSeries(url)
	}
	return d.getChapter(url)
}

func (d *ManhwaWebDownloader) getSeries(url string) (*SiteInfo, error) {
	// URL: https://manhwaweb.com/manhwa/slug
	parts := strings.Split(url, "/")
	slug := parts[len(parts)-1]

	apiURL := fmt.Sprintf("https://manhwawebbackend-production.up.railway.app/manhwa/see/%s", slug)

	req, _ := http.NewRequest("GET", apiURL, nil)
	req.Header.Set("Referer", "https://manhwaweb.com/")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error: %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	var data ManhwaSeriesResponse
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}

	var chapters []ChapterInfo
	for _, ch := range data.Chapters {
		chapters = append(chapters, ChapterInfo{
			ID:   fmt.Sprintf("%v", ch.Chapter),
			Name: fmt.Sprintf("Chapter %v", ch.Chapter),
			URL:  ch.Link,
		})
	}

	// Reverse chapters to show newest first
	for i, j := 0, len(chapters)-1; i < j; i, j = i+1, j-1 {
		chapters[i], chapters[j] = chapters[j], chapters[i]
	}

	return &SiteInfo{
		SeriesName: data.NameEsp,
		SiteID:     d.GetSiteID(),
		Type:       "series",
		Chapters:   chapters,
	}, nil
}

func (d *ManhwaWebDownloader) getChapter(url string) (*SiteInfo, error) {
	// Handle different URL formats:
	// https://manhwaweb.com/leer/slug
	// https://manhwaweb.com/chapters/see/slug
	parts := strings.Split(url, "/")
	slug := parts[len(parts)-1]

	apiURL := fmt.Sprintf("https://manhwawebbackend-production.up.railway.app/chapters/see/%s", slug)

	req, _ := http.NewRequest("GET", apiURL, nil)
	req.Header.Set("Referer", "https://manhwaweb.com/")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error: %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	var data ManhwaChapter
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}

	seriesName := "Unknown"
	chapterName := slug

	// Try to extract series name from slug
	slugParts := strings.Split(slug, "_")
	if len(slugParts) > 0 {
		seriesName = strings.ReplaceAll(slugParts[0], "-", " ")
	}

	// Filter out empty URLs
	var images []ImageDownload
	for i, imgURL := range data.Chapter.Img {
		if imgURL == "" {
			continue
		}

		ext := "jpg"
		if strings.Contains(imgURL, ".png") {
			ext = "png"
		} else if strings.Contains(imgURL, ".webp") {
			ext = "webp"
		}

		images = append(images, ImageDownload{
			URL:      imgURL,
			Filename: fmt.Sprintf("%03d.%s", len(images)+1, ext),
			Index:    i,
		})
	}

	return &SiteInfo{
		SeriesName:  seriesName,
		ChapterName: chapterName,
		Images:      images,
		SiteID:      d.GetSiteID(),
	}, nil
}
