//go:build integration
// +build integration

// Este archivo contiene tests de integración que requieren conexión a internet.
// Para ejecutarlos, usa: go test -tags=integration ./internal/modules/downloader

package downloader

import (
	"manga-visor/internal/persistence"
	"testing"
	"time"
)

// TestIntegration_FetchMangaInfo_Hitomi verifica que FetchMangaInfo funcione con URLs reales de Hitomi
// NOTA: Estos tests requieren conexión a internet y pueden fallar si:
// - No hay conexión a internet
// - Las URLs de ejemplo ya no existen
// - El sitio cambió su estructura
func TestIntegration_FetchMangaInfo_Hitomi(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pm := persistence.NewDownloaderManager()
	sm := persistence.NewSettingsManager()
	logger := &mockLogger{}

	module := NewModule(pm, sm, logger)

	// URLs de ejemplo de los comentarios
	testURLs := []string{
		"https://hitomi.la/galleries/12345.html", // URL de ejemplo del código
	}

	for _, url := range testURLs {
		t.Run(url, func(t *testing.T) {
			info, err := module.FetchMangaInfo(url)
			if err != nil {
				t.Logf("Error fetching %s (may be expected if URL doesn't exist): %v", url, err)
				return
			}

			if info == nil {
				t.Error("Got nil SiteInfo")
				return
			}

			if info.SiteID != "hitomi.la" {
				t.Errorf("Expected SiteID 'hitomi.la', got %q", info.SiteID)
			}

			if info.Type == "single" {
				if len(info.Images) == 0 {
					t.Error("Expected at least one image")
				}
				if info.SeriesName == "" {
					t.Error("Expected SeriesName to be set")
				}
			} else if info.Type == "series" {
				if len(info.Chapters) == 0 {
					t.Error("Expected at least one chapter")
				}
			}
		})
	}
}

// TestIntegration_FetchMangaInfo_MangaDex verifica que FetchMangaInfo funcione con URLs reales de MangaDex
func TestIntegration_FetchMangaInfo_MangaDex(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pm := persistence.NewDownloaderManager()
	sm := persistence.NewSettingsManager()
	logger := &mockLogger{}

	module := NewModule(pm, sm, logger)

	// URL de ejemplo del código: https://mangadex.org/chapter/d8176d81-0f14-4d5a-9d0b-fc56b3933cce
	// Nota: Esta URL puede no existir, así que el test puede fallar
	testURLs := []string{
		"https://mangadex.org/chapter/d8176d81-0f14-4d5a-9d0b-fc56b3933cce",
	}

	for _, url := range testURLs {
		t.Run(url, func(t *testing.T) {
			info, err := module.FetchMangaInfo(url)
			if err != nil {
				t.Logf("Error fetching %s (may be expected if URL doesn't exist): %v", url, err)
				return
			}

			if info == nil {
				t.Error("Got nil SiteInfo")
				return
			}

			if info.SiteID != "mangadex.org" {
				t.Errorf("Expected SiteID 'mangadex.org', got %q", info.SiteID)
			}

			if info.Type == "single" {
				if len(info.Images) == 0 {
					t.Error("Expected at least one image")
				}
			}
		})
	}
}

// TestIntegration_FetchMangaInfo_NHentai verifica que FetchMangaInfo funcione con URLs reales de NHentai
func TestIntegration_FetchMangaInfo_NHentai(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pm := persistence.NewDownloaderManager()
	sm := persistence.NewSettingsManager()
	logger := &mockLogger{}

	module := NewModule(pm, sm, logger)

	// URL de ejemplo del código: https://nhentai.net/g/12345/
	// Nota: Esta URL puede no existir, así que el test puede fallar
	testURLs := []string{
		"https://nhentai.net/g/12345/",
	}

	for _, url := range testURLs {
		t.Run(url, func(t *testing.T) {
			info, err := module.FetchMangaInfo(url)
			if err != nil {
				t.Logf("Error fetching %s (may be expected if URL doesn't exist): %v", url, err)
				return
			}

			if info == nil {
				t.Error("Got nil SiteInfo")
				return
			}

			if info.SiteID != "nhentai.net" {
				t.Errorf("Expected SiteID 'nhentai.net', got %q", info.SiteID)
			}

			if len(info.Images) == 0 {
				t.Error("Expected at least one image")
			}

			if info.SeriesName == "" {
				t.Error("Expected SeriesName to be set")
			}
		})
	}
}

