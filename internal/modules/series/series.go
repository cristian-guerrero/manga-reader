package series

import (
	"context"
	"fmt"
	"manga-visor/internal/fileloader"
	"manga-visor/internal/persistence"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// SeriesEntryWithURLs is a SeriesEntry with added URL fields for the frontend
type SeriesEntryWithURLs struct {
	ID           string            `json:"id"`
	Path         string            `json:"path"`
	Name         string            `json:"name"`
	CoverImage   string            `json:"coverImage"`
	AddedAt      string            `json:"addedAt"`
	IsTemporary  bool              `json:"isTemporary"`
	ThumbnailURL string            `json:"thumbnailUrl"`
	Chapters     []ChapterWithURLs `json:"chapters"`
}

type ChapterWithURLs struct {
	Path         string `json:"path"`
	Name         string `json:"name"`
	CoverImage   string `json:"coverImage"`
	ImageCount   int    `json:"imageCount"`
	ThumbnailURL string `json:"thumbnailUrl"`
}

// Module handles Series logic
type Module struct {
	ctx        context.Context
	series     *persistence.SeriesManager
	fileLoader *fileloader.FileLoader
	imgServer  *fileloader.ImageServer
}

// NewModule creates a new Series module
func NewModule(series *persistence.SeriesManager, fileLoader *fileloader.FileLoader, imgServer *fileloader.ImageServer) *Module {
	return &Module{
		series:     series,
		fileLoader: fileLoader,
		imgServer:  imgServer,
	}
}

// SetContext sets the Wails context
func (m *Module) SetContext(ctx context.Context) {
	m.ctx = ctx
}

// SetImageServer sets the image server dependency
func (m *Module) SetImageServer(imgServer *fileloader.ImageServer) {
	m.imgServer = imgServer
}

// getBaseURL returns the base URL for images
func (m *Module) getBaseURL() string {
	if m.imgServer != nil && m.imgServer.Addr != "" {
		return m.imgServer.Addr
	}
	return ""
}

// AddSeries adds a series with its chapters
func (m *Module) AddSeries(path string, subfolders []persistence.FolderInfo, isTemp bool) (*persistence.AddFolderResult, error) {
	// Root images for cover detection
	rootImages, _ := m.fileLoader.GetImages(path)
	var coverImage string

	if len(rootImages) > 0 {
		coverImage = rootImages[0].Path
		for _, img := range rootImages {
			lowerName := strings.ToLower(img.Name)
			if strings.Contains(lowerName, "cover") || strings.Contains(lowerName, "folder") || strings.Contains(lowerName, "thumb") {
				coverImage = img.Path
				break
			}
			if coverImage == rootImages[0].Path && img.Size < 500*1024 {
				coverImage = img.Path
			}
		}
	} else if len(subfolders) > 0 {
		coverImage = subfolders[0].CoverImage
	}

	chapters := make([]persistence.ChapterInfo, len(subfolders))
	for i, sub := range subfolders {
		// Find first image in subfolder for chapter cover
		chapterImages, _ := m.fileLoader.GetImages(sub.Path)
		chCover := ""
		if len(chapterImages) > 0 {
			chCover = chapterImages[0].Name
		}

		chapters[i] = persistence.ChapterInfo{
			Path:       sub.Path,
			Name:       sub.Name,
			CoverImage: chCover,
			ImageCount: sub.ImageCount,
		}
	}

	entry := persistence.SeriesEntry{
		Path:        path,
		Name:        filepath.Base(path),
		CoverImage:  coverImage,
		AddedAt:     time.Now().Format(time.RFC3339),
		Chapters:    chapters,
		IsTemporary: isTemp,
	}

	if err := m.series.Add(entry); err != nil {
		fmt.Printf("Error adding series: %v\n", err)
		return nil, err
	}

	runtime.EventsEmit(m.ctx, "series_updated")
	fmt.Printf("Series added: %s with %d chapters (temp: %v)\n", path, len(subfolders), isTemp)
	return &persistence.AddFolderResult{Path: path, IsSeries: true}, nil
}

// GetSeries returns all series entries with direct links
func (m *Module) GetSeries() []SeriesEntryWithURLs {
	entries := m.series.GetAll()
	result := make([]SeriesEntryWithURLs, len(entries))

	baseURL := m.getBaseURL()
	for i, entry := range entries {
		chapters := make([]ChapterWithURLs, len(entry.Chapters))
		changed := false

		for j, ch := range entry.Chapters {
			dirHash := m.fileLoader.RegisterDirectory(ch.Path)
			fid := ch.CoverImage

			// Proactively find cover image if missing
			if fid == "" {
				chapterImages, _ := m.fileLoader.GetImages(ch.Path)
				if len(chapterImages) > 0 {
					fid = chapterImages[0].Name
					entry.Chapters[j].CoverImage = fid
					changed = true
				} else {
					fid = filepath.Base(ch.Path)
				}
			}

			chapters[j] = ChapterWithURLs{
				Path:         entry.Chapters[j].Path,
				Name:         entry.Chapters[j].Name,
				CoverImage:   entry.Chapters[j].CoverImage,
				ImageCount:   entry.Chapters[j].ImageCount,
				ThumbnailURL: fmt.Sprintf("%s/thumbnails?did=%s&fid=%s", baseURL, dirHash, url.QueryEscape(fid)),
			}
		}

		// If we fixed any missing covers, save back
		if changed {
			m.series.Add(entry)
		}

		dirHash := m.fileLoader.RegisterDirectory(filepath.Dir(entry.CoverImage))
		result[i] = SeriesEntryWithURLs{
			ID:           entry.ID,
			Path:         entry.Path,
			Name:         entry.Name,
			CoverImage:   entry.CoverImage,
			AddedAt:      entry.AddedAt,
			IsTemporary:  entry.IsTemporary,
			ThumbnailURL: fmt.Sprintf("%s/thumbnails?did=%s&fid=%s", baseURL, dirHash, url.QueryEscape(filepath.Base(entry.CoverImage))),
			Chapters:     chapters,
		}
	}

	return result
}

// RemoveSeries removes a series entry
func (m *Module) RemoveSeries(path string) error {
	entry := m.series.Get(path)
	if entry != nil && entry.IsTemporary {
		// cleanup logic
		// This should ideally be a shared utility method
		os.RemoveAll(path)
	}

	err := m.series.Remove(path)
	if err == nil {
		runtime.EventsEmit(m.ctx, "series_updated")
	}
	return err
}

// ClearSeries removes all series entries
func (m *Module) ClearSeries() error {
	entries := m.series.GetAll()
	for _, entry := range entries {
		if entry.IsTemporary {
			os.RemoveAll(entry.Path)
		}
	}

	err := m.series.Clear()
	if err == nil {
		runtime.EventsEmit(m.ctx, "series_updated")
	}
	return err
}

// ChapterNavigation contains adjacent chapter info
type ChapterNavigation struct {
	PrevChapter   *persistence.ChapterInfo `json:"prevChapter"`
	NextChapter   *persistence.ChapterInfo `json:"nextChapter"`
	SeriesPath    string                   `json:"seriesPath"`
	SeriesName    string                   `json:"seriesName"`
	ChapterIndex  int                      `json:"chapterIndex"`
	TotalChapters int                      `json:"totalChapters"`
}

// GetChapterNavigation returns prev/next chapter for a given chapter path
func (m *Module) GetChapterNavigation(chapterPath string) *ChapterNavigation {
	entries := m.series.GetAll()

	for _, entry := range entries {
		for i, ch := range entry.Chapters {
			if ch.Path == chapterPath {
				nav := &ChapterNavigation{
					SeriesPath:    entry.Path,
					SeriesName:    entry.Name,
					ChapterIndex:  i,
					TotalChapters: len(entry.Chapters),
				}

				if i > 0 {
					prev := entry.Chapters[i-1]
					nav.PrevChapter = &prev
				}

				if i < len(entry.Chapters)-1 {
					next := entry.Chapters[i+1]
					nav.NextChapter = &next
				}

				return nav
			}
		}
	}

	return nil
}

// GetSiblings returns all chapters in the same series for a given chapter path
// This is useful for building a 'series' list in the reader
func (m *Module) GetSiblings(chapterPath string) []persistence.ChapterInfo {
	entries := m.series.GetAll()
	for _, entry := range entries {
		for _, ch := range entry.Chapters {
			if ch.Path == chapterPath {
				// Return copies to avoid modification
				result := make([]persistence.ChapterInfo, len(entry.Chapters))
				copy(result, entry.Chapters)

				// Ensure sort order is correct (usually alphabetical by path or name)
				sort.Slice(result, func(i, j int) bool {
					return strings.ToLower(result[i].Name) < strings.ToLower(result[j].Name)
				})

				return result
			}
		}
	}
	return nil
}
