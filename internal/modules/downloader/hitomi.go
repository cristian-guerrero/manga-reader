package downloader

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	neturl "net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

type HitomiDownloader struct {
	gg        *GG
	cdnDomain string
}

type GG struct {
	MDefault int         `json:"m_default"`
	MMap     map[int]int `json:"m_map"`
	B        string      `json:"b"`
}

// m returns the subdomain offset for a given g value
func (gg *GG) m(g int) int {
	if val, ok := gg.MMap[g]; ok {
		return val
	}
	return gg.MDefault
}

func (d *HitomiDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "hitomi.la")
}

func (d *HitomiDownloader) GetSiteID() string {
	return "hitomi.la"
}

func (d *HitomiDownloader) RefreshGG(galleryURL string) error {
	client := &http.Client{}

	// First, fetch the gallery page to find the CDN domain
	req, _ := http.NewRequest("GET", galleryURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch gallery page: %v", err)
	}
	defer resp.Body.Close()

	pageBody, _ := io.ReadAll(resp.Body)
	pageStr := string(pageBody)

	// Extract CDN domain from CSS links (e.g., //ltn.gold-usergeneratedcontent.net/gallery.css)
	reCDN := regexp.MustCompile(`(?:href|src)=["']?//([a-z0-9.-]+)/(?:gallery|navbar|gg)\.(?:css|js)`)
	matchCDN := reCDN.FindStringSubmatch(pageStr)

	var ggURL string
	var cdnDomain string
	if len(matchCDN) > 1 {
		cdnDomain = matchCDN[1]
		ggURL = fmt.Sprintf("https://%s/gg.js", cdnDomain)
	} else {
		// Fallback: try to find any ltn.*.net domain
		reAltCDN := regexp.MustCompile(`//([a-z0-9.-]*ltn[a-z0-9.-]*\.[a-z]+)/`)
		if matchAlt := reAltCDN.FindStringSubmatch(pageStr); len(matchAlt) > 1 {
			cdnDomain = matchAlt[1]
			ggURL = fmt.Sprintf("https://%s/gg.js", cdnDomain)
		} else {
			return fmt.Errorf("could not find CDN domain in page")
		}
	}

	// Fetch the gg.js file
	req2, _ := http.NewRequest("GET", ggURL, nil)
	req2.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req2.Header.Set("Referer", "https://hitomi.la/")

	resp2, err := client.Do(req2)
	if err != nil {
		return fmt.Errorf("failed to fetch gg.js from %s: %v", ggURL, err)
	}
	defer resp2.Body.Close()
	body, _ := io.ReadAll(resp2.Body)
	bodyStr := string(body)

	gg := &GG{MMap: make(map[int]int)}

	reDefault := regexp.MustCompile(`var o = (\d)`)
	reCase := regexp.MustCompile(`case (\d+):`)
	reO := regexp.MustCompile(`o = (\d); break;`)
	reB := regexp.MustCompile(`b: '(.+)'`)

	if match := reDefault.FindStringSubmatch(bodyStr); len(match) > 1 {
		gg.MDefault, _ = strconv.Atoi(match[1])
	}

	if matchO := reO.FindStringSubmatch(bodyStr); len(matchO) > 1 {
		o, _ := strconv.Atoi(matchO[1])
		cases := reCase.FindAllStringSubmatch(bodyStr, -1)
		for _, c := range cases {
			val, _ := strconv.Atoi(c[1])
			gg.MMap[val] = o
		}
	}

	if matchB := reB.FindStringSubmatch(bodyStr); len(matchB) > 1 {
		gg.B = matchB[1]
	}

	d.gg = gg
	d.cdnDomain = cdnDomain
	return nil
}

type HitomiGallery struct {
	Files []struct {
		Hash    string `json:"hash"`
		HasWebp int    `json:"haswebp"`
		Name    string `json:"name"`
	} `json:"files"`
	Title         string `json:"title"`
	Language      string `json:"language"`
	LanguageLocal string `json:"language_localname"`
}

func mapHitomiLanguageToCode(lang string) string {
	lang = strings.ToLower(lang)
	switch lang {
	case "japanese":
		return "ja"
	case "english":
		return "en"
	case "spanish":
		return "es"
	case "chinese":
		return "zh"
	case "korean":
		return "ko"
	case "french":
		return "fr"
	case "german":
		return "de"
	case "italian":
		return "it"
	case "portuguese":
		return "pt"
	case "russian":
		return "ru"
	case "indonesian":
		return "id"
	case "vietnamese":
		return "vi"
	case "polish":
		return "pl"
	case "ukrainian":
		return "uk"
	case "turkish":
		return "tr"
	default:
		return lang // Return as is if unknown (will be shown with globe icon)
	}
}

