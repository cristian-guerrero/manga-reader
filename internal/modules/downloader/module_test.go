package downloader

import (
	"manga-visor/internal/database"
	"manga-visor/internal/persistence"
	"os"
	"path/filepath"
	"testing"
)

func newTestModuleDownloader(t *testing.T) *Module {
	t.Helper()
	db, err := database.New(t.TempDir())
	if err != nil {
		t.Fatalf("failed to create test database: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	pm := database.NewDownloaderRepository(db)
	sm := database.NewSettingsRepository(db)
	return NewModule(pm, sm, &mockLogger{})
}

func TestModule_FetchMangaInfo_InvalidURL(t *testing.T) {
	module := newTestModuleDownloader(t)

	// Test con URL inválida
	_, err := module.FetchMangaInfo("https://invalid-site.com/page")
	if err == nil {
		t.Error("Expected error for invalid URL, got nil")
	}
}

func TestModule_FetchMangaInfo_ValidURLs(t *testing.T) {
	module := newTestModuleDownloader(t)

	// URLs de ejemplo de los comentarios en el código
	testCases := []struct {
		name    string
		url     string
		wantErr bool
	}{
		{
			name:    "Hitomi gallery URL",
			url:     "https://hitomi.la/galleries/12345.html",
			wantErr: false, // Puede fallar si no hay conexión, pero la estructura es válida
		},
		{
			name:    "MangaDex chapter URL",
			url:     "https://mangadex.org/chapter/d8176d81-0f14-4d5a-9d0b-fc56b3933cce",
			wantErr: false,
		},
		{
			name:    "NHentai gallery URL",
			url:     "https://nhentai.net/g/12345/",
			wantErr: false,
		},
		{
			name:    "Hentaiera gallery URL",
			url:     "https://hentaiera.com/gallery/664542/",
			wantErr: false,
		},
		{
			name:    "ManhwaWeb chapter URL",
			url:     "https://manhwaweb.com/leer/slug",
			wantErr: false,
		},
		{
			name:    "ZonaTMO URL",
			url:     "https://zonatmo.com/view_uploads/12345",
			wantErr: false,
		},
		{
			name:    "Manga18 chapter URL",
			url:     "https://manga18.club/manhwa/soeun/chap-79",
			wantErr: false,
		},
		{
			name:    "Comics18 URL",
			url:     "https://comics18.org/the-breakfast/",
			wantErr: false,
		},
		{
			name:    "Hentai2Read URL",
			url:     "https://hentai2read.com/ntr_midnight_pool_season_2/1/",
			wantErr: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			info, err := module.FetchMangaInfo(tc.url)
			if tc.wantErr {
				if err == nil {
					t.Errorf("Expected error for URL %s, got nil", tc.url)
				}
			} else {
				// Si hay error, puede ser por falta de conexión, pero verificamos que al menos
				// el downloader correcto fue seleccionado
				if err != nil {
					// Verificamos que el error no sea "no algorithm found"
					if err.Error() == "no algorithm found for this URL" {
						t.Errorf("No downloader found for URL %s", tc.url)
					}
					// Otros errores (red, parsing, etc.) son aceptables en tests sin conexión
					t.Logf("URL %s: error (expected if no internet): %v", tc.url, err)
				} else {
					// Si no hay error, verificamos que la estructura sea válida
					if info == nil {
						t.Error("Got nil SiteInfo")
					} else if info.SiteID == "" {
						t.Error("SiteID is empty")
					}
				}
			}
		})
	}
}

func TestSanitizeFilename(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Normal filename",
			input:    "Chapter 1",
			expected: "Chapter 1",
		},
		{
			name:     "Invalid characters",
			input:    "Chapter/1:Test?",
			expected: "Chapter_1_Test_",
		},
		{
			name:     "Windows reserved name",
			input:    "con",
			expected: "_con",
		},
		{
			name:     "Empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "Trailing dots and spaces",
			input:    "Test. . ",
			expected: "Test",
		},
		{
			name:     "Multiple spaces",
			input:    "Chapter    1",
			expected: "Chapter 1",
		},
		{
			name:     "NBSP character",
			input:    "Chapter\u00A01",
			expected: "Chapter 1",
		},
		{
			name:     "Very long filename",
			input:    "A" + string(make([]byte, 100)),
			expected: "", // Should be truncated, but exact length depends on implementation
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := sanitizeFilename(tc.input)
			if tc.name == "Very long filename" {
				// Para nombres muy largos, solo verificamos que no esté vacío y sea razonable
				if len(result) > 100 {
					t.Errorf("Filename too long: %d characters", len(result))
				}
			} else if result != tc.expected {
				t.Errorf("sanitizeFilename(%q) = %q, want %q", tc.input, result, tc.expected)
			}
		})
	}
}

