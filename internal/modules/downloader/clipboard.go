package downloader

import (
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (m *Module) StartClipboardMonitor() {
	go func() {
		lastText := ""
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-m.ctx.Done():
				return
			case <-ticker.C:
				// Check if monitoring is enabled in settings
				// We need to be careful about thread safety if accessing m.sm directly if it's not thread safe,
				// but SettingsManager uses RWMutex so it is safe.
				settings := m.sm.Get()
				if !settings.ClipboardAutoMonitor {
					continue
				}

				text, err := runtime.ClipboardGetText(m.ctx)
				if err != nil {
					continue
				}

				text = strings.TrimSpace(text)
				if text == "" {
					continue
				}

				if text != lastText {
					lastText = text

					// Validate URL
					if m.isValidURL(text) {
						if m.logger != nil {
							m.logger.Infof("[Clipboard] Detected valid URL: %s", text)
						}
						runtime.EventsEmit(m.ctx, "clipboard_url_detected", text)
					}
				}
			}
		}
	}()
}

func (m *Module) isValidURL(text string) bool {
	if !strings.HasPrefix(text, "http") {
		return false
	}

	// For certain sites, we only want to auto-detect single chapters/galleries in the clipboard,
	// not artist lists or search results (series).
	if strings.Contains(text, "hentaiera.com") {
		return strings.Contains(text, "/gallery/") || strings.Contains(text, "/view/")
	}
	if strings.Contains(text, "hentaiforce.net") {
		return strings.Contains(text, "/view/")
	}
	if strings.Contains(text, "nhentai.net") {
		return strings.Contains(text, "/g/")
	}
	if strings.Contains(text, "nhentai.xxx") {
		return strings.Contains(text, "/g/")
	}
	if strings.Contains(text, "nhentai.website") {
		return strings.Contains(text, "/g/")
	}
	if strings.Contains(text, "nhentai.com") {
		return strings.Contains(text, "/en/comic/")
	}
	if strings.Contains(text, "imhentai.to") {
		return strings.Contains(text, "/g/") || strings.Contains(text, "/view/")
	}
	if strings.Contains(text, "imhentai.xxx") {
		return strings.Contains(text, "/gallery/") || strings.Contains(text, "/view/")
	}
	if strings.Contains(text, "hentaivox.com") {
		return strings.Contains(text, "/gallery/") || strings.Contains(text, "/view/") || strings.Contains(text, "/g/")
	}
	if strings.Contains(text, "lhentai.com") {
		return strings.Contains(text, "/g/")
	}
	if strings.Contains(text, "3hentai.net") {
		return strings.Contains(text, "/d/")
	}
	if strings.Contains(text, "lectorhentai.com") {
		return strings.Contains(text, "/manga/") || strings.Contains(text, "/read/")
	}
	if strings.Contains(text, "hentaifox.com") {
		return strings.Contains(text, "/gallery/") || strings.Contains(text, "/g/")
	}
	if strings.Contains(text, "nhentai.to") {
		return strings.Contains(text, "/g/") || strings.Contains(text, "/gallery/")
	}

	supported := []string{
		"hitomi.la",
		"manhwaweb.com",
		"zonatmo.com",
		"lectortmo.com",
		"tmofans.com",
		"turomance.com",
		"tumangaonline.com",
		"mangadex.org",
		"manga18.club",
		"comics18.org",
		"hentaifc.com",
		"e-hentai.org",
		"exhentai.org",
		"ehentai.org",
		"submanhwa.com",
		"hentairead.io",
		"mangatoon.mobi",
	}

	for _, domain := range supported {
		if strings.Contains(text, domain) {
			return true
		}
	}
	return false
}
