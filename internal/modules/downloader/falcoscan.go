package downloader

import (
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

type FalcoScanDownloader struct{}

type cookieJar struct {
	cookies map[string][]*http.Cookie
}

func (j *cookieJar) SetCookies(u *url.URL, cookies []*http.Cookie) {
	j.cookies[u.Host] = append(j.cookies[u.Host], cookies...)
}

func (j *cookieJar) Cookies(u *url.URL) []*http.Cookie {
	return j.cookies[u.Host]
}

func (d *FalcoScanDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "falcoscan.net")
}

func (d *FalcoScanDownloader) GetSiteID() string {
	return "falcoscan.net"
}

func (d *FalcoScanDownloader) GetImages(url string) (*SiteInfo, error) {
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		url = "https://falcoscan.net" + url
	}

	jar := &cookieJar{cookies: make(map[string][]*http.Cookie)}
	client := &http.Client{
		Timeout: 30 * time.Second,
		Jar:     jar,
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch page: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read body: %w", err)
	}

	bodyStr := string(body)

	if strings.Contains(url, "/capitulo-") {
		return d.parseChapter(bodyStr, url, jar)
	}

	return d.parseSeries(bodyStr, url)
}

func (d *FalcoScanDownloader) parseChapter(bodyStr string, chapterURL string, jar *cookieJar) (*SiteInfo, error) {
	reTitle := regexp.MustCompile(`(?s)<h1>\s*(.*?)\s*</h1>`)
	title := ""
	if match := reTitle.FindStringSubmatch(bodyStr); len(match) > 1 {
		title = strings.TrimSpace(match[1])
	}

	seriesName := "Unknown Series"
	if title != "" {
		seriesName = title
	}

	reChapterSub := regexp.MustCompile(`(?s)<div[^>]*class="chapter-sub"[^>]*>\s*(.*?)\s*</div>`)
	chapterName := "Chapter"
	if match := reChapterSub.FindStringSubmatch(bodyStr); len(match) > 1 {
		chapterName = strings.TrimSpace(match[1])
	}

	reToken := regexp.MustCompile(`data-token="([^"]+)"`)
	token := ""
	if match := reToken.FindStringSubmatch(bodyStr); len(match) > 1 {
		token = match[1]
	}

	reSrc := regexp.MustCompile(`data-src="(https://falcoscan\.net/img-serve/[^"]+)"`)
	srcMatches := reSrc.FindAllStringSubmatch(bodyStr, -1)

	log.Printf("[FalcoScan] Found %d image URLs, token=%q", len(srcMatches), token)

	if len(srcMatches) == 0 {
		log.Printf("[FalcoScan] Body length: %d", len(bodyStr))
		if idx := strings.Index(bodyStr, "img-serve"); idx != -1 {
			end := idx + 120
			if end > len(bodyStr) {
				end = len(bodyStr)
			}
			log.Printf("[FalcoScan] img-serve context: %s", bodyStr[idx:end])
		} else {
			log.Printf("[FalcoScan] img-serve NOT found in body")
		}
	}

	cookieHeader := ""
	if cookies, ok := jar.cookies["falcoscan.net"]; ok && len(cookies) > 0 {
		var parts []string
		for _, c := range cookies {
			parts = append(parts, fmt.Sprintf("%s=%s", c.Name, c.Value))
		}
		cookieHeader = strings.Join(parts, "; ")
		log.Printf("[FalcoScan] Cookies: %s", cookieHeader)
	}

	var images []ImageDownload
	for i, match := range srcMatches {
		encodedPath := match[1]

		decodedPath, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(encodedPath, "https://falcoscan.net/img-serve/"))
		if err != nil {
			log.Printf("[FalcoScan] Failed to decode base64 for image %d: %v", i, err)
			continue
		}

		ext := "webp"
		if idx := strings.LastIndex(string(decodedPath), "."); idx != -1 {
			ext = string(decodedPath)[idx+1:]
		}

		headers := map[string]string{
			"User-Agent":       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			"X-Requested-With": "XMLHttpRequest",
			"X-CSRF-TOKEN":     token,
			"Referer":          chapterURL,
			"Accept":           "image/webp,image/apng,image/*,*/*;q=0.8",
		}
		if cookieHeader != "" {
			headers["Cookie"] = cookieHeader
		}

		images = append(images, ImageDownload{
			URL:      encodedPath,
			Filename: fmt.Sprintf("%03d.%s", i+1, ext),
			Index:    i,
			Headers:  headers,
		})
	}

	log.Printf("[FalcoScan] Parsed %d images for %s", len(images), chapterName)

	return &SiteInfo{
		SeriesName:    seriesName,
		ChapterName:   chapterName,
		Images:        images,
		SiteID:        d.GetSiteID(),
		DownloadDelay: 300 * time.Millisecond,
		Type:          "single",
	}, nil
}

func (d *FalcoScanDownloader) parseSeries(bodyStr string, seriesURL string) (*SiteInfo, error) {
	reTitle := regexp.MustCompile(`(?s)<h1>\s*(.*?)\s*</h1>`)
	title := ""
	if match := reTitle.FindStringSubmatch(bodyStr); len(match) > 1 {
		title = strings.TrimSpace(match[1])
	}

	seriesName := "Unknown Series"
	if title != "" {
		seriesName = title
	}

	reChName := regexp.MustCompile(`(?s)<div[^>]*class="ch-name"[^>]*>\s*(.*?)\s*</div>`)
	chNameMatches := reChName.FindAllStringSubmatch(bodyStr, -1)

	reChLink := regexp.MustCompile(`(?s)<a[^>]*href="(https://falcoscan\.net/comics/[^/]+/capitulo-[^"]+)"`)
	chLinkMatches := reChLink.FindAllStringSubmatch(bodyStr, -1)

	seen := make(map[string]bool)
	var chapters []ChapterInfo

	for i, linkMatch := range chLinkMatches {
		chapterURL := linkMatch[1]

		if seen[chapterURL] {
			continue
		}
		seen[chapterURL] = true

		chapterID := chapterURL
		if idx := strings.LastIndex(chapterURL, "/"); idx != -1 {
			chapterID = chapterURL[idx+1:]
		}

		chapterTitle := chapterID
		if i < len(chNameMatches) {
			parsed := strings.TrimSpace(chNameMatches[i][1])
			if parsed != "" {
				chapterTitle = parsed
			}
		}

		chapters = append(chapters, ChapterInfo{
			ID:   chapterID,
			Name: chapterTitle,
			URL:  chapterURL,
		})
	}

	return &SiteInfo{
		SeriesName: seriesName,
		Chapters:   chapters,
		SiteID:     d.GetSiteID(),
		Type:       "series",
	}, nil
}
