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

var (
	// manhwaWebSuffixDigits matches the numeric id appended to series slugs
	// (e.g. "..._teaching_1768215801769").
	manhwaWebSuffixDigits = regexp.MustCompile(`[_-]\d{8,}$`)
	// manhwaWebChapterSuffix matches the chapter number at the end of a chapter
	// slug (e.g. "-46" or "-46_01").
	manhwaWebChapterSuffix = regexp.MustCompile(`-\d+(?:_\d+)?$`)
	// manhwaWebPlainNumber matches plain numeric chapter values ("45", "46.5").
	// Values like "46_01" are kept as text: strconv.ParseFloat would read the
	// underscore as a digit separator and return 4601.
	manhwaWebPlainNumber = regexp.MustCompile(`^[+-]?\d+(?:\.\d+)?$`)
)

const (
	// manhwaWebAPIBase is the backend used by the ManhwaWeb SPA. It moved from the
	// old Railway host (which now answers 404 "Application not found").
	manhwaWebAPIBase = "https://api.manhwaweb.com"
	manhwaWebSite    = "https://manhwaweb.com/"
)

// FlexFloat64 stores chapter numbers, which the API returns either as a JSON
// number (46) or as a string with special versions ("46_01"). Plain numbers stay
// numeric so formatting is unchanged; anything else keeps the original text.
type FlexFloat64 struct {
	value float64
	text  string
}

func (f *FlexFloat64) UnmarshalJSON(data []byte) error {
	var v float64
	if err := json.Unmarshal(data, &v); err == nil {
		*f = FlexFloat64{value: v}
		return nil
	}
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		if manhwaWebPlainNumber.MatchString(s) {
			parsed, err := strconv.ParseFloat(s, 64)
			if err != nil {
				return err
			}
			*f = FlexFloat64{value: parsed}
		} else {
			*f = FlexFloat64{text: s}
		}
		return nil
	}
	return fmt.Errorf("cannot unmarshal %s into chapter number", string(data))
}

func (f FlexFloat64) String() string {
	if f.text != "" {
		return f.text
	}
	return strconv.FormatFloat(f.value, 'f', -1, 64)
}

// manhwaWebSeriesFromSlug builds a readable series name from a chapter slug like
// "My_girlfriend-1768215801769-46_01": the trailing chapter number is removed,
// then the series id separators become spaces and the id digits are dropped.
func manhwaWebSeriesFromSlug(slug string) string {
	base := manhwaWebChapterSuffix.ReplaceAllString(slug, "")
	base = manhwaWebSuffixDigits.ReplaceAllString(base, "")
	name := strings.TrimSpace(strings.NewReplacer("_", " ", "-", " ").Replace(base))
	if name == "" {
		return "Unknown"
	}
	return name
}

// manhwaWebSlug extracts the chapter/series slug from any supported URL format:
// https://manhwaweb.com/leer/slug, /leer_18/slug, /chapters/see/slug (query and
// trailing slash included).
func manhwaWebSlug(url string) string {
	if i := strings.IndexAny(url, "?#"); i >= 0 {
		url = url[:i]
	}
	url = strings.TrimRight(url, "/")
	parts := strings.Split(url, "/")
	return parts[len(parts)-1]
}

// manhwaWebChapters builds the chapter list (newest first) from the series
// payload, reading the first available link and skipping chapters without one.
func manhwaWebChapters(data ManhwaSeriesResponse, seriesName string) []ChapterInfo {
	chapters := []ChapterInfo{}
	for _, ch := range data.Chapters {
		link := ch.Link
		if link == "" {
			for _, v := range ch.Versions {
				if v.Link != "" {
					link = v.Link
					break
				}
			}
		}
		if link == "" {
			continue
		}

		chapters = append(chapters, ChapterInfo{
			ID:   fmt.Sprintf("%v", ch.Chapter),
			Name: fmt.Sprintf("%s %v", seriesName, ch.Chapter),
			URL:  link,
		})
	}

	// Reverse chapters to show newest first
	for i, j := 0, len(chapters)-1; i < j; i, j = i+1, j-1 {
		chapters[i], chapters[j] = chapters[j], chapters[i]
	}

	return chapters
}