func (d *HitomiDownloader) GetImages(url string) (*SiteInfo, error) {
	if strings.Contains(url, "/artist/") || strings.Contains(url, "/series/") || strings.Contains(url, "/tag/") || strings.Contains(url, "/character/") || strings.Contains(url, "/group/") || strings.Contains(url, "index-") {
		// Try regex first (for titles), then fallback to nozomi
		info, err := d.getArbitraryList(url)
		if err == nil && len(info.Chapters) > 0 {
			return info, nil
		}

		// If scraping failed (empty list), try nozomi
		return d.getNozomiList(url)
	}

	if strings.Contains(url, "search.html") {
		return d.handleSearchURL(url)
	}

	if d.gg == nil {
		if err := d.RefreshGG(url); err != nil {
			return nil, err
		}
	}

	// Extract ID from URL
	reID := regexp.MustCompile(`(\d+)\.html`)
	matchID := reID.FindStringSubmatch(url)
	if len(matchID) < 2 {
		return nil, fmt.Errorf("could not find ID in URL")
	}
	galleryID := matchID[1]

	// Fetch gallery info
	gallery, err := d.fetchGalleryData(galleryID)
	if err != nil {
		return nil, err
	}

	images := make([]ImageDownload, len(gallery.Files))
	for i, f := range gallery.Files {
		hash := f.Hash

		// Calculate subdirectory using s(hash) function from Hitomi's gg.js
		// s(hash) takes the last 3 characters, reorders as: last + (second-to-last two), then hex to decimal
		// Example: "...42b0" -> "0" + "2b" = "02b" -> parseInt("02b", 16) = 43
		subdir := ""
		subdomain := "a1" // Default subdomain
		if len(hash) >= 3 {
			lastChar := hash[len(hash)-1:]                   // Last char: "0"
			secondLastTwo := hash[len(hash)-3 : len(hash)-1] // Second-to-last 2: "2b"
			combined := lastChar + secondLastTwo             // "02b"
			num, _ := strconv.ParseInt(combined, 16, 64)
			subdir = fmt.Sprintf("%d", num)

			// Calculate subdomain using gg.m()
			// Subdomain = "a" + (1 + gg.m(g))
			mResult := d.gg.m(int(num))
			subdomain = fmt.Sprintf("a%d", 1+mResult)
		}

		// Build the CDN domain with calculated subdomain
		// e.g., "a2.gold-usergeneratedcontent.net"
		baseDomain := strings.TrimPrefix(d.cdnDomain, "ltn.")
		imageDomain := subdomain + "." + baseDomain

		// Hitomi serves images in AVIF format
		ext := "avif"

		// Construct URL: https://a{n}.domain/{gg.B}{subdir}/{hash}.{ext}
		imageURL := fmt.Sprintf("https://%s/%s%s/%s.%s", imageDomain, d.gg.B, subdir, hash, ext)

		images[i] = ImageDownload{
			URL:      imageURL,
			Filename: fmt.Sprintf("%03d.%s", i+1, ext),
			Index:    i,
			Headers: map[string]string{
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
				"Referer":    "https://hitomi.la/",
			},
		}
	}

	fullTitle := fmt.Sprintf("%s [%s]", gallery.Title, galleryID)
	return &SiteInfo{
		SeriesName:    fullTitle,
		ChapterName:   "",
		Images:        images,
		SiteID:        d.GetSiteID(),
		DownloadDelay: 500 * time.Millisecond,
	}, nil
}

