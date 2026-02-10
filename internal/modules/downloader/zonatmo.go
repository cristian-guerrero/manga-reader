package downloader

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type ZonaTMODownloader struct{}

func normalizeZonaTMOSeriesName(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return raw
	}

	// Remove HTML tags but keep their text content
	reTags := regexp.MustCompile(`<[^>]*>`)
	raw = reTags.ReplaceAllString(raw, "")
	raw = strings.TrimSpace(raw)

	// ZonaTMO sometimes appends the year like "(2025)" and occasionally a trailing ":".
	// We normalize by removing that trailing year suffix so series + chapter downloads
	// produce the same folder name.
	reTrailingYear := regexp.MustCompile(`\(\s*\d{4}\s*\)\s*:?\s*$`)
	raw = reTrailingYear.ReplaceAllString(raw, "")

	return strings.TrimSpace(raw)
}

func (d *ZonaTMODownloader) CanHandle(url string) bool {
	return strings.Contains(url, "zonatmo.com") ||
		strings.Contains(url, "tmofans.com") ||
		strings.Contains(url, "lectortmo.com") ||
		strings.Contains(url, "turomance.com") ||
		strings.Contains(url, "tumangaonline.com")
}

func (d *ZonaTMODownloader) GetSiteID() string {
	return "zonatmo"
}

func (d *ZonaTMODownloader) GetImages(viewerURL string) (*SiteInfo, error) {
	return d.getImagesWithRetry(viewerURL, 3)
}

func (d *ZonaTMODownloader) getImagesWithRetry(viewerURL string, retries int) (*SiteInfo, error) {
	// Check if it is a series URL
	isSeries := strings.Contains(viewerURL, "/library/")

	if !isSeries {
		// Force cascade mode for easier parsing
		viewerURL = strings.Replace(viewerURL, "/paginated", "/cascade", 1)
	}

	// Extract domain for referer
	referer := "https://zonatmo.com/"
	if strings.Contains(viewerURL, "lectortmo.com") {
		referer = "https://lectortmo.com/"
	} else if strings.Contains(viewerURL, "tmofans.com") {
		referer = "https://tmofans.com/"
	} else if strings.Contains(viewerURL, "turomance.com") {
		referer = "https://turomance.com/"
	} else if strings.Contains(viewerURL, "tumangaonline.com") {
		referer = "https://tumangaonline.com/"
	}

	var lastErr error
	for i := 0; i <= retries; i++ {
		if i > 0 {
			time.Sleep(time.Duration(i) * 2 * time.Second)
		}

		client := &http.Client{
			Timeout: 30 * time.Second,
		}
		req, _ := http.NewRequest("GET", viewerURL, nil)
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
		req.Header.Set("Referer", referer)

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("status code %d", resp.StatusCode)
			if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
				continue
			}
			return nil, lastErr
		}

		// Check if we were redirected to a paginated view
		finalURL := resp.Request.URL.String()
		if strings.Contains(finalURL, "/paginated") {
			cascadeURL := strings.Replace(finalURL, "/paginated", "/cascade", 1)
			return d.GetImages(cascadeURL)
		}

		body, _ := io.ReadAll(resp.Body)
		bodyStr := string(body)

		// Check for meta refresh redirect (seen in view_uploads links)
		reRedirect := regexp.MustCompile(`(?i)<meta\s+http-equiv="refresh"\s+content="[^"]*url='?([^"']*)'?`)
		if match := reRedirect.FindStringSubmatch(bodyStr); len(match) > 1 {
			redirectURL := match[1]
			// Handle relative redirect
			if strings.HasPrefix(redirectURL, "/") {
				parts := strings.Split(viewerURL, "/")
				if len(parts) >= 3 {
					baseURL := parts[0] + "//" + parts[2]
					redirectURL = baseURL + redirectURL
				}
			}
			return d.getImagesWithRetry(redirectURL, retries)
		}

		if isSeries {
			return d.parseSeries(bodyStr, viewerURL)
		}

		seriesName := "Unknown"
		chapterName := "Chapter"

		// Extract Series Name from <h1>
		reSeries := regexp.MustCompile(`(?s)<h1>(.*?)</h1>`)
		if match := reSeries.FindStringSubmatch(bodyStr); len(match) > 1 {
			seriesName = normalizeZonaTMOSeriesName(match[1])
		}

		// Extract Chapter Name from <h2>
		reChapter := regexp.MustCompile(`(?s)<h2>(.*?)</h2>`)
		if match := reChapter.FindStringSubmatch(bodyStr); len(match) > 1 {
			fullTitle := strings.TrimSpace(match[1])
			fullTitle = strings.Join(strings.Fields(fullTitle), " ")

			if idx := strings.Index(fullTitle, "Subido por"); idx != -1 {
				chapterName = strings.TrimSpace(fullTitle[:idx])
			} else {
				chapterName = fullTitle
			}
		}

		var images []ImageDownload
		reTag := regexp.MustCompile(`<img[^>]+>`)
		reDataSrc := regexp.MustCompile(`data-src=["'](.*?)["']`)
		allTags := reTag.FindAllString(bodyStr, -1)

		for _, tag := range allTags {
			if strings.Contains(tag, "viewer-img") {
				matchSrc := reDataSrc.FindStringSubmatch(tag)
				if len(matchSrc) > 1 {
					imgURL := matchSrc[1]
					ext := "jpg"
					if idx := strings.LastIndex(imgURL, "."); idx != -1 {
						ext = imgURL[idx+1:]
						if qIdx := strings.Index(ext, "?"); qIdx != -1 {
							ext = ext[:qIdx]
						}
					}

					images = append(images, ImageDownload{
						URL:      imgURL,
						Filename: fmt.Sprintf("%03d.%s", len(images)+1, ext),
						Index:    len(images),
						Headers: map[string]string{
							"Referer": referer,
						},
					})
				}
			}
		}

		if len(images) == 0 {
			// Some chapters might be empty or have a different layout, retry once more if possible
			lastErr = fmt.Errorf("no images found")
			continue
		}

		return &SiteInfo{
			SeriesName:  seriesName,
			ChapterName: chapterName,
			Images:      images,
			SiteID:      d.GetSiteID(),
		}, nil
	}

	return nil, fmt.Errorf("failed after retries: %v", lastErr)
}