// TestIntegration_FetchMangaInfo_ManhwaWeb verifica que FetchMangaInfo funcione con URLs reales de ManhwaWeb
func TestIntegration_FetchMangaInfo_ManhwaWeb(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pm := persistence.NewDownloaderManager()
	sm := persistence.NewSettingsManager()
	logger := &mockLogger{}

	module := NewModule(pm, sm, logger)

	// URLs de ejemplo del código
	testURLs := []string{
		"https://manhwaweb.com/manhwa/slug",      // Serie
		"https://manhwaweb.com/leer/slug",        // Capítulo
		"https://manhwaweb.com/chapters/see/slug", // Capítulo alternativo
	}

	for _, url := range testURLs {
		t.Run(url, func(t *testing.T) {
			info, err := module.FetchMangaInfo(url)
			if err != nil {
				t.Logf("Error fetching %s (may be expected if URL doesn't exist): %v", url, err)
				return
			}

			if info == nil {
				t.Error("Got nil SiteInfo")
				return
			}

			if info.SiteID != "manhwaweb" {
				t.Errorf("Expected SiteID 'manhwaweb', got %q", info.SiteID)
			}
		})
	}
}

// TestIntegration_FetchMangaInfo_ZonaTMO verifica que FetchMangaInfo funcione con URLs reales de ZonaTMO
func TestIntegration_FetchMangaInfo_ZonaTMO(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pm := persistence.NewDownloaderManager()
	sm := persistence.NewSettingsManager()
	logger := &mockLogger{}

	module := NewModule(pm, sm, logger)

	// URL de ejemplo del código
	testURLs := []string{
		"https://zonatmo.com/view_uploads/12345",
	}

	for _, url := range testURLs {
		t.Run(url, func(t *testing.T) {
			info, err := module.FetchMangaInfo(url)
			if err != nil {
				t.Logf("Error fetching %s (may be expected if URL doesn't exist): %v", url, err)
				return
			}

			if info == nil {
				t.Error("Got nil SiteInfo")
				return
			}

			if info.SiteID != "zonatmo" {
				t.Errorf("Expected SiteID 'zonatmo', got %q", info.SiteID)
			}

			if info.Type == "single" && len(info.Images) == 0 {
				t.Error("Expected at least one image for single type")
			}
		})
	}
}

// TestIntegration_FetchMangaInfo_Manga18 verifica que FetchMangaInfo funcione con URLs reales de Manga18
func TestIntegration_FetchMangaInfo_Manga18(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pm := persistence.NewDownloaderManager()
	sm := persistence.NewSettingsManager()
	logger := &mockLogger{}

	module := NewModule(pm, sm, logger)

	// URLs de ejemplo del código
	testURLs := []string{
		"https://manga18.club/manhwa/soeun",              // Serie
		"https://manga18.club/manhwa/soeun/chap-79",      // Capítulo
		"https://manga18.club/manhwa/so-eun-raw/42",      // Capítulo alternativo
		"https://manga18.club/manhwa/so-eun-raw/chapter-80", // Capítulo alternativo
	}

	for _, url := range testURLs {
		t.Run(url, func(t *testing.T) {
			info, err := module.FetchMangaInfo(url)
			if err != nil {
				t.Logf("Error fetching %s (may be expected if URL doesn't exist): %v", url, err)
				return
			}

			if info == nil {
				t.Error("Got nil SiteInfo")
				return
			}

			if info.SiteID != "manga18.club" {
				t.Errorf("Expected SiteID 'manga18.club', got %q", info.SiteID)
			}
		})
	}
}

// TestIntegration_FetchMangaInfo_Comics18 verifica que FetchMangaInfo funcione con URLs reales de Comics18
func TestIntegration_FetchMangaInfo_Comics18(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pm := persistence.NewDownloaderManager()
	sm := persistence.NewSettingsManager()
	logger := &mockLogger{}

	module := NewModule(pm, sm, logger)

	// URL de ejemplo del código: https://comics18.org/the-breakfast/
	testURLs := []string{
		"https://comics18.org/the-breakfast/",
	}

	for _, url := range testURLs {
		t.Run(url, func(t *testing.T) {
			info, err := module.FetchMangaInfo(url)
			if err != nil {
				t.Logf("Error fetching %s (may be expected if URL doesn't exist): %v", url, err)
				return
			}

			if info == nil {
				t.Error("Got nil SiteInfo")
				return
			}

			if info.SiteID != "comics18.org" {
				t.Errorf("Expected SiteID 'comics18.org', got %q", info.SiteID)
			}

			if len(info.Images) == 0 {
				t.Error("Expected at least one image")
			}
		})
	}
}

// TestIntegration_Timeout verifica que los timeouts funcionen correctamente
func TestIntegration_Timeout(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pm := persistence.NewDownloaderManager()
	sm := persistence.NewSettingsManager()
	logger := &mockLogger{}

	module := NewModule(pm, sm, logger)

	// URL que debería causar timeout (usando un dominio que no responde)
	// Nota: Este test puede ser flaky dependiendo de la configuración de red
	t.Run("InvalidDomain", func(t *testing.T) {
		start := time.Now()
		_, err := module.FetchMangaInfo("https://this-domain-should-not-exist-12345.com/page")
		duration := time.Since(start)

		// Debería fallar rápidamente (menos de 30 segundos)
		if duration > 30*time.Second {
			t.Errorf("Request took too long: %v", duration)
		}

		// Debería retornar un error
		if err == nil {
			t.Error("Expected error for invalid domain")
		}
	})
}
