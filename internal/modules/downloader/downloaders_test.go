package downloader

import (
	"manga-visor/internal/persistence"
	"strings"
	"testing"
)

// TestCanHandle verifica que cada downloader pueda identificar correctamente las URLs que puede manejar
func TestCanHandle(t *testing.T) {
	testCases := []struct {
		name        string
		downloader  DownloaderInterface
		validURLs   []string
		invalidURLs []string
	}{
		{
			name:       "HitomiDownloader",
			downloader: &HitomiDownloader{},
			validURLs: []string{
				"https://hitomi.la/galleries/12345.html",
				"https://hitomi.la/artist/test-all.html",
				"https://hitomi.la/search.html?q=test",
			},
			invalidURLs: []string{
				"https://example.com/page",
				"https://nhentai.net/g/123/",
			},
		},
		{
			name:       "MangaDexDownloader",
			downloader: &MangaDexDownloader{},
			validURLs: []string{
				"https://mangadex.org/chapter/d8176d81-0f14-4d5a-9d0b-fc56b3933cce",
				"https://mangadex.org/title/12345-67890-abcdef",
			},
			invalidURLs: []string{
				"https://example.com/page",
				"https://hitomi.la/galleries/123.html",
			},
		},
		{
			name:       "NHentaiDownloader",
			downloader: &NHentaiDownloader{},
			validURLs: []string{
				"https://nhentai.net/g/12345/",
				"https://nhentai.net/g/67890",
			},
			invalidURLs: []string{
				"https://example.com/page",
				"https://hitomi.la/galleries/123.html",
			},
		},
		{
			name:       "IMHentaiDownloader",
			downloader: &IMHentaiDownloader{},
			validURLs: []string{
				"https://imhentai.xxx/gallery/1063156/",
				"https://imhentai.xxx/view/1063156/1/",
			},
			invalidURLs: []string{
				"https://example.com/page",
				"https://hentaiera.com/gallery/123/",
			},
		},
		{
			name:       "HentaieraDownloader",
			downloader: &HentaieraDownloader{},
			validURLs: []string{
				"https://hentaiera.com/gallery/664542/",
				"https://hentaiera.com/view/664542/1/",
			},
			invalidURLs: []string{
				"https://example.com/page",
				"https://nhentai.net/g/123/",
			},
		},
		{
			name:       "ManhwaWebDownloader",
			downloader: &ManhwaWebDownloader{},
			validURLs: []string{
				"https://manhwaweb.com/manhwa/slug",
				"https://manhwaweb.com/leer/slug",
				"https://manhwaweb.com/chapters/see/slug",
			},
			invalidURLs: []string{
				"https://example.com/page",
				"https://hitomi.la/galleries/123.html",
			},
		},
		{
			name:       "ZonaTMODownloader",
			downloader: &ZonaTMODownloader{},
			validURLs: []string{
				"https://zonatmo.com/view_uploads/12345",
				"https://tmofans.com/view_uploads/12345",
			},
			invalidURLs: []string{
				"https://example.com/page",
				"https://hitomi.la/galleries/123.html",
			},
		},
		{
			name:       "Manga18Downloader",
			downloader: &Manga18Downloader{},
			validURLs: []string{
				"https://manga18.club/manhwa/soeun",
				"https://manga18.club/manhwa/soeun/chap-79",
				"https://manga18.club/manhwa/so-eun-raw/42",
			},
			invalidURLs: []string{
				"https://example.com/page",
				"https://hitomi.la/galleries/123.html",
			},
		},
		{
			name:       "Comics18Downloader",
			downloader: &Comics18Downloader{},
			validURLs: []string{
				"https://comics18.org/the-breakfast/",
			},
			invalidURLs: []string{
				"https://example.com/page",
				"https://hitomi.la/galleries/123.html",
			},
		},
		{
			name:       "ComicPornDownloader",
			downloader: &ComicPornDownloader{},
			validURLs: []string{
				"https://comicporn.xxx/gallery/918336/",
				"https://comicporn.xxx/view/918336/1/",
			},
			invalidURLs: []string{
				"https://example.com/page",
				"https://nhentai.net/g/123/",
			},
		},
		{
			name:       "SubManhwaDownloader",
			downloader: &SubManhwaDownloader{},
			validURLs: []string{
				"https://submanhwa.com/serie/slug",
				"https://submanhwa.com/serie/slug/123.00",
			},
			invalidURLs: []string{
				"https://example.com/page",
				"https://zonatmo.com/view_uploads/123",
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Test URLs válidas
			for _, url := range tc.validURLs {
				if !tc.downloader.CanHandle(url) {
					t.Errorf("Expected %s to handle URL: %s", tc.name, url)
				}
			}

			// Test URLs inválidas
			for _, url := range tc.invalidURLs {
				if tc.downloader.CanHandle(url) {
					t.Errorf("Expected %s to NOT handle URL: %s", tc.name, url)
				}
			}
		})
	}
}

