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

				if text != lastText {
					lastText = text

					// Validate URL
					if m.isValidURL(text) {
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

	supported := []string{
		"hitomi.la",
		"manhwaweb.com",
		"zonatmo.com",
		"nhentai.net",
		"mangadex.org",
		"manga18.club",
	}

	for _, domain := range supported {
		if strings.Contains(text, domain) {
			return true
		}
	}
	return false
}
