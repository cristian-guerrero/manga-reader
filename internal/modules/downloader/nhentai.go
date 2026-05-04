package downloader

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
)

type NHentaiDownloader struct{}

type nhentaiData struct {
	ID      json.Number `json:"id"`
	MediaID json.Number `json:"media_id"`
	Title   struct {
		English string `json:"english"`
		Pretty  string `json:"pretty"`
	} `json:"title"`
	Images struct {
		Pages []struct {
			T string `json:"t"` // "j", "p", "g"
		} `json:"pages"`
	} `json:"images"`
}

func (d *NHentaiDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "nhentai.net")
}

func (d *NHentaiDownloader) GetSiteID() string {
	return "nhentai.net"
}

func (d *NHentaiDownloader) GetImages(url string) (*SiteInfo, error) {
	// Extract ID from URL if possible, though we mainly need to fetch the page
	// URL example: https://nhentai.net/g/12345/

	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// Mimic a browser to avoid some basic filtering
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

	// Extract JSON embedded in HTML
	// New nhentai pages use SvelteKit and embed data in an application/json script tag:
	reSvelte := regexp.MustCompile(`<script type="application/json" data-sveltekit-fetched data-url="/api/v2/galleries/[^"]+">(.*?)</script>`)
	matchSvelte := reSvelte.FindStringSubmatch(bodyStr)

	// Fallback to older format (look for JSON.parse)
	reJSON := regexp.MustCompile(`JSON\.parse\((.*?)\);`)
	matchOld := reJSON.FindStringSubmatch(bodyStr)

	var mediaID, title, id string
	var images []ImageDownload

	if len(matchSvelte) >= 2 {
		var svelteResp struct {
			Body string `json:"body"`
		}
		if err := json.Unmarshal([]byte(matchSvelte[1]), &svelteResp); err != nil {
			return nil, fmt.Errorf("failed to parse SvelteKit JSON wrapper: %v", err)
		}

		var parsedData struct {
			ID      json.Number `json:"id"`
			MediaID string      `json:"media_id"`
			Title   struct {
				English string `json:"english"`
				Pretty  string `json:"pretty"`
			} `json:"title"`
			Pages []struct {
				Path string `json:"path"` // e.g. "galleries/3868199/1.webp"
			} `json:"pages"`
		}
		if err := json.Unmarshal([]byte(svelteResp.Body), &parsedData); err != nil {
			return nil, fmt.Errorf("failed to parse SvelteKit body JSON: %v", err)
		}

		id = parsedData.ID.String()
		mediaID = parsedData.MediaID
		title = parsedData.Title.English
		if title == "" {
			title = parsedData.Title.Pretty
		}

		images = make([]ImageDownload, len(parsedData.Pages))
		for i, page := range parsedData.Pages {
			parts := strings.Split(page.Path, "/")
			filename := parts[len(parts)-1] // e.g. "1.webp"
			
			ext := "jpg"
			dotParts := strings.Split(filename, ".")
			if len(dotParts) > 1 {
				ext = dotParts[len(dotParts)-1]
			}

			// Prepend the image host
			imageURL := fmt.Sprintf("https://i.nhentai.net/%s", page.Path)

			images[i] = ImageDownload{
				URL:      imageURL,
				Filename: fmt.Sprintf("%03d.%s", i+1, ext),
				Index:    i,
				Headers: map[string]string{
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
					"Referer":    "https://nhentai.net/",
				},
			}
		}

	} else if len(matchOld) >= 2 {
		jsonStringQuoted := matchOld[1]

		var jsonRaw string
		if err := json.Unmarshal([]byte(jsonStringQuoted), &jsonRaw); err != nil {
			jsonRaw = jsonStringQuoted
		}

		var oldData nhentaiData
		if err := json.Unmarshal([]byte(jsonRaw), &oldData); err != nil {
			return nil, fmt.Errorf("failed to parse metadata JSON: %v", err)
		}

		id = oldData.ID.String()
		mediaID = oldData.MediaID.String()
		title = oldData.Title.English
		if title == "" {
			title = oldData.Title.Pretty
		}

		images = make([]ImageDownload, len(oldData.Images.Pages))
		for i, page := range oldData.Images.Pages {
			ext := "jpg"
			switch page.T {
			case "p":
				ext = "png"
			case "g":
				ext = "gif"
			case "w":
				ext = "webp"
			}

			imageURL := fmt.Sprintf("https://i.nhentai.net/galleries/%s/%d.%s", mediaID, i+1, ext)

			images[i] = ImageDownload{
				URL:      imageURL,
				Filename: fmt.Sprintf("%03d.%s", i+1, ext),
				Index:    i,
				Headers: map[string]string{
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
					"Referer":    "https://nhentai.net/",
				},
			}
		}
	} else {
		return nil, fmt.Errorf("could not find metadata JSON in page")
	}

	fullTitle := fmt.Sprintf("%s [%s]", title, id)

	return &SiteInfo{
		SeriesName:  fullTitle,
		ChapterName: "", // Empty to prevent subfolder creation
		Images:      images,
		SiteID:      d.GetSiteID(),
	}, nil
}
