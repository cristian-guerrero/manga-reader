package downloader

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
)

type MangaDexDownloader struct{}

// API response types
type mangaDexAtHomeResponse struct {
	Result  string `json:"result"`
	BaseURL string `json:"baseUrl"`
	Chapter struct {
		Hash      string   `json:"hash"`
		Data      []string `json:"data"`
		DataSaver []string `json:"dataSaver"`
	} `json:"chapter"`
}

type mangaDexChapterResponse struct {
	Result string `json:"result"`
	Data   struct {
		ID         string `json:"id"`
		Attributes struct {
			Volume             string `json:"volume"`
			Chapter            string `json:"chapter"`
			Title              string `json:"title"`
			TranslatedLanguage string `json:"translatedLanguage"`
		} `json:"attributes"`
		Relationships []struct {
			ID   string `json:"id"`
			Type string `json:"type"`
		} `json:"relationships"`
	} `json:"data"`
}

type mangaDexMangaResponse struct {
	Result string `json:"result"`
	Data   struct {
		Attributes struct {
			Title map[string]string `json:"title"`
		} `json:"attributes"`
	} `json:"data"`
}

type mangaDexFeedResponse struct {
	Result string `json:"result"`
	Data   []struct {
		ID         string `json:"id"`
		Attributes struct {
			Volume             string `json:"volume"`
			Chapter            string `json:"chapter"`
			Title              string `json:"title"`
			TranslatedLanguage string `json:"translatedLanguage"`
			PublishAt          string `json:"publishAt"`
		} `json:"attributes"`
		Relationships []struct {
			ID   string `json:"id"`
			Type string `json:"type"`
		} `json:"relationships"`
	} `json:"data"`
	Total  int `json:"total"`
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

func (d *MangaDexDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "mangadex.org")
}

func (d *MangaDexDownloader) GetSiteID() string {
	return "mangadex.org"
}

func (d *MangaDexDownloader) GetImages(url string) (*SiteInfo, error) {
	// Extract chapter UUID from URL
	// Example: https://mangadex.org/chapter/d8176d81-0f14-4d5a-9d0b-fc56b3933cce
	reUUID := regexp.MustCompile(`/chapter/([0-9a-f-]{36})`)
	match := reUUID.FindStringSubmatch(url)

	reTitleUUID := regexp.MustCompile(`/title/([0-9a-f-]{36})`)
	matchTitle := reTitleUUID.FindStringSubmatch(url)

	if len(matchTitle) >= 2 {
		// It's a series
		mangaID := matchTitle[1]
		client := &http.Client{}

		mangaInfo, err := d.getMangaInfo(client, mangaID)
		if err != nil {
			return nil, fmt.Errorf("failed to get manga info: %v", err)
		}

		chapters, err := d.getMangaChapters(client, mangaID)
		if err != nil {
			return nil, fmt.Errorf("failed to get chapters: %v", err)
		}

		return &SiteInfo{
			SeriesName: d.extractTitle(mangaInfo.Data.Attributes.Title),
			Type:       "series",
			Chapters:   chapters, // All chapters, multi-language
			SiteID:     d.GetSiteID(),
		}, nil
	}

	if len(match) < 2 {
		return nil, fmt.Errorf("could not extract chapter ID or manga ID from URL")
	}
	chapterID := match[1]

	client := &http.Client{}

	// 1. Get chapter metadata
	chapterInfo, err := d.getChapterInfo(client, chapterID)
	if err != nil {
		return nil, fmt.Errorf("failed to get chapter info: %v", err)
	}

	// 2. Get manga title
	mangaID := ""
	for _, rel := range chapterInfo.Data.Relationships {
		if rel.Type == "manga" {
			mangaID = rel.ID
			break
		}
	}

	mangaTitle := "Unknown Manga"
	if mangaID != "" {
		mangaInfo, err := d.getMangaInfo(client, mangaID)
		if err == nil {
			mangaTitle = d.extractTitle(mangaInfo.Data.Attributes.Title)
		}
	}

	// 3. Get image URLs from at-home endpoint
	atHome, err := d.getAtHomeServer(client, chapterID)
	if err != nil {
		return nil, fmt.Errorf("failed to get image server: %v", err)
	}

	// Build image list using high quality (data) images
	images := make([]ImageDownload, len(atHome.Chapter.Data))
	for i, filename := range atHome.Chapter.Data {
		// URL format: {baseUrl}/data/{hash}/{filename}
		imageURL := fmt.Sprintf("%s/data/%s/%s", atHome.BaseURL, atHome.Chapter.Hash, filename)

		// Extract extension from filename
		ext := "jpg"
		if idx := strings.LastIndex(filename, "."); idx != -1 {
			ext = filename[idx+1:]
		}

		images[i] = ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d.%s", i+1, ext),
			Index:    i,
		}
	}

	// Build chapter name
	chapterName := "Chapter"
	if chapterInfo.Data.Attributes.Chapter != "" {
		chapterName = fmt.Sprintf("Chapter %s", chapterInfo.Data.Attributes.Chapter)
	}
	if chapterInfo.Data.Attributes.Title != "" {
		chapterName = fmt.Sprintf("%s - %s", chapterName, chapterInfo.Data.Attributes.Title)
	}

	// Append language code
	if lang := chapterInfo.Data.Attributes.TranslatedLanguage; lang != "" {
		chapterName = fmt.Sprintf("%s [%s]", chapterName, lang)
	}

	return &SiteInfo{
		SeriesName:  mangaTitle,
		ChapterName: chapterName,
		Images:      images,
		SiteID:      d.GetSiteID(),
	}, nil
}

func (d *MangaDexDownloader) getChapterInfo(client *http.Client, chapterID string) (*mangaDexChapterResponse, error) {
	url := fmt.Sprintf("https://api.mangadex.org/chapter/%s", chapterID)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result mangaDexChapterResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

func (d *MangaDexDownloader) getMangaInfo(client *http.Client, mangaID string) (*mangaDexMangaResponse, error) {
	url := fmt.Sprintf("https://api.mangadex.org/manga/%s", mangaID)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result mangaDexMangaResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

func (d *MangaDexDownloader) getAtHomeServer(client *http.Client, chapterID string) (*mangaDexAtHomeResponse, error) {
	url := fmt.Sprintf("https://api.mangadex.org/at-home/server/%s", chapterID)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result mangaDexAtHomeResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

func (d *MangaDexDownloader) extractTitle(titles map[string]string) string {
	// Prefer English title, then Japanese romanized, then any available
	if title, ok := titles["en"]; ok && title != "" {
		return title
	}
	if title, ok := titles["ja-ro"]; ok && title != "" {
		return title
	}
	// Return first available title
	for _, title := range titles {
		if title != "" {
			return title
		}
	}
	return "Unknown Manga"
}
