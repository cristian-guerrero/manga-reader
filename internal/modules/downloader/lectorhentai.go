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

type LectorHentaiDownloader struct{}

func (d *LectorHentaiDownloader) CanHandle(url string) bool {
    return strings.Contains(url, "lectorhentai.com")
}

func (d *LectorHentaiDownloader) GetSiteID() string {
    return "lectorhentai.com"
}

func (d *LectorHentaiDownloader) GetImages(url string) (*SiteInfo, error) {
    readerURL := url
    if strings.Contains(url, "/manga/") {
        readerURL = strings.Replace(url, "/manga/", "/read/", 1)
    }

    client := &http.Client{Timeout: 30 * time.Second}
    req, _ := http.NewRequest("GET", readerURL, nil)
    req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
    req.Header.Set("Referer", "https://lectorhentai.com/")

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

    // Extract manga ID from URL
    reID := regexp.MustCompile(`/(\d+)/`)
    idMatch := reID.FindStringSubmatch(readerURL)
    if len(idMatch) < 2 {
        return nil, fmt.Errorf("could not extract manga ID from URL")
    }
    mangaID := idMatch[1]

    // Extract series name from URL slug
    seriesName := extractSeriesNameFromURL(readerURL)
    if seriesName == "" {
        seriesName = "Unknown"
        // Fallback to HTML title
        reTitle := regexp.MustCompile(`<title>(.*?)</title>`)
        if match := reTitle.FindStringSubmatch(bodyStr); len(match) > 1 {
            title := html.UnescapeString(match[1])
            if idx := strings.Index(title, " - "); idx != -1 {
                seriesName = strings.TrimSpace(title[:idx])
                seriesName = strings.TrimPrefix(seriesName, "Leer ")
            } else {
                seriesName = title
            }
        }
    }

    totalPages := 0
    rePages := regexp.MustCompile(`(\d+)/(\d+)`)
    matches := rePages.FindAllStringSubmatch(bodyStr, -1)
    for _, match := range matches {
        if len(match) >= 3 {
            if pages, err := strconv.Atoi(match[2]); err == nil && pages > totalPages {
                totalPages = pages
            }
        }
    }

    if totalPages == 0 {
        // Fallback: try to detect total pages by checking image URLs
        totalPages = d.detectTotalPages(mangaID)
        if totalPages == 0 {
            return nil, fmt.Errorf("could not determine total pages")
        }
    }

    baseImageURL := fmt.Sprintf("https://img5.giolandscaping.com/library/%s/", mangaID)

    var images []ImageDownload
    for i := 0; i < totalPages; i++ {
        pageStr := fmt.Sprintf("%03d", i)
        imageURL := baseImageURL + pageStr + ".webp"

        images = append(images, ImageDownload{
            URL:      imageURL,
            Filename: fmt.Sprintf("%03d.webp", i+1),
            Index:    i,
            Headers: map[string]string{
                "Referer":         "https://lectorhentai.com/",
                "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
                "Accept":          "image/webp,image/apng,image/*,*/*;q=0.8",
                "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
            },
        })
    }

    return &SiteInfo{
        SeriesName:    seriesName,
        ChapterName:   "",
        Images:        images,
        SiteID:        "lectorhentai.com",
        DownloadDelay: 500 * time.Millisecond,
        Type:          "single",
    }, nil
}

func extractSeriesNameFromURL(url string) string {
    // Extract slug from URL like: /manga/90146/daisuki-kaa-chan-to-onsen-haramase-ryokou-espa-ol
    parts := strings.Split(url, "/")
    for i, part := range parts {
        if part == "manga" || part == "read" {
            if i+1 < len(parts) {
                // Skip the ID part
                if i+2 < len(parts) {
                    slug := parts[i+2]
                    // Remove language suffix like -espa-ol, -english, etc.
                    langPatterns := []string{"-espa-ol", "-english", "-espanol", "-eng"}
                    cleanSlug := slug
                    for _, pattern := range langPatterns {
                        if idx := strings.LastIndex(cleanSlug, pattern); idx != -1 {
                            cleanSlug = cleanSlug[:idx]
                        }
                    }
                    // Replace hyphens with spaces
                    name := strings.ReplaceAll(cleanSlug, "-", " ")
                    return name
                }
            }
        }
    }
    return ""
}

func (d *LectorHentaiDownloader) detectTotalPages(mangaID string) int {
    client := &http.Client{Timeout: 10 * time.Second}
    baseURL := fmt.Sprintf("https://img5.giolandscaping.com/library/%s/", mangaID)

    for i := 0; i < 100; i++ {
        pageStr := fmt.Sprintf("%03d", i)
        imageURL := baseURL + pageStr + ".webp"

        req, _ := http.NewRequest("HEAD", imageURL, nil)
        req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
        req.Header.Set("Referer", "https://lectorhentai.com/")

        resp, err := client.Do(req)
        if err != nil || resp.StatusCode != http.StatusOK {
            return i
        }
        resp.Body.Close()
    }
    return 100
}
