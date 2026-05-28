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

type MairimashitaIrumaDownloader struct{}

func (d *MairimashitaIrumaDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "mairimashitairuma-kun.com")
}

func (d *MairimashitaIrumaDownloader) GetSiteID() string {
	return "mairimashitairuma-kun.com"
}

func (d *MairimashitaIrumaDownloader) GetImages(viewerURL string) (*SiteInfo, error) {
	viewerURL = strings.TrimSuffix(viewerURL, "/")

	reChapter := regexp.MustCompile(`mairimashitairuma-kun\.com/manga/mairimashita-iruma-kun-chapter-\d`)
	isChapter := reChapter.MatchString(viewerURL)

	if !isChapter {
		return d.getSeries(viewerURL)
	}

	return d.getChapter(viewerURL)
}

func (d *MairimashitaIrumaDownloader) getChapter(url string) (*SiteInfo, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Referer", "https://mairimashitairuma-kun.com/")

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

	seriesName := "Mairimashita Iruma-Kun"
	chapterName := ""

	reTitle := regexp.MustCompile(`(?s)<title>\s*(.*?)\s*</title>`)
	if match := reTitle.FindStringSubmatch(bodyStr); len(match) > 1 {
		title := html.UnescapeString(strings.TrimSpace(match[1]))
		title = strings.TrimSuffix(title, " - Mairimashita Iruma-Kun Manga Online")
		title = strings.TrimSpace(title)
		if idx := strings.LastIndex(title, ", "); idx != -1 {
			seriesName = strings.TrimSpace(title[:idx])
			chapterName = strings.TrimSpace(title[idx+2:])
		} else {
			seriesName = title
		}
	}

	reImages := regexp.MustCompile(`(?s)<img[^>]+src=['"](https://blogger\.googleusercontent\.com[^'"]+)['"]`)
	matches := reImages.FindAllStringSubmatch(bodyStr, -1)

	var images []ImageDownload
	seen := make(map[string]bool)

	for i, match := range matches {
		imageURL := match[1]
		if seen[imageURL] {
			continue
		}
		seen[imageURL] = true

		parts := strings.Split(imageURL, "/")
		filename := parts[len(parts)-1]
		if filename == "" {
			filename = fmt.Sprintf("%03d.png", i+1)
		}

		images = append(images, ImageDownload{
			URL:      imageURL,
			Filename: filename,
			Index:    i,
			Headers: map[string]string{
				"Referer":    url,
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
			},
		})
	}

	if len(images) == 0 {
		return nil, fmt.Errorf("no images found in chapter page")
	}

	return &SiteInfo{
		SeriesName:    seriesName,
		ChapterName:   chapterName,
		Images:        images,
		SiteID:        d.GetSiteID(),
		DownloadDelay: 500 * time.Millisecond,
		Type:          "single",
	}, nil
}

func (d *MairimashitaIrumaDownloader) getSeries(url string) (*SiteInfo, error) {
	baseURL := "https://mairimashitairuma-kun.com/manga/"

	client := &http.Client{Timeout: 30 * time.Second}

	var chapters []ChapterInfo
	seen := make(map[string]bool)
	page := 1

	for {
		pageURL := baseURL
		if page > 1 {
			pageURL = fmt.Sprintf("%spage/%d/", baseURL, page)
		}

		req, _ := http.NewRequest("GET", pageURL, nil)
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
		req.Header.Set("Referer", "https://mairimashitairuma-kun.com/")

		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch page %d: %w", page, err)
		}

		if resp.StatusCode != http.StatusOK {
			if page == 1 {
				return nil, fmt.Errorf("status code %d", resp.StatusCode)
			}
			break
		}

		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		bodyStr := string(body)

		reChapters := regexp.MustCompile(`(?s)<h2 class="entry-title"[^>]*><a href="([^"]+)"[^>]*>Mairimashita Iruma-Kun,\s*(.+?)</a></h2>`)
		matches := reChapters.FindAllStringSubmatch(bodyStr, -1)

		if len(matches) == 0 {
			break
		}

		for _, match := range matches {
			chapterURL := match[1]
			chapterName := strings.TrimSpace(match[2])

			if seen[chapterURL] {
				continue
			}
			seen[chapterURL] = true

			reNum := regexp.MustCompile(`(\d[\d.]*)`)
			numMatch := reNum.FindStringSubmatch(chapterName)
			chapterID := ""
			if len(numMatch) > 1 {
				chapterID = numMatch[1]
			} else {
				chapterID = chapterName
			}

			chapters = append(chapters, ChapterInfo{
				ID:   chapterID,
				URL:  chapterURL,
				Name: "Chapter " + chapterID,
			})
		}

		reNext := regexp.MustCompile(`href="([^"]*/page/\d+/)">Next`)
		if !reNext.MatchString(bodyStr) {
			break
		}

		page++
	}

	if len(chapters) == 0 {
		return nil, fmt.Errorf("no chapters found")
	}

	return &SiteInfo{
		SeriesName: "Mairimashita Iruma-Kun",
		Chapters:   chapters,
		SiteID:     d.GetSiteID(),
		Type:       "series",
	}, nil
}