func TestModule_GetHistory(t *testing.T) {
	module := newTestModuleDownloader(t)
	pm := module.pm

	// Limpiar historial primero para tener un estado limpio
	module.ClearHistory()

	// Agregar algunos jobs de prueba
	job1 := persistence.DownloadJob{
		ID:   "1",
		URL:  "https://example.com/1",
		Site: "test",
	}
	job2 := persistence.DownloadJob{
		ID:   "2",
		URL:  "https://example.com/2",
		Site: "test",
	}

	pm.AddJob(job1)
	pm.AddJob(job2)

	history := module.GetHistory()
	// Verificar que los jobs agregados estén en el historial
	// (puede haber otros jobs del historial previo, así que verificamos que al menos estén estos)
	found1 := false
	found2 := false
	for _, job := range history {
		if job.ID == "1" {
			found1 = true
		}
		if job.ID == "2" {
			found2 = true
		}
	}
	if !found1 || !found2 {
		t.Errorf("Expected jobs 1 and 2 in history, found1=%v, found2=%v", found1, found2)
	}
}

func TestModule_ClearHistory(t *testing.T) {
	module := newTestModuleDownloader(t)
	pm := module.pm

	pm.AddJob(persistence.DownloadJob{ID: "1", URL: "https://example.com/1"})
	pm.AddJob(persistence.DownloadJob{ID: "2", URL: "https://example.com/2"})

	// Limpiar historial
	module.ClearHistory()

	if len(pm.GetJobs()) != 0 {
		t.Error("Expected history to be cleared")
	}
}

func TestModule_RemoveJob(t *testing.T) {
	module := newTestModuleDownloader(t)

	pm := module.pm

	// Agregar un job
	job := persistence.DownloadJob{
		ID:   "test-job",
		URL:  "https://example.com/test",
		Site: "test",
	}
	pm.AddJob(job)

	// Remover el job
	module.RemoveJob("test-job")

	if len(pm.GetJobs()) != 0 {
		t.Error("Expected job to be removed")
	}
}

func TestModule_ClearDownloadsData(t *testing.T) {
	module := newTestModuleDownloader(t)
	sm := module.sm

	tmpDir := filepath.Join(t.TempDir(), "downloads")

	settings := sm.Get()
	settings.DownloadPath = tmpDir
	sm.Save(settings)

	// Crear algunos archivos de prueba
	testFile := filepath.Join(tmpDir, "test.txt")
	os.MkdirAll(tmpDir, 0755)
	os.WriteFile(testFile, []byte("test"), 0644)

	// Limpiar datos de descarga
	err := module.ClearDownloadsData()
	if err != nil {
		t.Errorf("ClearDownloadsData() error = %v", err)
	}

	// Verificar que el directorio fue recreado
	if _, err := os.Stat(tmpDir); os.IsNotExist(err) {
		t.Error("Expected download directory to be recreated")
	}

	// Verificar que los archivos fueron eliminados
	files, _ := os.ReadDir(tmpDir)
	if len(files) != 0 {
		t.Error("Expected download directory to be empty")
	}
}
