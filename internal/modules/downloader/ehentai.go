package downloader

import (
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type EHentaiDownloader struct{}

func (d *EHentaiDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "e-hentai.org") ||
		strings.Contains(url, "exhentai.org") ||
		strings.Contains(url, "ehentai.org")
}

func (d *EHentaiDownloader) NormalizeURL(url string) string {
	// Case 1: Individual image page (e.g., https://e-hentai.org/s/...)
	// We don't normalize /s/ to /g/ here because NormalizeURL shouldn't do network requests
	// but we can certainly clean gallery params

	if strings.Contains(url, "/g/") {
		// Strip page params ?p=... and trailing slashes for consistency
		rePageParam := regexp.MustCompile(`\?p=\d+.*$`)
		url = rePageParam.ReplaceAllString(url, "")
		url = strings.TrimSuffix(url, "/")
	}
	return url
}

func (d *EHentaiDownloader) GetSiteID() string {
	return "e-hentai.org"
}

func (d *EHentaiDownloader) GetImages(url string) (*SiteInfo, error) {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Case 1: Individual image page (e.g., https://e-hentai.org/s/...)
	if strings.Contains(url, "/s/") {
		galleryURL, err := d.findGalleryFromImagePage(client, url)
		if err != nil {
			return nil, fmt.Errorf("failed to find gallery from image page: %v", err)
		}
		url = galleryURL
	}

	// Case 2: Gallery URL (continue with normal gallery logic)
	galleryURL := url

	// If the URL has a page parameter (e.g. ?p=3), strip it to start from page 0
	if strings.Contains(galleryURL, "?p=") {
		rePageParam := regexp.MustCompile(`\?p=\d+.*$`)
		galleryURL = rePageParam.ReplaceAllString(galleryURL, "")
	}

	// Normalize URL
	if !strings.HasSuffix(galleryURL, "/") {
		galleryURL += "/"
	}

	// Extract GID and Token if possible for logging or later use
	// url pattern: https://e-hentai.org/g/3785501/ec593bc2dc/

	imagePageURLs := []string{}
	seriesName := ""

	currentPageURL := galleryURL
	visitedPages := make(map[string]bool)

	// --- PHASE 0: Fetch first page and try ZIP download immediately (Primary Option) ---
	req, err := http.NewRequest("GET", currentPageURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch gallery page %s: %v", currentPageURL, err)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	if err != nil {
		return nil, err
	}
	firstPageBody := string(bodyBytes)

	// Extract Title
	reTitle := regexp.MustCompile(`<h1 id="gn">([^<]+)</h1>`)
	if match := reTitle.FindStringSubmatch(firstPageBody); len(match) > 1 {
		seriesName = match[1]
	}

	// Try finding ZIP
	if archiveURL, err := d.tryFindArchiveURL(client, galleryURL, firstPageBody); err == nil && archiveURL != "" {
		return &SiteInfo{
			SeriesName:  seriesName,
			ChapterName: "",
			Images: []ImageDownload{
				{
					URL:      archiveURL,
					Filename: "gallery.zip",
					Index:    0,
					Headers: map[string]string{
						"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
						"Referer":    galleryURL,
					},
				},
			},
			SiteID:        d.GetSiteID(),
			DownloadDelay: 0,
		}, nil
	}

	// --- PHASE 1: Collect image page links (Fallback Option) ---
	extractLinks := func(html string) []string {
		rePageLink := regexp.MustCompile(`https://e[x-]?hentai\.org/s/([a-z0-9]+)/(\d+)-(\d+)`)
		return rePageLink.FindAllString(html, -1)
	}

	imagePageURLs = append(imagePageURLs, extractLinks(firstPageBody)...)
	visitedPages[currentPageURL] = true
	bodyStr := firstPageBody

	for {
		// Look for next page in pagination
		reNextPage := regexp.MustCompile(`<a[^>]+href="([^"]+)"[^>]*>&gt;</a>`)
		matchNext := reNextPage.FindStringSubmatch(bodyStr)
		if len(matchNext) < 2 {
			break
		}

		nextURL := matchNext[1]
		if !strings.HasPrefix(nextURL, "http") {
			if strings.Contains(galleryURL, "exhentai.org") {
				nextURL = "https://exhentai.org" + nextURL
			} else {
				nextURL = "https://e-hentai.org" + nextURL
			}
		}
		currentPageURL = nextURL

		if visitedPages[currentPageURL] {
			break
		}
		visitedPages[currentPageURL] = true

		// Optional: delay between gallery pages
		time.Sleep(500 * time.Millisecond)

		req, err := http.NewRequest("GET", currentPageURL, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

		resp, err := client.Do(req)
		if err != nil {
			break // Fail gracefully and use what we have
		}

		bodyBytes, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			break
		}
		bodyStr = string(bodyBytes)
		imagePageURLs = append(imagePageURLs, extractLinks(bodyStr)...)

		if len(visitedPages) > 100 {
			break
		}
	}

	if len(imagePageURLs) == 0 {
		return nil, fmt.Errorf("no images found in gallery")
	}

	// Phase 2: Visit each image page to get the actual image source
	// WARNING: This can be slow for large galleries.
	images := []ImageDownload{}
	for i, pageURL := range imagePageURLs {
		// Small delay to avoid 509 Bandwidth Exceeded or IP ban
		if i > 0 {
			time.Sleep(800 * time.Millisecond)
		}

		imgURL, err := d.fetchImageURL(client, pageURL)
		if err != nil {
			// If one fails, we might want to continue but we should probably log it
			// For now, let's keep going if it's just one, but if many fail we might have been banned
			continue
		}

		// Extract extension from imgURL or default to .jpg
		ext := ".jpg"
		if strings.Contains(imgURL, ".png") {
			ext = ".png"
		} else if strings.Contains(imgURL, ".gif") {
			ext = ".gif"
		}

		images = append(images, ImageDownload{
			URL:      imgURL,
			Filename: fmt.Sprintf("%04d%s", i+1, ext),
			Index:    i,
			Headers: map[string]string{
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
				"Referer":    pageURL,
			},
		})
	}

	if len(images) == 0 {
		return nil, fmt.Errorf("failed to extract any image URLs")
	}

	return &SiteInfo{
		SeriesName:    seriesName,
		ChapterName:   "",
		Images:        images,
		SiteID:        d.GetSiteID(),
		DownloadDelay: 4 * time.Second, // Even more respectful delay for the fallback method
	}, nil
}

func (d *EHentaiDownloader) tryFindArchiveURL(client *http.Client, galleryURL string, bodyStr string) (string, error) {
	// 1. Look for the Archiver button link
	// Pattern: <a onclick="return archiver('https://e-hentai.org/archiver.php?gid=3785501&token=ec593bc2dc&or=...')">Archive Download</a>
	reArchiver := regexp.MustCompile(`archiver\('([^']+)'\)`)
	match := reArchiver.FindStringSubmatch(bodyStr)
	if len(match) < 2 {
		return "", fmt.Errorf("archive link not found")
	}

	archiverURL := match[1]

	// 2. Visit the archiver page
	req, _ := http.NewRequest("GET", archiverURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Referer", galleryURL)

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	archiverBody, _ := io.ReadAll(resp.Body)
	archiverStr := string(archiverBody)

	// 3. Look for "Download Archive" or similar on that page
	// Sometimes it's a "Resampled Archive" which is free for most users
	// <form action="https://e-hentai.org/archiver.php?..." method="post">
	// <input type="submit" name="dlcheck_resampled" value="Resampled Archive" ...>

	// For now, let's look for a direct link or a form that suggests it's ready
	if strings.Contains(archiverStr, "Download Archive") {
		// If it's already ready, there might be a link
		reDownload := regexp.MustCompile(`<a href="([^"]+\.zip[^"]*)"`)
		if m := reDownload.FindStringSubmatch(archiverStr); len(m) > 1 {
			return m[1], nil
		}
	}

	// This usually requires more logic (POSTing the form, waiting for preparation)
	// which might be too complex without a session.
	return "", fmt.Errorf("archive not immediately available")
}

func (d *EHentaiDownloader) findGalleryFromImagePage(client *http.Client, pageURL string) (string, error) {
	req, err := http.NewRequest("GET", pageURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("status %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	bodyStr := string(bodyBytes)

	// In E-Hentai image pages, there is a link back to the gallery
	// <div class="sb"><a href="https://e-hentai.org/g/...">Back to Gallery</a></div>
	reGallery := regexp.MustCompile(`<a[^>]+href="(https://e[x-]?hentai\.org/g/\d+/[a-z0-9]+/)"[^>]*>Back to Gallery</a>`)
	match := reGallery.FindStringSubmatch(bodyStr)
	if len(match) > 1 {
		return match[1], nil
	}

	return "", fmt.Errorf("could not find gallery link in image page")
}

func (d *EHentaiDownloader) fetchImageURL(client *http.Client, pageURL string) (string, error) {
	req, err := http.NewRequest("GET", pageURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("status %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	bodyStr := string(bodyBytes)

	// <img id="img" src="https://.../image.jpg" ...>
	reImg := regexp.MustCompile(`<img id="img" src="([^"]+)"`)
	match := reImg.FindStringSubmatch(bodyStr)
	if len(match) > 1 {
		imgURL := match[1]
		// If the image is served from a Hath Network node (contains :PORT),
		// it often fails because those are home computers.
		// Patterns like https://xxx.xxx.xxx.xxx:xxxx/h/...
		// We can try to append 'nl=...' to the pageURL if we want the server to pick another node,
		// but for now let's just log and return.
		return imgURL, nil
	}

	// Check for a specific error message in the page
	if strings.Contains(bodyStr, "Bandwidth Exceeded") {
		return "", fmt.Errorf("e-hentai bandwidth exceeded (509)")
	}

	return "", fmt.Errorf("could not find image on page")
}
