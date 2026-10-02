package downloader

import (
	"fmt"
	"html"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type IMHentaiToDownloader struct{}

var (
	imhentaiToGalleryIDRe = regexp.MustCompile(`/g/(\d+)`)
	imhentaiToMediaURLRe  = regexp.MustCompile(`media_url:\s*'([^']+)'`)
	imhentaiToMediaIDRe   = regexp.MustCompile(`"media_id":\s*"(\d+)"`)
	imhentaiToNumPagesRe  = regexp.MustCompile(`"num_pages":\s*(\d+)`)
	imhentaiToPagesNumRe  = regexp.MustCompile(`<span class="pages_num">(\d+)</span>`)
	imhentaiToPagesArrRe  = regexp.MustCompile(`(?s)"pages":\s*\[(.*?)\]`)
	imhentaiToArrTypeRe   = regexp.MustCompile(`"t"\s*:\s*"(\w)"`)
	imhentaiToMapTypeRe   = regexp.MustCompile(`"(\d+)"\s*:\s*\{\s*"t"\s*:\s*"(\w)"`)
	imhentaiToEnglishRe   = regexp.MustCompile(`"english":\s*"((?:\\.|[^"\\])*)"`)
	imhentaiToCDNRe       = regexp.MustCompile(`(https?://[^/"'\s]+)/galleries/\d+/(?:cover|\d+)\.\w+`)
	imhentaiToGalleriesRe = regexp.MustCompile(`galleries/(\d+)/`)
	imhentaiToH1Re        = regexp.MustCompile(`(?s)<h1[^>]*>(.*?)</h1>`)
	imhentaiToTitleRe     = regexp.MustCompile(`(?s)<title>(.*?)</title>`)
	imhentaiToTagRe       = regexp.MustCompile(`<[^>]*>`)
)

// Single-letter type stored in the site DB, mapped to the real file extension.
var imhentaiToExtensions = map[string]string{
	"j": "jpg",
	"p": "png",
	"g": "gif",
	"w": "webp",
}

type imhentaiToGallery struct {
	mediaID    string
	cdnBase    string
	totalPages int
	pageExts   map[int]string // 1-based page number -> file extension (no dot)
	title      string
}

func (d *IMHentaiToDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "imhentai.to")
}

func (d *IMHentaiToDownloader) NormalizeURL(url string) string {
	// Remove query params
	if idx := strings.Index(url, "?"); idx != -1 {
		url = url[:idx]
	}

	// If it's a view page, convert to gallery page
	// https://imhentai.to/view/645455/1/ -> https://imhentai.to/g/645455/
	if strings.Contains(url, "/view/") {
		re := regexp.MustCompile(`imhentai\.to/view/(\d+)/`)
		match := re.FindStringSubmatch(url)
		if len(match) > 1 {
			return fmt.Sprintf("https://imhentai.to/g/%s/", match[1])
		}
	}

	// If URL has page number, strip it
	// https://imhentai.to/g/645455/1/ -> https://imhentai.to/g/645455/
	if strings.Contains(url, "/g/") {
		re := regexp.MustCompile(`(/g/\d+/)\d+/`)
		match := re.FindStringSubmatch(url)
		if len(match) > 1 {
			return fmt.Sprintf("https://imhentai.to%s", match[1])
		}
	}

	// Ensure trailing slash for gallery
	if strings.Contains(url, "/g/") && !strings.HasSuffix(url, "/") {
		url += "/"
	}

	return url
}

func (d *IMHentaiToDownloader) GetSiteID() string {
	return "imhentai.to"
}

func (d *IMHentaiToDownloader) GetImages(rawURL string) (*SiteInfo, error) {
	normalized := d.NormalizeURL(rawURL)

	idMatch := imhentaiToGalleryIDRe.FindStringSubmatch(normalized)
	if idMatch == nil {
		return nil, fmt.Errorf("URL is not an IMHentai gallery page")
	}
	galleryID := idMatch[1]

	// The viewer page embeds the full reader config: CDN base, media_id,
	// page count and the real extension of every page.
	body, err := imhentaiToFetchPage(fmt.Sprintf("https://imhentai.to/g/%s/1/", galleryID))
	if err != nil {
		return nil, err
	}
	gallery := parseIMHentaiTo(body)

	if gallery.mediaID == "" || gallery.cdnBase == "" || gallery.totalPages == 0 {
		// Fallback: the gallery page has the same data in N.gallery JSON.
		if fallbackBody, ferr := imhentaiToFetchPage(fmt.Sprintf("https://imhentai.to/g/%s/", galleryID)); ferr == nil {
			gallery.merge(parseIMHentaiTo(fallbackBody))
		}
	}

	if gallery.mediaID == "" {
		return nil, fmt.Errorf("could not extract media ID from page")
	}
	if gallery.cdnBase == "" {
		return nil, fmt.Errorf("could not extract CDN base URL from page")
	}
	if gallery.totalPages == 0 {
		return nil, fmt.Errorf("no pages found")
	}

	return &SiteInfo{
		SeriesName: gallery.title,
		Images:     buildIMHentaiToImages(gallery),
		SiteID:     "imhentai.to",
		Type:       "single",
	}, nil
}