func (d *ZonaTMODownloader) parseSeries(html string, url string) (*SiteInfo, error) {
	// Extract Series Name
	seriesName := "Unknown Series"

	// Try standard TMO h1 or h2 with class 'element-title'
	reTitleClass := regexp.MustCompile(`(?s)<[hH][12][^>]*class="[^"]*element-title[^"]*"[^>]*>(.*?)</[hH][12]>`)
	if match := reTitleClass.FindStringSubmatch(html); len(match) > 1 {
		seriesName = match[1]
	} else {
		// Fallback to <title> tag
		reTitleTag := regexp.MustCompile(`(?s)<title>(.*?)</title>`)
		if match := reTitleTag.FindStringSubmatch(html); len(match) > 1 {
			title := strings.TrimSpace(match[1])
			// Title often has " - SubManga" or similar suffix
			if idx := strings.Index(title, " - "); idx != -1 {
				seriesName = title[:idx]
			} else {
				seriesName = title
			}
		}
	}

	// Normalize title so series + chapter downloads produce the same folder name
	seriesName = normalizeZonaTMOSeriesName(seriesName)

	chapters := []ChapterInfo{}

	// Splitting by upload-link which is the container for each chapter.
	// We use upload-link instead of list-group-item because the latter is also
	// used for individual group rows inside the chapter container.
	blocks := strings.Split(html, "upload-link")
	for i, block := range blocks {
		if i == 0 {
			continue
		}

		// Find Chapter Name - Look for h4 or similar within this block
		reName := regexp.MustCompile(`Cap[íi]tulo\s+[\d\.]+|One\s+Shot`)
		nameMatch := reName.FindString(block)
		if nameMatch == "" {
			continue
		}
		chapterName := strings.TrimSpace(nameMatch)
		// Clean the name from FIN or other tags if they got caught,
		// though FindString only caught the match.
		// Actually let's just use it as is.

		// Find Date if possible (format: YYYY-MM-DD or DD/MM/YYYY)
		reDate := regexp.MustCompile(`\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}`)
		dateMatch := reDate.FindString(block)

		// Find all view_uploads links - each represents a group
		reLink := regexp.MustCompile(`href="([^"]*/view_uploads/(\d+))"`)
		allLinks := reLink.FindAllStringSubmatch(block, -1)

		for _, linkMatch := range allLinks {
			chapterURL := linkMatch[1]
			id := linkMatch[2]

			// To find the group name, we look backwards from the link match
			linkIdx := strings.Index(block, chapterURL)
			prefix := block[:linkIdx]

			groupName := "Unknown Group"
			// Zonatmo groups: <a href=".../groups/(\d+)/(.*?)" ...>(.*?)</a>
			reGroup := regexp.MustCompile(`(?s)<a[^>]+href="[^"]*/groups/\d+/[^"]*"[^>]*>(.*?)</a>`)
			groupMatches := reGroup.FindAllStringSubmatch(prefix, -1)
			if len(groupMatches) > 0 {
				lastGroupMatch := groupMatches[len(groupMatches)-1]
				groupName = strings.TrimSpace(lastGroupMatch[1])
				// Clean HTML from group name
				groupName = regexp.MustCompile(`<[^>]*>`).ReplaceAllString(groupName, "")
			}

			// Handle relative URLs
			if strings.HasPrefix(chapterURL, "/") {
				parts := strings.Split(url, "/")
				if len(parts) >= 3 {
					baseURL := parts[0] + "//" + parts[2]
					chapterURL = baseURL + chapterURL
				}
			}

			fullChapterName := chapterName
			if groupName != "" && groupName != "Unknown Group" {
				fullChapterName = fmt.Sprintf("%s (%s)", chapterName, groupName)
			}

			chapters = append(chapters, ChapterInfo{
				ID:        id,
				Name:      fullChapterName,
				URL:       chapterURL,
				Date:      dateMatch,
				ScanGroup: groupName,
			})
		}
	}

	return &SiteInfo{
		SeriesName: seriesName,
		SiteID:     d.GetSiteID(),
		Type:       "series",
		Chapters:   chapters,
	}, nil
}