type ManhwaWebDownloader struct{}

type ManhwaChapter struct {
	Name    string `json:"name"`
	Chapter struct {
		Img     []string   `json:"img"`
		Chapter FlexFloat64 `json:"chapter"`
	} `json:"chapter"`
}

type ManhwaSeriesResponse struct {
	ID          string `json:"_id"`
	NameEsp     string `json:"name_esp"`
	TheRealName string `json:"the_real_name"`
	Chapters []struct {
		Chapter FlexFloat64 `json:"chapter"`
		Link    string      `json:"link"`
		// Some chapters publish only alternative versions (e.g. "46_01") and leave
		// link empty, so the readable link lives in versions.
		Versions []struct {
			Link string `json:"link"`
		} `json:"versions"`
	} `json:"chapters"`
}

func (d *ManhwaWebDownloader) CanHandle(url string) bool {
	return strings.Contains(url, "manhwaweb.com")
}

func (d *ManhwaWebDownloader) GetSiteID() string {
	return "manhwaweb"
}

func (d *ManhwaWebDownloader) GetImages(url string) (*SiteInfo, error) {
	if strings.Contains(url, "/manhwa/") {
		return d.getSeries(url)
	}
	return d.getChapter(url)
}

func (d *ManhwaWebDownloader) getSeries(url string) (*SiteInfo, error) {
	// URL: https://manhwaweb.com/manhwa/slug
	slug := manhwaWebSlug(url)

	apiURL := fmt.Sprintf("%s/manhwa/see/%s", manhwaWebAPIBase, slug)

	req, _ := http.NewRequest("GET", apiURL, nil)
	req.Header.Set("Referer", manhwaWebSite)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error: %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	var data ManhwaSeriesResponse
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}

	seriesName := data.NameEsp
	if seriesName == "" {
		seriesName = data.TheRealName
	}

	chapters := manhwaWebChapters(data, seriesName)

	return &SiteInfo{
		SeriesName: seriesName,
		SiteID:     d.GetSiteID(),
		Type:       "series",
		Chapters:   chapters,
	}, nil
}

func (d *ManhwaWebDownloader) getChapter(url string) (*SiteInfo, error) {
	// Handle different URL formats:
	// https://manhwaweb.com/leer/slug
	// https://manhwaweb.com/leer_18/slug
	// https://manhwaweb.com/chapters/see/slug
	slug := manhwaWebSlug(url)

	apiURL := fmt.Sprintf("%s/chapters/see/%s", manhwaWebAPIBase, slug)

	req, _ := http.NewRequest("GET", apiURL, nil)
	req.Header.Set("Referer", manhwaWebSite)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error: %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	var data ManhwaChapter
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}

	seriesName := data.Name
	if seriesName == "" {
		// Fallback: build a readable name from the chapter slug
		// (e.g. "My_girlfriend-1768215801769-46_01" -> "My girlfriend").
		seriesName = manhwaWebSeriesFromSlug(slug)
	}

	chapterName := fmt.Sprintf("%s %v", seriesName, data.Chapter.Chapter)

	// Filter out empty URLs
	var images []ImageDownload
	for i, imgURL := range data.Chapter.Img {
		if imgURL == "" {
			continue
		}

		ext := "jpg"
		if strings.Contains(imgURL, ".png") {
			ext = "png"
		} else if strings.Contains(imgURL, ".webp") {
			ext = "webp"
		}

		images = append(images, ImageDownload{
			URL:      imgURL,
			Filename: fmt.Sprintf("%03d.%s", len(images)+1, ext),
			Index:    i,
			Headers: map[string]string{
				"Referer": manhwaWebSite,
			},
		})
	}

	return &SiteInfo{
		SeriesName:  seriesName,
		ChapterName: chapterName,
		Images:      images,
		SiteID:      d.GetSiteID(),
	}, nil
}
