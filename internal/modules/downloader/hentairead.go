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
	"time"
)

type HentaiReadDownloader struct{}

func (d *HentaiReadDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "hentairead.io")
}

func (d *HentaiReadDownloader) GetSiteID() string {
	return "hentairead.io"
}

func (d *HentaiReadDownloader) GetImages(url string) (*SiteInfo, error) {
	// Trim trailing slash
	trimmedURL := strings.TrimRight(url, "/")

	// Check if it's a chapter URL (contains "chapter-")
	if strings.Contains(trimmedURL, "/chapter-") {
		return d.getImagesFromChapter(url)
	}

	return d.getChaptersFromSeries(url)
}

func (d *HentaiReadDownloader) getImagesFromChapter(url string) (*SiteInfo, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Referer", "https://hentairead.io/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch chapter page: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch chapter page, status code: %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	bodyStr := string(bodyBytes)

	// Extract title metadata
	seriesName := ""
	chapterName := ""
	reTitle := regexp.MustCompile(`<title>(.*?)</title>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	if len(titleMatch) >= 2 {
		fullTitle := html.UnescapeString(titleMatch[1])
		// Example: Pool Party Chapter 29 - Hentairead.io ...
		parts := strings.Split(fullTitle, " - ")
		if len(parts) > 0 {
			nameParts := strings.Split(parts[0], " Chapter ")
			seriesName = strings.TrimSpace(nameParts[0])
			if len(nameParts) > 1 {
				chapterName = "Chapter " + strings.TrimSpace(nameParts[1])
			} else {
				chapterName = strings.TrimSpace(parts[0])
			}
		}
	}

	var imagePaths []string

	// Check for direct image tags (new format)
	reDirectImgs := regexp.MustCompile(`(?i)<div[^>]*class="[^"]*page-chapter[^"]*"[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*>`)
	directMatches := reDirectImgs.FindAllStringSubmatch(bodyStr, -1)
	
	if len(directMatches) > 0 {
		for _, m := range directMatches {
			imagePaths = append(imagePaths, m[1])
		}
	} else {
		// Extract JWT token from <input id="next_img_token" value="...">
		reToken := regexp.MustCompile(`id="next_img_token"\s+value="([^"]+)"`)
		tokenMatch := reToken.FindStringSubmatch(bodyStr)
		if len(tokenMatch) < 2 {
			return nil, fmt.Errorf("could not find images in page (no next_img_token or page-chapter wrappers)")
		}
		token := tokenMatch[1]

		// Decode JWT (middle part)
		parts := strings.Split(token, ".")
		if len(parts) < 2 {
			return nil, fmt.Errorf("invalid JWT token")
		}

		payloadRaw := parts[1]
		// Standardize base64 for decoding
		payloadRaw = strings.ReplaceAll(payloadRaw, "-", "+")
		payloadRaw = strings.ReplaceAll(payloadRaw, "_", "/")
		switch len(payloadRaw) % 4 {
		case 2:
			payloadRaw += "=="
		case 3:
			payloadRaw += "="
		}

		payloadBytes, err := base64.StdEncoding.DecodeString(payloadRaw)
		if err != nil {
			return nil, fmt.Errorf("failed to decode JWT payload: %v", err)
		}

		var payload struct {
			Data string `json:"data"`
		}
		if err := json.Unmarshal(payloadBytes, &payload); err != nil {
			return nil, fmt.Errorf("failed to unmarshal JWT payload: %v", err)
		}

		// data field is also base64 encoded JSON array
		dataBytes, err := base64.StdEncoding.DecodeString(payload.Data)
		if err != nil {
			return nil, fmt.Errorf("failed to decode data field: %v", err)
		}

		if err := json.Unmarshal(dataBytes, &imagePaths); err != nil {
			return nil, fmt.Errorf("failed to unmarshal image paths: %v", err)
		}
	}

	// Construct full URLs
	// Base CDN: https://ht.1stkmgv1.com/manga/
	baseURL := "https://ht.1stkmgv1.com/manga/"

	var images []ImageDownload
	for i, path := range imagePaths {
		fullURL := path
		if !strings.HasPrefix(fullURL, "http") {
			fullURL = baseURL + strings.TrimPrefix(path, "/")
		}

		// Ensure extension
		filename := fmt.Sprintf("%04d.jpg", i+1)
		if strings.Contains(path, ".png") {
			filename = fmt.Sprintf("%04d.png", i+1)
		} else if strings.Contains(path, ".webp") {
			filename = fmt.Sprintf("%04d.webp", i+1)
		}

		images = append(images, ImageDownload{
			URL:      fullURL,
			Filename: filename,
			Index:    i,
			Headers: map[string]string{
				"Referer":    url,
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
			},
		})
	}

	return &SiteInfo{
		SeriesName:    seriesName,
		ChapterName:   chapterName,
		Images:        images,
		SiteID:        "hentairead.io",
		Type:          "single",
		DownloadDelay: 100 * time.Millisecond,
	}, nil
}

func (d *HentaiReadDownloader) getChaptersFromSeries(url string) (*SiteInfo, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Referer", "https://hentairead.io/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch series page: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch series page, status code: %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	bodyStr := string(bodyBytes)

	// Extract series name
	seriesName := ""
	reTitle := regexp.MustCompile(`<title>(.*?)</title>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	if len(titleMatch) >= 2 {
		seriesName = html.UnescapeString(titleMatch[1])
		// Pool Party - Hentairead.io ...
		seriesName = strings.Split(seriesName, " - ")[0]
	}

	// Extract chapters from #nt_listchapter or similar
	// <div id="nt_listchapter">...<a href="https://hentairead.io/pool-party-53279/chapter-29-153792/">...
	reChapter := regexp.MustCompile(`(?s)<a\s+href="([^"]+/chapter-[^"]+)"[^>]*>(.*?)</a>`)
	matches := reChapter.FindAllStringSubmatch(bodyStr, -1)

	var chapters []ChapterInfo
	seenURLs := make(map[string]bool)

	for _, m := range matches {
		chapterURL := m[1]
		
		// Ensure absolute URL
		if !strings.HasPrefix(chapterURL, "http") {
			if strings.HasPrefix(chapterURL, "/") {
				chapterURL = "https://hentairead.io" + chapterURL
			} else {
				chapterURL = "https://hentairead.io/" + chapterURL
			}
		}

		if seenURLs[chapterURL] {
			continue
		}
		seenURLs[chapterURL] = true

		chapterName := strings.TrimSpace(m[2])
		// Clean up HTML tags in name if any
		chapterName = regexp.MustCompile(`<.*?>`).ReplaceAllString(chapterName, "")
		chapterName = html.UnescapeString(chapterName)

		// Get ID from URL
		trimmed := strings.TrimRight(chapterURL, "/")
		parts := strings.Split(trimmed, "-")
		chapterID := parts[len(parts)-1]

		chapters = append(chapters, ChapterInfo{
			ID:   chapterID,
			URL:  chapterURL,
			Name: chapterName,
		})
	}

	// Reverse chapters to have oldest first (usually they are listed newest first)
	for i, j := 0, len(chapters)-1; i < j; i, j = i+1, j-1 {
		chapters[i], chapters[j] = chapters[j], chapters[i]
	}

	return &SiteInfo{
		SeriesName: seriesName,
		SiteID:     "hentairead.io",
		Type:       "series",
		Chapters:   chapters,
	}, nil
}
