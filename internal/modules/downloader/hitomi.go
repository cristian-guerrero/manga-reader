package downloader

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
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
	Title string `json:"title"`
}

func (d *HitomiDownloader) GetImages(url string) (*SiteInfo, error) {
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

	// Fetch gallery info using the CDN domain
	client := &http.Client{}
	jsonURL := fmt.Sprintf("https://%s/galleries/%s.js", d.cdnDomain, galleryID)
	req, _ := http.NewRequest("GET", jsonURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Referer", "https://hitomi.la/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch gallery info from %s: %v", jsonURL, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	bodyStr := string(body)
	// Remove "var galleryinfo = " prefix
	bodyStr = strings.TrimPrefix(bodyStr, "var galleryinfo = ")

	var gallery HitomiGallery
	if err := json.Unmarshal([]byte(bodyStr), &gallery); err != nil {
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
		}
	}

	return &SiteInfo{
		SeriesName:  gallery.Title,
		ChapterName: galleryID,
		Images:      images,
		SiteID:      d.GetSiteID(),
	}, nil
}
