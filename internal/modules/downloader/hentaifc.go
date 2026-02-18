package downloader

import (
	"fmt"
	"html"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

type HentaifcDownloader struct{}

func (d *HentaifcDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "hentaifc.com")
}

func (d *HentaifcDownloader) GetSiteID() string {
	return "hentaifc.com"
}

func (d *HentaifcDownloader) GetImages(url string) (*SiteInfo, error) {
	// Detect if it's a chapter, a series, or a list (artist, tag, parody)
	// Chapter: https://hentaifc.com/e/80347/c0
	// Series: https://hentaifc.com/e/80347
	// Artist: https://hentaifc.com/artist/rakujin.886
	reChapter := regexp.MustCompile(`hentaifc\.com/e/\d+/c\d+`)
	if reChapter.MatchString(url) {
		return d.getChapter(url)
	}

	reList := regexp.MustCompile(`hentaifc\.com/(artist|tag|parody)/`)
	if reList.MatchString(url) {
		return d.getList(url)
	}

	return d.getSeries(url)
}

func (d *HentaifcDownloader) getList(url string) (*SiteInfo, error) {
	client := &http.Client{}

	seriesName := "HentaiFC List"
	var allChapters []ChapterInfo
	seen := make(map[string]bool)

	currentPageURL := url

	// Loop to handle potential pagination
	for page := 1; page <= 10; page++ { // Limit to 10 pages for now
		req, err := http.NewRequest("GET", currentPageURL, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

		resp, err := client.Do(req)
		if err != nil {
			if page == 1 {
				return nil, fmt.Errorf("failed to fetch list page: %v", err)
			}
			break
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			if page == 1 {
				return nil, fmt.Errorf("failed to fetch list page, status code: %d", resp.StatusCode)
			}
			break
		}

		bodyBytes, err := io.ReadAll(resp.Body)
		if err != nil {
			break
		}
		bodyStr := string(bodyBytes)

		// Extract artist/tag/parody name only once
		if page == 1 {
			// Try title first
			reTitle := regexp.MustCompile(`<title>(.*?) - HentaiFC</title>`)
			if match := reTitle.FindStringSubmatch(bodyStr); len(match) > 1 {
				seriesName = html.UnescapeString(match[1])
			} else {
				// Try block-title as fallback
				reBlockTitle := regexp.MustCompile(`<div class="block-title"><span><i class="uk-icon-[^"]+"></i> (.*?)</span></div>`)
				if match := reBlockTitle.FindStringSubmatch(bodyStr); len(match) > 1 {
					seriesName = html.UnescapeString(match[1])
				}
			}
		}

		// Extract series/works
		// <h3 class="title"><a href="https://hentaifc.com/e/80665">...</a></h3>
		reSeries := regexp.MustCompile(`<h3 class="title">\s*<a href="(https://hentaifc\.com/e/(\d+))">(.*?)</a>`)
		matches := reSeries.FindAllStringSubmatch(bodyStr, -1)

		for _, match := range matches {
			sURL := match[1]
			sID := match[2]
			sTitle := html.UnescapeString(match[3])

			if seen[sURL] {
				continue
			}
			seen[sURL] = true

			allChapters = append(allChapters, ChapterInfo{
				ID:   sID,
				Name: sTitle,
				URL:  sURL,
			})
		}

		// Check for next page
		// <a class="next page-numbers" href="https://hentaifc.com/tag/big-breasts/page/2">&rsaquo;</a>
		reNext := regexp.MustCompile(`<a class="next page-numbers" href="([^"]+)">`)
		nextMatch := reNext.FindStringSubmatch(bodyStr)
		if len(nextMatch) < 2 {
			break
		}
		currentPageURL = nextMatch[1]
		if !strings.HasPrefix(currentPageURL, "http") {
			currentPageURL = "https://hentaifc.com" + currentPageURL
		}
	}

	if len(allChapters) == 0 {
		return nil, fmt.Errorf("no series found in this list")
	}

	return &SiteInfo{
		SeriesName: seriesName,
		SiteID:     "hentaifc.com",
		Type:       "series",
		Chapters:   allChapters,
	}, nil
}

func (d *HentaifcDownloader) getChapter(url string) (*SiteInfo, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

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

	// Extract title
	seriesName := "Unknown"
	reTitle := regexp.MustCompile(`<title>(.*?) - Chapter \d+ - HentaiFC</title>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	if len(titleMatch) > 1 {
		seriesName = html.UnescapeString(titleMatch[1])
	} else {
		// Fallback for title extraction
		reTitleFallback := regexp.MustCompile(`<title>(.*?)</title>`)
		titleMatchFallback := reTitleFallback.FindStringSubmatch(bodyStr)
		if len(titleMatchFallback) > 1 {
			seriesName = html.UnescapeString(titleMatchFallback[1])
		}
	}

	chapterName := "Chapter"
	reChapterLabel := regexp.MustCompile(`<span>(Chapter \d+)</span>`)
	chapterMatch := reChapterLabel.FindStringSubmatch(bodyStr)
	if len(chapterMatch) > 1 {
		chapterName = chapterMatch[1]
	}

	// Extract ytaw array
	// var ytaw=['...', '...'];
	reYtaw := regexp.MustCompile(`var ytaw=\[(.*?)\];`)
	ytawMatch := reYtaw.FindStringSubmatch(bodyStr)
	if len(ytawMatch) < 2 {
		return nil, fmt.Errorf("could not find image data (ytaw) in page")
	}

	elementsStr := ytawMatch[1]
	// Better approach: extract all quoted strings
	reElements := regexp.MustCompile(`'([^']+)'`)
	elementMatches := reElements.FindAllStringSubmatch(elementsStr, -1)

	var images []ImageDownload
	for i, match := range elementMatches {
		raw := match[1]
		if raw == "" {
			continue
		}

		decodedURL := d.decodeASCII(raw)
		if decodedURL == "" {
			continue
		}

		// Ensure URL is absolute
		if strings.HasPrefix(decodedURL, "//") {
			decodedURL = "https:" + decodedURL
		}

		extension := ".jpg"
		if strings.Contains(decodedURL, ".png") {
			extension = ".png"
		} else if strings.Contains(decodedURL, ".webp") {
			extension = ".webp"
		}

		images = append(images, ImageDownload{
			URL:      decodedURL,
			Filename: fmt.Sprintf("%03d%s", i+1, extension),
			Index:    i + 1,
			Headers: map[string]string{
				"Referer":    url,
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			},
		})
	}

	if len(images) == 0 {
		return nil, fmt.Errorf("no images found in ytaw array")
	}

	return &SiteInfo{
		SeriesName:  seriesName,
		ChapterName: chapterName,
		Images:      images,
		SiteID:      "hentaifc.com",
		Type:        "single",
	}, nil
}

