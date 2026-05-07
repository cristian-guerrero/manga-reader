package downloader

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type MangaToonDownloader struct{}

func (d *MangaToonDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "mangatoon.mobi") || strings.Contains(url, "mangatoon.com")
}

func (d *MangaToonDownloader) GetSiteID() string {
	return "mangatoon.mobi"
}

func (d *MangaToonDownloader) GetImages(viewerURL string) (*SiteInfo, error) {
	if !strings.HasPrefix(viewerURL, "http://") && !strings.HasPrefix(viewerURL, "https://") {
		viewerURL = "https://mangatoon.mobi" + viewerURL
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Get(viewerURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch page: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read body: %w", err)
	}

	bodyStr := string(body)

	if strings.Contains(viewerURL, "/en/watch/") || strings.Contains(viewerURL, "/contents/watch") {
		return d.parseChapter(bodyStr, viewerURL)
	}

	return d.parseSeries(bodyStr, viewerURL)
}

func (d *MangaToonDownloader) parseChapter(bodyStr string, chapterURL string) (*SiteInfo, error) {
	reTitle := regexp.MustCompile(`(?s)<title>\s*(.*?)\s*</title>`)
	title := ""
	if match := reTitle.FindStringSubmatch(bodyStr); len(match) > 1 {
		title = strings.TrimSpace(match[1])
	}

	seriesName := "Unknown Series"
	chapterName := "Chapter"

	if title != "" {
		parts := strings.Split(title, " - ")
		if len(parts) >= 2 {
			chapterName = strings.TrimSpace(parts[0])
			seriesName = strings.TrimSpace(parts[1])
			if strings.Contains(seriesName, " - MangaToon") {
				seriesName = strings.TrimSpace(seriesName[:strings.Index(seriesName, " - MangaToon")])
			}
		} else {
			if strings.Contains(title, " - MangaToon") {
				seriesName = strings.TrimSpace(title[:strings.Index(title, " - MangaToon")])
			} else {
				seriesName = title
			}
		}
	}

	var images []ImageDownload
	reImages := regexp.MustCompile(`(?s)<img[^>]+class="lazyload_img"[^>]+data-src=["']([^"']+)["'][^>]*>`)
	imgMatches := reImages.FindAllStringSubmatch(bodyStr, -1)

	for i, match := range imgMatches {
		imageURL := strings.TrimSpace(match[1])
		if strings.HasPrefix(imageURL, "/") {
			imageURL = "https:" + imageURL
		}
		images = append(images, ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%04d.jpg", i+1),
			Index:    i,
			Headers: map[string]string{
				"Referer": "https://mangatoon.mobi/",
			},
		})
	}

	if len(images) == 0 {
		reFallback := regexp.MustCompile(`(?s)<img[^>]+data-src=["']([^"']+)["'][^>]*>`)
		imgMatches := reFallback.FindAllStringSubmatch(bodyStr, -1)
		for i, match := range imgMatches {
			imageURL := strings.TrimSpace(match[1])
			if !strings.HasPrefix(imageURL, "/") && !strings.HasPrefix(imageURL, "http") {
				imageURL = "https:" + imageURL
			}
			if (strings.Contains(imageURL, "mangatoon") || strings.Contains(imageURL, "itoon")) &&
				!strings.Contains(imageURL, "content_cover_default") {
				images = append(images, ImageDownload{
					URL:      imageURL,
					Filename: fmt.Sprintf("%04d.jpg", i+1),
					Index:    i,
					Headers: map[string]string{
						"Referer": "https://mangatoon.mobi/",
					},
				})
			}
		}
	}

	if len(images) == 0 {
		return &SiteInfo{
			SeriesName:    seriesName,
			ChapterName:   chapterName,
			Images:        []ImageDownload{},
			SiteID:        d.GetSiteID(),
			DownloadDelay: 500 * time.Millisecond,
			Type:          "single",
		}, nil
	}

	return &SiteInfo{
		SeriesName:    seriesName,
		ChapterName:   chapterName,
		Images:        images,
		SiteID:        d.GetSiteID(),
		DownloadDelay: 500 * time.Millisecond,
		Type:          "single",
		Extra: map[string]string{
			"content_id": extractContentId(chapterURL),
		},
	}, nil
}

func (d *MangaToonDownloader) parseSeries(bodyStr string, seriesURL string) (*SiteInfo, error) {
	reTitle := regexp.MustCompile(`(?s)<title>\s*(.*?)\s*</title>`)
	reMetaTitle := regexp.MustCompile(`(?s)<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']`)

	title := ""
	if match := reTitle.FindStringSubmatch(bodyStr); len(match) > 1 {
		title = strings.TrimSpace(match[1])
	}
	if title == "" {
		if match := reMetaTitle.FindStringSubmatch(bodyStr); len(match) > 1 {
			title = strings.TrimSpace(match[1])
		}
	}

	seriesName := "Unknown Series"
	if title != "" {
		if strings.Contains(title, " - MangaToon") {
			seriesName = strings.TrimSpace(title[:strings.Index(title, " - MangaToon")])
		} else {
			seriesName = title
		}
	}

	reChapters := regexp.MustCompile(`(?s)<a[^>]*class="episode-item-new"[^>]*>\s*.*?</a>`)
	matches := reChapters.FindAllStringSubmatch(bodyStr, -1)

	var chapters []ChapterInfo
	for _, match := range matches {
		block := match[0]
		chapterID := ""
		chapterPath := ""
		var episodeNum string

		reDataId := regexp.MustCompile(`data-id=["'](\d+)["']`)
		if m := reDataId.FindStringSubmatch(block); len(m) > 1 {
			chapterID = m[1]
		}

		reHref := regexp.MustCompile(`href=["'](/en/watch/\d+/\d+)["']`)
		if m := reHref.FindStringSubmatch(block); len(m) > 1 {
			chapterPath = m[1]
		}

		reEpNumber := regexp.MustCompile(`(?s)<div[^>]*class="episode-number"[^>]*>\s*(\d+)\s*</div>`)
		if m := reEpNumber.FindStringSubmatch(block); len(m) > 1 {
			episodeNum = m[1]
		}

		reEpText := regexp.MustCompile(`(?i)<div[^>]*class="episode-title-new"[^>]*>\s*Episode\s+(\d+)`)
		if episodeNum == "" {
			if m := reEpText.FindStringSubmatch(block); len(m) > 1 {
				episodeNum = m[1]
			}
		}

		if chapterID != "" && chapterPath != "" {
			if episodeNum == "" {
				episodeNum = chapterID
			}
			chapters = append(chapters, ChapterInfo{
				ID:   chapterID,
				Name: fmt.Sprintf("Episode %s", episodeNum),
				URL:  "https://mangatoon.mobi" + chapterPath,
			})
		}
	}

	return &SiteInfo{
		SeriesName: seriesName,
		Chapters:   chapters,
		SiteID:     d.GetSiteID(),
		Type:       "series",
		Extra: map[string]string{
			"content_id": extractContentId(seriesURL),
		},
	}, nil
}

func extractContentId(url string) string {
	re := regexp.MustCompile(`content_id=(\d+)`)
	match := re.FindStringSubmatch(url)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}
