package downloader

import (
	"encoding/json"
	"testing"
)

// TestManhwaWebSlug verifica que el slug se extraiga de todos los formatos de URL soportados
func TestManhwaWebSlug(t *testing.T) {
	testCases := []struct {
		name string
		url  string
		want string
	}{
		{
			name: "leer URL",
			url:  "https://www.manhwaweb.com/leer/My_girlfriend_has_already_done_teaching_1768215801769-46_01",
			want: "My_girlfriend_has_already_done_teaching_1768215801769-46_01",
		},
		{
			name: "leer_18 URL",
			url:  "https://manhwaweb.com/leer_18/some-slug",
			want: "some-slug",
		},
		{
			name: "chapters/see URL",
			url:  "https://manhwaweb.com/chapters/see/some-slug",
			want: "some-slug",
		},
		{
			name: "manhwa URL",
			url:  "https://manhwaweb.com/manhwa/my-slug",
			want: "my-slug",
		},
		{
			name: "trailing slash and query",
			url:  "https://manhwaweb.com/leer/some-slug/?foo=bar",
			want: "some-slug",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			got := manhwaWebSlug(tc.url)
			if got != tc.want {
				t.Errorf("manhwaWebSlug(%q) = %q, want %q", tc.url, got, tc.want)
			}
		})
	}
}

// TestManhwaWebSeriesFromSlug verifica el fallback de nombre de serie cuando la API no devuelve nombre
func TestManhwaWebSeriesFromSlug(t *testing.T) {
	testCases := []struct {
		slug string
		want string
	}{
		{"My_girlfriend_has_already_done_teaching_1768215801769-46_01", "My girlfriend has already done teaching"},
		{"some-title_1768215801769-3", "some title"},
		{"my-cool-title-1768215801769-3", "my cool title"},
		{"no-dashes", "no dashes"},
		{"", "Unknown"},
	}

	for _, tc := range testCases {
		got := manhwaWebSeriesFromSlug(tc.slug)
		if got != tc.want {
			t.Errorf("manhwaWebSeriesFromSlug(%q) = %q, want %q", tc.slug, got, tc.want)
		}
	}
}

// TestFlexFloat64 verifica que los numeros de capitulo se parseen tanto como numero (46)
// como como texto con versiones especiales ("46_01")
func TestFlexFloat64(t *testing.T) {
	testCases := []struct {
		name string
		json string
		want string
	}{
		{name: "number", json: `{"chapter":46}`, want: "46"},
		{name: "decimal number", json: `{"chapter":46.5}`, want: "46.5"},
		{name: "numeric string", json: `{"chapter":"45"}`, want: "45"},
		{name: "decimal string", json: `{"chapter":"46.5"}`, want: "46.5"},
		{name: "version string", json: `{"chapter":"46_01"}`, want: "46_01"},
		{name: "null", json: `{"chapter":null}`, want: "0"},
		{name: "missing", json: `{}`, want: "0"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var payload struct {
				Chapter FlexFloat64 `json:"chapter"`
			}
			if err := json.Unmarshal([]byte(tc.json), &payload); err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got := payload.Chapter.String(); got != tc.want {
				t.Errorf("String() = %q, want %q", got, tc.want)
			}
		})
	}

	t.Run("invalid type returns error", func(t *testing.T) {
		var payload struct {
			Chapter FlexFloat64 `json:"chapter"`
		}
		if err := json.Unmarshal([]byte(`{"chapter":{}}`), &payload); err == nil {
			t.Error("expected an error for object chapter value")
		}
	})
}

// TestManhwaChapterUnmarshal verifica el parseo de una respuesta real de /chapters/see
func TestManhwaChapterUnmarshal(t *testing.T) {
	body := `{
		"name": "Mi Novia ya ha Sido Completamente Entrenada",
		"erotico": "si",
		"chapter": {
			"chapter": "46_01",
			"img": ["https://img2mw.xyz/manhwas/series/chapter_46/ver_01/001.webp", ""]
		}
	}`

	var data ManhwaChapter
	if err := json.Unmarshal([]byte(body), &data); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got := data.Chapter.Chapter.String(); got != "46_01" {
		t.Errorf("chapter = %q, want %q", got, "46_01")
	}
	if len(data.Chapter.Img) != 2 {
		t.Errorf("images = %d, want 2", len(data.Chapter.Img))
	}
	if data.Name != "Mi Novia ya ha Sido Completamente Entrenada" {
		t.Errorf("name = %q", data.Name)
	}
}

// TestManhwaWebChapters verifica que se usen link, versions como fallback, y que se
// omitan los capitulos sin link (los que la pagina tambien oculta)
func TestManhwaWebChapters(t *testing.T) {
	body := `{
		"name_esp": "Mi Novia ya ha Sido Completamente Entrenada",
		"chapters": [
			{"chapter": 45, "link": "https://manhwaweb.com/leer/serie-45_01"},
			{"chapter": 46, "link": "", "versions": [
				{"link": ""},
				{"link": "https://manhwaweb.com/leer/serie-46_01"}
			]},
			{"chapter": 47, "link": "", "versions": []}
		]
	}`

	var data ManhwaSeriesResponse
	if err := json.Unmarshal([]byte(body), &data); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	chapters := manhwaWebChapters(data, data.NameEsp)
	if len(chapters) != 2 {
		t.Fatalf("chapters = %d, want 2", len(chapters))
	}

	// Newest first
	if chapters[0].URL != "https://manhwaweb.com/leer/serie-46_01" {
		t.Errorf("first chapter URL = %q", chapters[0].URL)
	}
	if chapters[0].ID != "46" || chapters[0].Name != "Mi Novia ya ha Sido Completamente Entrenada 46" {
		t.Errorf("first chapter = %+v", chapters[0])
	}
	if chapters[1].URL != "https://manhwaweb.com/leer/serie-45_01" {
		t.Errorf("second chapter URL = %q", chapters[1].URL)
	}
}

// TestManhwaWebCanHandle verifica las URLs que el downloader acepta
func TestManhwaWebCanHandle(t *testing.T) {
	d := &ManhwaWebDownloader{}
	valid := []string{
		"https://www.manhwaweb.com/leer/My_girlfriend_has_already_done_teaching_1768215801769-46_01",
		"https://manhwaweb.com/manhwa/my-slug",
	}
	invalid := []string{
		"https://example.com/leer/slug",
		"https://mangadex.org/chapter/test",
	}

	for _, url := range valid {
		if !d.CanHandle(url) {
			t.Errorf("CanHandle(%q) = false, want true", url)
		}
	}
	for _, url := range invalid {
		if d.CanHandle(url) {
			t.Errorf("CanHandle(%q) = true, want false", url)
		}
	}
}
