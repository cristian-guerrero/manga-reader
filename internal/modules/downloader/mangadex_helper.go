package downloader

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func (d *MangaDexDownloader) getMangaChapters(client *http.Client, mangaID string) ([]ChapterInfo, error) {
	var chapters []ChapterInfo
	offset := 0
	limit := 500

	for {
		url := fmt.Sprintf("https://api.mangadex.org/manga/%s/feed?limit=%d&offset=%d&order[chapter]=asc", mangaID, limit, offset)
		req, _ := http.NewRequest("GET", url, nil)
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)

		var result mangaDexFeedResponse
		if err := json.Unmarshal(body, &result); err != nil {
			return nil, err
		}

		for _, ch := range result.Data {
			title := ch.Attributes.Title
			if title == "" {
				title = fmt.Sprintf("Chapter %s", ch.Attributes.Chapter)
			} else {
				title = fmt.Sprintf("Chapter %s - %s", ch.Attributes.Chapter, title)
			}

			// Find scan group
			scanGroup := ""
			for _, rel := range ch.Relationships {
				if rel.Type == "scanlation_group" {
					scanGroup = "Unknown Group" // Placeholder, fetching group name would require extra calls
				}
			}

			chapters = append(chapters, ChapterInfo{
				ID:        ch.ID,
				Name:      fmt.Sprintf("%s [%s]", title, ch.Attributes.TranslatedLanguage),
				URL:       fmt.Sprintf("https://mangadex.org/chapter/%s", ch.ID),
				Date:      ch.Attributes.PublishAt,
				ScanGroup: scanGroup,
				Language:  ch.Attributes.TranslatedLanguage,
			})
		}

		if result.Offset+result.Limit >= result.Total {
			break
		}
		offset += limit
	}

	return chapters, nil
}