// TestGetSiteID verifica que cada downloader retorne el SiteID correcto
func TestGetSiteID(t *testing.T) {
	testCases := []struct {
		name       string
		downloader DownloaderInterface
		expectedID string
	}{
		{
			name:       "HitomiDownloader",
			downloader: &HitomiDownloader{},
			expectedID: "hitomi.la",
		},
		{
			name:       "MangaDexDownloader",
			downloader: &MangaDexDownloader{},
			expectedID: "mangadex.org",
		},
		{
			name:       "NHentaiDownloader",
			downloader: &NHentaiDownloader{},
			expectedID: "nhentai.net",
		},
		{
			name:       "HentaieraDownloader",
			downloader: &HentaieraDownloader{},
			expectedID: "hentaiera.com",
		},
		{
			name:       "ManhwaWebDownloader",
			downloader: &ManhwaWebDownloader{},
			expectedID: "manhwaweb",
		},
		{
			name:       "ZonaTMODownloader",
			downloader: &ZonaTMODownloader{},
			expectedID: "zonatmo",
		},
		{
			name:       "Manga18Downloader",
			downloader: &Manga18Downloader{},
			expectedID: "manga18.club",
		},
		{
			name:       "Comics18Downloader",
			downloader: &Comics18Downloader{},
			expectedID: "comics18.org",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			siteID := tc.downloader.GetSiteID()
			if siteID != tc.expectedID {
				t.Errorf("Expected SiteID %q, got %q", tc.expectedID, siteID)
			}
		})
	}
}

// TestModule_AlgorithmSelection verifica que el módulo seleccione el algoritmo correcto
func TestModule_AlgorithmSelection(t *testing.T) {
	pm := persistence.NewDownloaderManager()
	sm := persistence.NewSettingsManager()
	logger := &mockLogger{}

	module := NewModule(pm, sm, logger)

	testCases := []struct {
		url        string
		expectedID string
	}{
		{
			url:        "https://hitomi.la/galleries/12345.html",
			expectedID: "hitomi.la",
		},
		{
			url:        "https://mangadex.org/chapter/test",
			expectedID: "mangadex.org",
		},
		{
			url:        "https://nhentai.net/g/123/",
			expectedID: "nhentai.net",
		},
		{
			url:        "https://hentaiera.com/gallery/664542/",
			expectedID: "hentaiera.com",
		},
		{
			url:        "https://manhwaweb.com/manhwa/test",
			expectedID: "manhwaweb",
		},
		{
			url:        "https://zonatmo.com/view_uploads/123",
			expectedID: "zonatmo",
		},
		{
			url:        "https://manga18.club/manhwa/test",
			expectedID: "manga18.club",
		},
		{
			url:        "https://comics18.org/test/",
			expectedID: "comics18.org",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.url, func(t *testing.T) {
			var selectedAlgo DownloaderInterface
			for _, algo := range module.algorithms {
				if algo.CanHandle(tc.url) {
					selectedAlgo = algo
					break
				}
			}

			if selectedAlgo == nil {
				t.Errorf("No algorithm found for URL: %s", tc.url)
				return
			}

			if selectedAlgo.GetSiteID() != tc.expectedID {
				t.Errorf("Expected algorithm with SiteID %q, got %q", tc.expectedID, selectedAlgo.GetSiteID())
			}
		})
	}
}

// TestModule_InvalidURL verifica que URLs inválidas retornen error apropiado
func TestModule_InvalidURL(t *testing.T) {
	pm := persistence.NewDownloaderManager()
	sm := persistence.NewSettingsManager()
	logger := &mockLogger{}

	module := NewModule(pm, sm, logger)

	invalidURLs := []string{
		"https://unknown-site.com/page",
		"not-a-url",
		"",
		"ftp://example.com/file",
	}

	for _, url := range invalidURLs {
		t.Run(url, func(t *testing.T) {
			_, err := module.FetchMangaInfo(url)
			if err == nil {
				t.Errorf("Expected error for invalid URL: %s", url)
			}
			if !strings.Contains(err.Error(), "no algorithm found") {
				t.Errorf("Expected 'no algorithm found' error, got: %v", err)
			}
		})
	}
}
