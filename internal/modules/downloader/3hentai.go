package downloader

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type ThreeHentaiDownloader struct{}

func (d *ThreeHentaiDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "3hentai.net")
}

func (d *ThreeHentaiDownloader) GetSiteID() string {
	return "3hentai.net"
}

func (d *ThreeHentaiDownloader) GetImages(url string) (*SiteInfo, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch page: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch page, status code: %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	bodyStr := string(bodyBytes)

	// Extract title from h1 tag
	reTitle := regexp.MustCompile(`<h1[^>]*>(.*?)</h1>`)
	titleMatch := reTitle.FindStringSubmatch(bodyStr)
	title := "Unknown"
	if len(titleMatch) >= 2 {
		title = strings.TrimSpace(titleMatch[1])
		// Strip HTML tags iteratively to handle nested tags
		reStripTags := regexp.MustCompile(`<[^>]*>`)
		for strings.Contains(title, "<") {
			title = reStripTags.ReplaceAllString(title, "")
		}
		title = strings.ReplaceAll(title, "\n", " ")
		title = strings.ReplaceAll(title, "\t", " ")
		title = strings.Join(strings.Fields(title), " ")

		// Remove bracketed prefix like "[Studio TAGATA (Yontarou)]" from beginning
		// Match from start, any characters inside [brackets], including nested () 
		reBracketPrefix := regexp.MustCompile(`^\[.*?\]\s*`)
		title = reBracketPrefix.ReplaceAllString(title, "")
	}

	// Extract media folder and image extension from thumbnail URLs (e.g., s1.3hentai.xyz/d2259306/1t.jpg)
	reMediaFolder := regexp.MustCompile(`3hentai\.xyz/([a-zA-Z0-9]+)/\d+t\.(jpg|png|webp)`)
	mediaMatch := reMediaFolder.FindStringSubmatch(bodyStr)
	if len(mediaMatch) < 3 {
		return nil, fmt.Errorf("could not find media folder in page")
	}
	mediaFolder := mediaMatch[1]
	imageExt := mediaMatch[2] // Extract extension from thumbnail URL

	// Extract CDN subdomain from image URLs
	reCDN := regexp.MustCompile(`https?://(s\d+)\.3hentai\.xyz`)
	cdnMatch := reCDN.FindStringSubmatch(bodyStr)
	subdomain := "s1"
	if len(cdnMatch) >= 2 {
		subdomain = cdnMatch[1]
	}

	// Extract page count from text like "Pages: 48" - use FindAllStringSubmatch to get all matches
	rePages := regexp.MustCompile(`Pages?:\s*(\d+)`)
	pagesMatches := rePages.FindAllStringSubmatch(bodyStr, -1)
	pageCount := 0
	if len(pagesMatches) > 0 {
		// Use the last match in case there are duplicates
		lastMatch := pagesMatches[len(pagesMatches)-1]
		if len(lastMatch) >= 2 {
			fmt.Sscanf(lastMatch[1], "%d", &pageCount)
		}
	}

	// Fallback: count unique page numbers in thumbnail URLs
	if pageCount == 0 {
		rePageNums := regexp.MustCompile(fmt.Sprintf(`3hentai\.xyz/%s/(\d+)t\.(jpg|png|webp)`, regexp.QuoteMeta(mediaFolder)))
		pageMatches := rePageNums.FindAllStringSubmatch(bodyStr, -1)
		// Use a map to count unique page numbers
		uniquePages := make(map[string]bool)
		for _, match := range pageMatches {
			if len(match) >= 2 {
				uniquePages[match[1]] = true
			}
		}
		pageCount = len(uniquePages)
	}

	if pageCount == 0 {
		return nil, fmt.Errorf("could not determine page count")
	}

	// Extract gallery ID from URL for folder naming
	galleryID := ""
	reID := regexp.MustCompile(`3hentai\.net/d/(\d+)`)
	idMatch := reID.FindStringSubmatch(url)
	if len(idMatch) >= 2 {
		galleryID = idMatch[1]
	}

	fullTitle := title
	if galleryID != "" {
		fullTitle = fmt.Sprintf("%s [%s]", title, galleryID)
	}

	images := make([]ImageDownload, pageCount)
	for i := 0; i < pageCount; i++ {
		pageNum := i + 1
		imageURL := fmt.Sprintf("https://%s.3hentai.xyz/%s/%d.%s", subdomain, mediaFolder, pageNum, imageExt)

		images[i] = ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d.jpg", pageNum),
			Index:    i,
			Headers: map[string]string{
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
				"Referer":    "https://3hentai.net/",
			},
		}
	}

	return &SiteInfo{
		SeriesName:    fullTitle,
		ChapterName:   "",
		Images:        images,
		SiteID:        d.GetSiteID(),
		DownloadDelay: 2 * time.Second, // Add delay to avoid 403 errors
	}, nil
}
