package downloader

import (
	"fmt"
	"html"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type SubManhwaDownloader struct{}

func (d *SubManhwaDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "submanhwa.com")
}

func (d *SubManhwaDownloader) GetSiteID() string {
	return "submanhwa"
}

func (d *SubManhwaDownloader) GetImages(viewerURL string) (*SiteInfo, error) {
	// Example URLs:
	// Chapter: https://submanhwa.com/serie/boku-no-kokoro-no-yabai-yatsu/185.00
	// Series:  https://submanhwa.com/serie/boku-no-kokoro-no-yabai-yatsu

	parts := strings.Split(strings.TrimSuffix(viewerURL, "/"), "/")
	// Domain is parts[2], "serie" is parts[3], slug is parts[4], chapter is parts[5] (optional)
	isChapter := len(parts) > 5 && parts[3] == "serie"

	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	req, _ := http.NewRequest("GET", viewerURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Referer", "https://submanhwa.com/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status code %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	bodyStr := string(body)

	if !isChapter {
		return d.parseSeries(bodyStr, viewerURL)
	}

	seriesName := "Unknown"
	chapterName := "Chapter"

	// Extrar Título: <title> Boku no Kokoro no Yabai Yatsu capitulo 185.00 manhwa </title>
	reTitle := regexp.MustCompile(`(?s)<title>\s*(.*?)\s*</title>`)
	if match := reTitle.FindStringSubmatch(bodyStr); len(match) > 1 {
		title := html.UnescapeString(strings.TrimSpace(match[1]))
		lowerTitle := strings.ToLower(title)
		if idx := strings.Index(lowerTitle, "capitulo"); idx != -1 {
			seriesName = strings.TrimSpace(title[:idx])
			chapterPart := title[idx:]
			if midx := strings.Index(strings.ToLower(chapterPart), "manhwa"); midx != -1 {
				chapterName = strings.TrimSpace(chapterPart[:midx])
			} else {
				chapterName = strings.TrimSpace(chapterPart)
			}
		} else {
			seriesName = title
		}
	}

	var images []ImageDownload
	// <img class="img-responsive" src="..." data-src='https://w1.submanhwa.com/file/submanhwa/003097420203.png' alt='...'/>
	reImages := regexp.MustCompile(`(?s)<img[^>]+data-src=['"]([^'"]+)['"]`)
	matches := reImages.FindAllStringSubmatch(bodyStr, -1)

	for i, match := range matches {
		imageURL := match[1]
		ext := ".jpg"
		if dotIdx := strings.LastIndex(imageURL, "."); dotIdx != -1 {
			ext = imageURL[dotIdx:]
			if qIdx := strings.Index(ext, "?"); qIdx != -1 {
				ext = ext[:qIdx]
			}
		}

		images = append(images, ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d%s", i+1, ext),
			Index:    i,
			Headers: map[string]string{
				"Referer":         viewerURL,
				"User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
				"Accept":          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
				"Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
				"Cache-Control":   "no-cache",
				"Connection":      "keep-alive",
				"Sec-Fetch-Dest":  "image",
				"Sec-Fetch-Mode":  "no-cors",
				"Sec-Fetch-Site":  "cross-site",
			},
		})
	}

	return &SiteInfo{
		SeriesName:    seriesName,
		ChapterName:   chapterName,
		Images:        images,
		SiteID:        "submanhwa",
		DownloadDelay: 500 * time.Millisecond,
		Type:          "single",
	}, nil
}

func (d *SubManhwaDownloader) parseSeries(bodyStr, seriesURL string) (*SiteInfo, error) {
	seriesName := "Unknown"
	reTitle := regexp.MustCompile(`(?s)<title>\s*(.*?)\s*</title>`)
	if match := reTitle.FindStringSubmatch(bodyStr); len(match) > 1 {
		title := html.UnescapeString(strings.TrimSpace(match[1]))
		// Example: Boku no Kokoro no Yabai Yatsu   - Submanhwa.com
		if idx := strings.Index(title, "  -"); idx != -1 {
			seriesName = strings.TrimSpace(title[:idx])
		} else {
			seriesName = title
		}
	}

	var chapters []ChapterInfo
	parts := strings.Split(strings.TrimSuffix(seriesURL, "/"), "/")
	slug := parts[len(parts)-1]

	pattern := fmt.Sprintf(`href="(https://submanhwa\.com/serie/%s/[\d.]+)"`, regexp.QuoteMeta(slug))
	reChapters := regexp.MustCompile(pattern)
	matches := reChapters.FindAllStringSubmatch(bodyStr, -1)

	seen := make(map[string]bool)
	for _, match := range matches {
		url := match[1]
		if seen[url] {
			continue
		}
		seen[url] = true

		urlParts := strings.Split(url, "/")
		chapterID := urlParts[len(urlParts)-1]

		chapters = append(chapters, ChapterInfo{
			ID:   chapterID,
			URL:  url,
			Name: "Capítulo " + chapterID,
		})
	}

	return &SiteInfo{
		SeriesName: seriesName,
		Chapters:   chapters,
		SiteID:     "submanhwa",
		Type:       "series",
	}, nil
}