func (d *HentaifcDownloader) getSeries(url string) (*SiteInfo, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

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
	seriesName := "Unknown"
	reTitle := regexp.MustCompile(`<title>(.*?) - HentaiFC</title>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	if len(titleMatch) > 1 {
		seriesName = html.UnescapeString(titleMatch[1])
	}

	// Extract chapters
	// <a href="https://hentaifc.com/e/80347/c0" class="label">...</a>
	reChapter := regexp.MustCompile(`<a href="(https://hentaifc\.com/e/\d+/(c\d+))" class="label">`)
	matches := reChapter.FindAllStringSubmatch(bodyStr, -1)

	chapters := []ChapterInfo{}
	seen := make(map[string]bool)

	for _, match := range matches {
		chapterURL := match[1]
		chapterID := match[2]

		if seen[chapterURL] {
			continue
		}
		seen[chapterURL] = true

		chapters = append(chapters, ChapterInfo{
			ID:   chapterID,
			Name: strings.ToUpper(chapterID),
			URL:  chapterURL,
		})
	}

	// If there is only one chapter, fetch it directly
	if len(chapters) == 1 {
		return d.getChapter(chapters[0].URL)
	}

	return &SiteInfo{
		SeriesName: seriesName,
		SiteID:     "hentaifc.com",
		Type:       "series",
		Chapters:   chapters,
	}, nil
}

func (d *HentaifcDownloader) decodeASCII(s string) string {
	parts := strings.Split(s, " ")
	var b strings.Builder
	for _, p := range parts {
		if p == "" {
			continue
		}
		code, err := strconv.Atoi(p)
		if err == nil {
			b.WriteByte(byte(code))
		}
	}
	return b.String()
}
