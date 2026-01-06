package downloader

import (
	"encoding/json"
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
	client := &http.Client{}
	req, _ := http.NewRequest("GET", viewerURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	bodyStr := string(body)

	// Extract window.dirPath
	reDirPath := regexp.MustCompile(`window\.dirPath\s*=\s*'(.*?)'`)
	matchPath := reDirPath.FindStringSubmatch(bodyStr)
	if len(matchPath) < 2 {
		return nil, fmt.Errorf("could not find dirPath")
	}
	dirPath := matchPath[1]

	// Extract window.images array
	reImages := regexp.MustCompile(`window\.images\s*=\s*(\[.*?\])`)
	matchImages := reImages.FindStringSubmatch(bodyStr)
	if len(matchImages) < 2 {
		return nil, fmt.Errorf("could not find images array")
	}

	var filenames []string
	if err := json.Unmarshal([]byte(matchImages[1]), &filenames); err != nil {
		return nil, err
	}

	seriesName := "Unknown"
	chapterName := "Chapter"

	// Try to get title from HTML
	reTitle := regexp.MustCompile(`<title>(.*?)</title>`)
	if matchTitle := reTitle.FindStringSubmatch(bodyStr); len(matchTitle) > 1 {
		title := matchTitle[1]
		parts := strings.Split(title, "|")
		if len(parts) > 0 {
			chapterName = strings.TrimSpace(parts[0])
		}
	}

	images := make([]ImageDownload, len(filenames))
	for i, name := range filenames {
		ext := "jpg"
		if idx := strings.LastIndex(name, "."); idx != -1 {
			ext = name[idx+1:]
		}

		images[i] = ImageDownload{
			URL:      dirPath + name,
			Filename: fmt.Sprintf("%03d.%s", i+1, ext),
			Index:    i,
		}
	}

	return &SiteInfo{
		SeriesName:  seriesName,
		ChapterName: chapterName,
		Images:      images,
		SiteID:      d.GetSiteID(),
	}, nil
}