func (d *HitomiDownloader) handleSearchURL(rawURL string) (*SiteInfo, error) {
	// Parse URL
	u, err := neturl.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid url: %v", err)
	}

	// query is formatted like: ?q=artist:menoko language:spanish
	// Hitomi encodes it properly in the 'q' parameter usually, or just straight in the path if copied from browser?
	// Browser URL: https://hitomi.la/search.html?menoko%20language:spanish (actually often it's just query list)
	// But the user provided: search.html?artist%3Amenoko%20language%3Aspanish
	// Let's parse the query keys.

	// Hitomi search query is usually in the key itself if no value, or just part of the string?
	// Actually, Hitomi uses the entire query string as the search terms sometimes if encoded weirdly,
	// but standard use is ?q=term or just terms.
	// Wait, the user example is: https://hitomi.la/search.html?artist%3Amenoko%20language%3Aspanish
	// `artist%3Amenoko%20language%3Aspanish` is the query string. It's not `?q=...`
	// So we need to look at u.RawQuery

	queryParts := strings.Split(u.RawQuery, "%20") // Split by space if encoded
	if len(queryParts) == 1 {
		queryParts = strings.Split(u.RawQuery, "&") // or &?
	}
	// Fallback: fully decode first
	decodedQuery, _ := neturl.QueryUnescape(u.RawQuery)
	// Split by space
	parts := strings.Fields(decodedQuery)

	var typeName, name, language string
	language = "all" // Default

	// Parse parts
	// format: key:value
	for _, part := range parts {
		if strings.Contains(part, ":") {
			kv := strings.SplitN(part, ":", 2)
			key := kv[0]
			val := kv[1]

			switch key {
			case "artist":
				typeName = "artist"
				name = val
			case "series":
				typeName = "series"
				name = val
			case "group":
				typeName = "group"
				name = val
			case "character":
				typeName = "character"
				name = val
			case "tag":
				typeName = "tag"
				name = val
			case "language":
				language = val
			}
		} else {
			// Assume it's a generic search term? generic search not supported by nozomi easily unless we search index.
			// For now, only support structured queries as requested.
		}
	}

	if typeName == "" || name == "" {
		return nil, fmt.Errorf("unsupported search query: must contain a specific type (artist, series, group, character, tag) and name")
	}

	// Construct target URL
	// https://hitomi.la/artist/menoko-spanish.html
	// https://hitomi.la/artist/menoko-all.html

	suffix := "-all"
	if language != "all" {
		suffix = "-" + language
	}

	// Clean name (spaces to hyphens might be needed?)
	// Hitomi usually uses hyphens for spaces in names
	name = strings.ReplaceAll(name, " ", "-")
	name = strings.ReplaceAll(name, "_", "-") // Just in case

	targetURL := fmt.Sprintf("https://hitomi.la/%s/%s%s.html", typeName, name, suffix)

	// Use existing handlers
	// Try scraping first for better titles
	info, err := d.getArbitraryList(targetURL)
	if err == nil && len(info.Chapters) > 0 {
		return info, nil
	}
	return d.getNozomiList(targetURL)
}

