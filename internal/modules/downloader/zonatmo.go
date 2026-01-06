package downloader

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
)

type ZonaTMODownloader struct{}

func (d *ZonaTMODownloader) CanHandle(url string) bool {
	return strings.Contains(url, "zonatmo.com") || strings.Contains(url, "tmofans.com")
}

func (d *ZonaTMODownloader) GetSiteID() string {
	return "zonatmo"
}

func (d *ZonaTMODownloader) GetImages(viewerURL string) (*SiteInfo, error) {
	// Check if it is a series URL
	isSeries := strings.Contains(viewerURL, "/library/manga/")

	if !isSeries {
		// Force cascade mode for easier parsing
		viewerURL = strings.Replace(viewerURL, "/paginated", "/cascade", 1)
	}

	client := &http.Client{}
	req, _ := http.NewRequest("GET", viewerURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Referer", "https://zonatmo.com/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

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
		return d.GetImages(redirectURL)
	}

	if isSeries {
		return d.parseSeries(bodyStr, viewerURL)
	}

	seriesName := "Unknown"
	chapterName := "Chapter"

	// Extract Series Name from <h1>
	reSeries := regexp.MustCompile(`(?s)<h1>(.*?)</h1>`)
	if match := reSeries.FindStringSubmatch(bodyStr); len(match) > 1 {
		seriesName = strings.TrimSpace(match[1])
	}

	// Extract Chapter Name from <h2>
	reChapter := regexp.MustCompile(`(?s)<h2>(.*?)</h2>`)
	if match := reChapter.FindStringSubmatch(bodyStr); len(match) > 1 {
		// The h2 often contains "Chapter X Subido por ...". cleaning it might be good but let's take it raw or split
		// Based on HTML: <h2> Capítulo 168.00 Subido por ...
		fullTitle := strings.TrimSpace(match[1])
		// Replace newlines and tabs with spaces to make it a single line string for easier processing
		fullTitle = strings.Join(strings.Fields(fullTitle), " ")

		if idx := strings.Index(fullTitle, "Subido por"); idx != -1 {
			chapterName = strings.TrimSpace(fullTitle[:idx])
		} else {
			chapterName = fullTitle
		}
	}

	// Extract Images from <img ... class="viewer-img" ... data-src="...">
	// The order of attributes might vary, so we look for class="viewer-img" and capture data-src
	// A robust regex for this specific case where we saw the output:
	// <img src="..." ... data-src="URL" class="viewer-img" ...>
	// We can iterate over all img tags and check for class="viewer-img"
	reImg := regexp.MustCompile(`<img[^>]+class=["']viewer-img["'][^>]*>`)
	reDataSrc := regexp.MustCompile(`data-src=["'](.*?)["']`)

	imgMatches := reImg.FindAllString(bodyStr, -1)
	if len(imgMatches) == 0 {
		// Try alternative order or just data-src with viewer-img class check implicitly if above fails
		// Let's try to just find all data-src inside tags that look like they might be viewer images if the strict class check fails?
		// But the grep output showed `class="viewer-img"` exists.
		// Let's try a simpler regex that captures data-src from the whole file if they are unique enough,
		// or stick to the tag parsing.
		// Attempting a slightly looser tag match in case attributes are reordered
		// We want data-src value where the tag also contains class="viewer-img"
		// Since regex validation on HTML is tricky, let's just find all `data-src` if we are confident they are the manga images.
		// The grep showed `data-src` is on the viewer images. Let's trust that mainly.
		// But let's refine: find `data-src="..."`
	}

	var images []ImageDownload
	// Refined approach: Find all strings that look like valid image tags with viewer-img class
	// Because regex cannot easily handle "tag with attribute A AND attribute B in any order",
	// we will find all `data-src` URLs and assume they are the images if existing logic fails?
	// No, that's risky.
	// Let's iterate over all `<img ...>` tags and check if they contain `viewer-img` and `data-src`.
	reTag := regexp.MustCompile(`<img[^>]+>`)
	allTags := reTag.FindAllString(bodyStr, -1)

	for _, tag := range allTags {
		if strings.Contains(tag, "viewer-img") {
			matchSrc := reDataSrc.FindStringSubmatch(tag)
			if len(matchSrc) > 1 {
				imgURL := matchSrc[1]

				// Determine extension
				ext := "jpg"
				if idx := strings.LastIndex(imgURL, "."); idx != -1 {
					ext = imgURL[idx+1:]
				}

				images = append(images, ImageDownload{
					URL:      imgURL,
					Filename: fmt.Sprintf("%03d.%s", len(images)+1, ext),
					Index:    len(images),
					Headers: map[string]string{
						"Referer": "https://zonatmo.com/",
					},
				})
			}
		}
	}

	if len(images) == 0 {
		return nil, fmt.Errorf("no images found")
	}

	return &SiteInfo{
		SeriesName:  seriesName,
		ChapterName: chapterName,
		Images:      images,
		SiteID:      d.GetSiteID(),
	}, nil
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

	// Clean up any HTML tags in the title (e.g. <small> year </small>)
	reTags := regexp.MustCompile(`<[^>]*>`)
	seriesName = reTags.ReplaceAllString(seriesName, "")
	seriesName = strings.TrimSpace(seriesName)

	var chapters []ChapterInfo

	blocks := strings.Split(html, "upload-link")
	for i, block := range blocks {
		if i == 0 {
			continue
		} // skip preamble

		// Find Chapter Name
		reName := regexp.MustCompile(`Cap[íi]tulo\s+[\d\.]+|One\s+Shot`)
		nameMatch := reName.FindString(block)
		if nameMatch == "" {
			continue
		}
		chapterName := strings.TrimSpace(nameMatch)

		// Find Collapsible ID
		reID := regexp.MustCompile(`collapseChapter\('([^']+)'\)`)
		idMatch := reID.FindStringSubmatch(block)
		if len(idMatch) < 2 {
			continue
		}
		collapsibleID := idMatch[1]

		// Find view_uploads link inside the specific collapsible div
		reLink := regexp.MustCompile(`href="(https://zonatmo\.com/view_uploads/\d+)"`)
		linkMatch := reLink.FindStringSubmatch(block)

		// Verify presence of id="collapsibleID"
		if !strings.Contains(block, `id="`+collapsibleID+`"`) {
			continue
		}

		if len(linkMatch) > 1 {
			url := linkMatch[1]
			// Use the ID from the URL as ID
			parts := strings.Split(url, "/")
			id := parts[len(parts)-1]

			chapters = append(chapters, ChapterInfo{
				ID:   id,
				Name: chapterName,
				URL:  url,
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