func buildIMHentaiToImages(gallery *imhentaiToGallery) []ImageDownload {
	images := make([]ImageDownload, 0, gallery.totalPages)
	for i := 1; i <= gallery.totalPages; i++ {
		ext := gallery.extensionFor(i)
		images = append(images, ImageDownload{
			URL:      fmt.Sprintf("%s/galleries/%s/%d.%s", gallery.cdnBase, gallery.mediaID, i, ext),
			Filename: fmt.Sprintf("%03d.%s", i, ext),
			Index:    i - 1,
			Headers: map[string]string{
				"Referer": "https://imhentai.to/",
			},
		})
	}
	return images
}

// parseIMHentaiTo extracts gallery metadata from a viewer or gallery page body.
func parseIMHentaiTo(body string) *imhentaiToGallery {
	g := &imhentaiToGallery{pageExts: make(map[int]string)}

	if m := imhentaiToMediaIDRe.FindStringSubmatch(body); len(m) > 1 {
		g.mediaID = m[1]
	} else if m := imhentaiToGalleriesRe.FindStringSubmatch(body); len(m) > 1 {
		g.mediaID = m[1]
	}

	if m := imhentaiToMediaURLRe.FindStringSubmatch(body); len(m) > 1 {
		g.cdnBase = strings.TrimSuffix(m[1], "/")
	} else if m := imhentaiToCDNRe.FindStringSubmatch(body); len(m) > 1 {
		g.cdnBase = m[1]
	}

	if m := imhentaiToNumPagesRe.FindStringSubmatch(body); len(m) > 1 {
		g.totalPages, _ = strconv.Atoi(m[1])
	} else if m := imhentaiToPagesNumRe.FindStringSubmatch(body); len(m) > 1 {
		g.totalPages, _ = strconv.Atoi(m[1])
	}

	g.parsePageExtensions(body)
	g.parseTitle(body)

	if g.totalPages == 0 {
		for page := range g.pageExts {
			if page > g.totalPages {
				g.totalPages = page
			}
		}
	}

	return g
}

// parsePageExtensions reads the per-page type list. The reader page stores it as
// an ordered array, the gallery page as a map keyed by page number.
func (g *imhentaiToGallery) parsePageExtensions(body string) {
	if m := imhentaiToPagesArrRe.FindStringSubmatch(body); len(m) > 1 {
		for i, t := range imhentaiToArrTypeRe.FindAllStringSubmatch(m[1], -1) {
			if ext, ok := imhentaiToExtensions[t[1]]; ok {
				g.pageExts[i+1] = ext
			}
		}
		return
	}

	for _, t := range imhentaiToMapTypeRe.FindAllStringSubmatch(body, -1) {
		page, err := strconv.Atoi(t[1])
		if err != nil {
			continue
		}
		if ext, ok := imhentaiToExtensions[t[2]]; ok {
			g.pageExts[page] = ext
		}
	}
}

func (g *imhentaiToGallery) parseTitle(body string) {
	if m := imhentaiToEnglishRe.FindStringSubmatch(body); len(m) > 1 {
		if unquoted, err := strconv.Unquote(`"` + m[1] + `"`); err == nil {
			g.title = strings.TrimSpace(unquoted)
		} else {
			g.title = strings.TrimSpace(m[1])
		}
	}

	if g.title == "" {
		if m := imhentaiToH1Re.FindStringSubmatch(body); len(m) > 1 {
			g.title = imhentaiToTagRe.ReplaceAllString(m[1], "")
		}
	}

	if g.title == "" {
		if m := imhentaiToTitleRe.FindStringSubmatch(body); len(m) > 1 {
			g.title = strings.TrimSpace(imhentaiToTagRe.ReplaceAllString(m[1], ""))
			g.title = strings.TrimSpace(strings.TrimSuffix(g.title, "- IMHentai"))
		}
	}

	g.title = strings.TrimSpace(html.UnescapeString(g.title))
	if g.title == "" {
		g.title = "IMHentai Gallery"
	}
}

// extensionFor returns the file extension for a 1-based page number, falling
// back to a neighbour page when the exact entry is missing (the gallery page
// map omits page 1).
func (g *imhentaiToGallery) extensionFor(page int) string {
	for _, candidate := range []int{page, page + 1, page - 1, page + 2} {
		if ext, ok := g.pageExts[candidate]; ok {
			return ext
		}
	}
	return "jpg"
}

// merge fills empty fields from another parsed page of the same gallery.
func (g *imhentaiToGallery) merge(other *imhentaiToGallery) {
	if other == nil {
		return
	}
	if g.mediaID == "" {
		g.mediaID = other.mediaID
	}
	if g.cdnBase == "" {
		g.cdnBase = other.cdnBase
	}
	if g.totalPages == 0 {
		g.totalPages = other.totalPages
	}
	if len(g.pageExts) == 0 {
		g.pageExts = other.pageExts
	}
	if g.title == "" || g.title == "IMHentai Gallery" {
		g.title = other.title
	}
}

func imhentaiToFetchPage(pageURL string) (string, error) {
	client := &http.Client{Timeout: 30 * time.Second}

	req, err := http.NewRequest("GET", pageURL, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Referer", "https://imhentai.to/")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch page: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to fetch page, status code: %d (at %s)", resp.StatusCode, pageURL)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(bodyBytes), nil
}