func (d *HitomiDownloader) fetchGalleryData(galleryID string) (*HitomiGallery, error) {
	// Ensure CDN domain is available
	if d.cdnDomain == "" {
		// Provide a fallback default if not yet initialized, though RefreshGG should have been called.
		// For bulk title fetching, we might not have called RefreshGG yet.
		// Let's use the known new default.
		d.cdnDomain = "ltn.gold-usergeneratedcontent.net"
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	jsonURL := fmt.Sprintf("https://%s/galleries/%s.js", d.cdnDomain, galleryID)
	req, _ := http.NewRequest("GET", jsonURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Referer", "https://hitomi.la/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch gallery info: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	bodyStr := string(body)
	// Remove "var galleryinfo = " prefix
	bodyStr = strings.TrimPrefix(bodyStr, "var galleryinfo = ")

	var gallery HitomiGallery
	if err := json.Unmarshal([]byte(bodyStr), &gallery); err != nil {
		return nil, err
	}
	return &gallery, nil
}

func (d *HitomiDownloader) getArbitraryList(url string) (*SiteInfo, error) {
	client := &http.Client{}

	allChapters := []ChapterInfo{}
	page := 1

	// Extract title/artist name from URL for SeriesName
	// e.g., /artist/tsuyatsuya-all.html -> Tsuyatsuya
	// e.g., /artist/tsuyatsuya-spanish.html -> Tsuyatsuya (Spanish)
	seriesName := "Hitomi Collection"
	parts := strings.Split(url, "/")
	if len(parts) > 0 {
		lastPart := parts[len(parts)-1] // tsuyatsuya-all.html
		name := strings.TrimSuffix(lastPart, ".html")
		// Decode URL-encoded characters (e.g., %20 -> space)
		if decoded, err := neturl.PathUnescape(name); err == nil {
			name = decoded
		}

		// Handle language suffixes for display name
		if strings.HasSuffix(name, "-all") {
			name = strings.TrimSuffix(name, "-all")
		} else {
			// Check for other common languages
			langs := []string{"-spanish", "-english", "-japanese", "-chinese", "-korean", "-french", "-german"}
			for _, lang := range langs {
				if strings.HasSuffix(name, lang) {
					baseName := strings.TrimSuffix(name, lang)
					langName := strings.TrimPrefix(lang, "-")
					name = fmt.Sprintf("%s (%s)", baseName, strings.Title(langName))
					break
				}
			}
		}

		name = strings.ReplaceAll(name, "-", " ")
		name = strings.Title(name)
		seriesName = name
	}

	reLink := regexp.MustCompile(`<a href="/galleries/(\d+)\.html"[^>]*>(.*?)</a>`)
	reTitle := regexp.MustCompile(`<h1><a href="[^"]*">([^<]*)</a></h1>`)

	for {
		// Hitomi uses ?page=1 (1-based)
		targetURL := url
		if strings.Contains(url, "?") {
			targetURL = fmt.Sprintf("%s&page=%d", url, page)
		} else {
			targetURL = fmt.Sprintf("%s?page=%d", url, page)
		}

		req, _ := http.NewRequest("GET", targetURL, nil)
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch page %d: %v", page, err)
		}
		defer resp.Body.Close()

		if resp.StatusCode == 404 {
			break
		}

		body, _ := io.ReadAll(resp.Body)
		bodyStr := string(body)

		// Find gallery links
		// The structure is usually .gallery-content -> a href="/galleries/ID.html" -> text or h1
		// We can scan for /galleries/(\d+).html and try to extract title nearby
		// A simple but effective way without DOM parser:
		// Look for <div class="...-content"> blocks
		// Inside them find <a href="/galleries/123.html">Title</a>

		// Since we don't have a DOM parser, let's use a simpler regex that captures the link and roughly the title.
		// On Hitomi artist pages, the title is often inside an h1 tag within the link, or just text.
		// Matches: <a href="/galleries/12345.html">...<h1>Title</h1>...</a> or similar variations.
		// Let's iterate over matches of the gallery link.

		matches := reLink.FindAllStringSubmatch(bodyStr, -1)

		// If no matches found in the first page, maybe it's effectively empty or structure changed
		if len(matches) == 0 && page == 1 {
			// Try a broader regex just for IDs if the structure is complex
			reSimpleID := regexp.MustCompile(`/galleries/(\d+)\.html`)
			matchesSimple := reSimpleID.FindAllStringSubmatch(bodyStr, -1)
			if len(matchesSimple) == 0 {
				return nil, fmt.Errorf("no galleries found on artist page")
			}
			// We found IDs but simpler regex, proceed with empty names or try to fetch
			for _, m := range matchesSimple {
				id := m[1]
				// Deduplicate helper
				exists := false
				for _, c := range allChapters {
					if c.ID == id {
						exists = true
						break
					}
				}
				if !exists {
					allChapters = append(allChapters, ChapterInfo{
						ID:   id,
						Name: fmt.Sprintf("Gallery %s", id), // Placeholder
						URL:  fmt.Sprintf("https://hitomi.la/galleries/%s.html", id),
					})
				}
			}
		} else if len(matches) > 0 {
			for _, m := range matches {
				id := m[1]
				rawContent := m[2] // This might contain HTML tags like <h1>...</h1>

				// Extract clean title from rawContent
				title := ""
				titleMatch := reTitle.FindStringSubmatch(rawContent)
				if len(titleMatch) > 1 {
					title = titleMatch[1]
				} else {
					// Strip all tags
					reTags := regexp.MustCompile(`<[^>]*>`)
					title = reTags.ReplaceAllString(rawContent, "")
				}
				title = strings.TrimSpace(title)
				if title == "" {
					title = fmt.Sprintf("Gallery %s", id)
				}

				// Deduplicate
				exists := false
				for _, c := range allChapters {
					if c.ID == id {
						exists = true
						break
					}
				}
				if !exists {
					allChapters = append(allChapters, ChapterInfo{
						ID:   id,
						Name: title,
						URL:  fmt.Sprintf("https://hitomi.la/galleries/%s.html", id),
					})
				}
			}
		} else {
			// No matches on page > 1, assume end of pagination
			break
		}

		// Safety break for too many pages or if we keep finding the same stuff
		if page > 50 {
			break
		}
		page++
	}

	return &SiteInfo{
		SeriesName: seriesName,
		Type:       "series",
		Chapters:   allChapters,
		SiteID:     d.GetSiteID(),
	}, nil
}

func (d *HitomiDownloader) getNozomiList(url string) (*SiteInfo, error) {
	// Convert URL to nozomi URL
	// https://hitomi.la/artist/tsuyatsuya-all.html -> https://ltn.hitomi.la/ids/artist/tsuyatsuya-all.nozomi

	parts := strings.Split(url, "/")
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid url structure")
	}

	// Extract type and name
	// url: .../TYPE/NAME.html
	// We need to support: artist, series, tag, character, group

	var typeName, name string

	if strings.Contains(url, "/artist/") {
		typeName = "artist"
	} else if strings.Contains(url, "/series/") {
		typeName = "series"
	} else if strings.Contains(url, "/tag/") {
		typeName = "tag"
	} else if strings.Contains(url, "/character/") {
		typeName = "character"
	} else if strings.Contains(url, "/group/") {
		typeName = "group"
	} else {
		return nil, fmt.Errorf("unsupported url type for nozomi fetch")
	}

	// Find name in URL parts
	for i, part := range parts {
		if part == typeName && i+1 < len(parts) {
			name = parts[i+1]
			break
		}
	}

	name = strings.TrimSuffix(name, ".html")
	// Decode URL-encoded characters (e.g., %20 -> space)
	if decoded, err := neturl.PathUnescape(name); err == nil {
		name = decoded
	}
	if name == "" {
		return nil, fmt.Errorf("could not extract name from url")
	}

	// Updated Hitomi.la nozomi location (2025)
	// pattern: https://ltn.gold-usergeneratedcontent.net/{type}/{name}.nozomi
	// The /ids/ path segment is removed on the new domain.
	nozomiURL := fmt.Sprintf("https://ltn.gold-usergeneratedcontent.net/%s/%s.nozomi", typeName, name)

	client := &http.Client{}
	req, _ := http.NewRequest("GET", nozomiURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Referer", "https://hitomi.la/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch nozomi file: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("nozomi file returned status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Parse Big Endian 32-bit Integers
	if len(data)%4 != 0 {
		// Log warning but proceed?
	}

	count := len(data) / 4
	chapters := make([]ChapterInfo, 0, count)

	// Process in reverse? Hitomi usually lists newest first in nozomi??
	// Actually nozomi is usually sorted by ID desc? Or unordered?
	// We'll read them sequentially.

	// Create a reader
	r := bytes.NewReader(data)
	var id int32

	for i := 0; i < count; i++ {
		if err := binary.Read(r, binary.BigEndian, &id); err != nil {
			break
		}

		idStr := fmt.Sprintf("%d", id)

		chapters = append(chapters, ChapterInfo{
			ID:   idStr,
			Name: fmt.Sprintf("Gallery %s", idStr), // No title available in nozomi
			URL:  fmt.Sprintf("https://hitomi.la/galleries/%s.html", idStr),
		})
	}

	// Fetch Titles in Parallel with limits
	// Limit to first 50 items for speed to avoid long wait times on large artist lists
	limit := 50
	if len(chapters) < limit {
		limit = len(chapters)
	}

	if limit > 0 {
		// Use a semaphore to limit concurrency
		semaphore := make(chan struct{}, 20) // Limit to 20 concurrent requests
		var wg sync.WaitGroup

		fmt.Printf("Fetching titles for %d galleries (limited from %d)...\n", limit, len(chapters))

		for i := 0; i < limit; i++ {
			wg.Add(1)
			go func(idx int) {
				defer wg.Done()

				semaphore <- struct{}{}        // Acquire token
				defer func() { <-semaphore }() // Release token

				id := chapters[idx].ID
				meta, err := d.fetchGalleryData(id)
				if err == nil {
					// Update title and language
					chapters[idx].Name = meta.Title
					if meta.Language != "" {
						chapters[idx].Language = mapHitomiLanguageToCode(meta.Language)
					}
				}
			}(i)
		}

		wg.Wait()
	}

	seriesName := strings.ReplaceAll(name, "-", " ")
	seriesName = strings.Title(seriesName)

	// Beautify Series Name if possible
	if strings.Contains(seriesName, " All") {
		seriesName = strings.ReplaceAll(seriesName, " All", "")
	} else {
		langs := []string{"Spanish", "English", "Japanese", "Chinese", "Korean", "French", "German"}
		for _, lang := range langs {
			if strings.Contains(seriesName, " "+lang) {
				baseName := strings.ReplaceAll(seriesName, " "+lang, "")
				seriesName = fmt.Sprintf("%s (%s)", baseName, lang)
				break
			}
		}
	}

	return &SiteInfo{
		SeriesName: seriesName,
		Type:       "series",
		Chapters:   chapters,
		SiteID:     d.GetSiteID(),
	}, nil
}
