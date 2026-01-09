package downloader

import (
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"
)

type Manga18Downloader struct{}

// normalizeSeriesName normaliza el nombre de la serie para consistencia
// entre descargas de capítulos individuales y series
func normalizeManga18SeriesName(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return raw
	}

	// Remover sufijos comunes que pueden variar
	// Ejemplo: "Soeun Manga" -> "Soeun"
	suffixes := []string{" Manga", " Manhwa", " - Manga", " - Manhwa"}
	for _, suffix := range suffixes {
		if strings.HasSuffix(raw, suffix) {
			raw = strings.TrimSuffix(raw, suffix)
			raw = strings.TrimSpace(raw)
		}
	}

	return strings.TrimSpace(raw)
}

func (d *Manga18Downloader) CanHandle(url string) bool {
	return strings.Contains(url, "manga18.club")
}

func (d *Manga18Downloader) GetSiteID() string {
	return "manga18.club"
}

func (d *Manga18Downloader) GetImages(url string) (*SiteInfo, error) {
	// Normalizar URL (remover doble slash)
	url = strings.ReplaceAll(url, "//manhwa/", "/manhwa/")
	url = strings.ReplaceAll(url, "manga18.club//", "manga18.club/")

	// Determinar si es serie o capítulo
	// Serie: https://manga18.club/manhwa/soeun
	// Capítulo: https://manga18.club/manhwa/soeun/chap-79
	if strings.Contains(url, "/chap-") {
		return d.getChapter(url)
	}
	return d.getSeries(url)
}

func (d *Manga18Downloader) getChapter(url string) (*SiteInfo, error) {
	// Extraer series y chapter de la URL
	// URL: https://manga18.club/manhwa/soeun/chap-79
	reURL := regexp.MustCompile(`manga18\.club/manhwa/([^/]+)/([^/]+)`)
	match := reURL.FindStringSubmatch(url)
	if len(match) < 3 {
		return nil, fmt.Errorf("invalid manga18.club chapter URL format")
	}
	series := match[1]      // "soeun"
	chapter := match[2]     // "chap-79"

	// Obtener HTML de la página
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Referer", "https://manga18.club/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch page: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch page, status: %d", resp.StatusCode)
	}

	// Parsear HTML
	doc, err := html.Parse(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %v", err)
	}

	// Extraer información del DOM
	// Usar el slug de la URL como fuente principal del nombre de la serie
	// para garantizar consistencia entre capítulos y series
	seriesName := series
	chapterName := fmt.Sprintf("Chapter %s", strings.TrimPrefix(chapter, "chap-"))
	totalPages := 0

	var extractInfo func(*html.Node)
	extractInfo = func(n *html.Node) {
		if n.Type == html.ElementNode {
			// Extraer título de la serie del <title> como fallback
			if n.DataAtom == atom.Title && n.FirstChild != nil {
				titleText := strings.TrimSpace(n.FirstChild.Data)
				// Formato: "Soeun - Chapter 79"
				if idx := strings.Index(titleText, " - "); idx != -1 {
					extractedName := strings.TrimSpace(titleText[:idx])
					// Normalizar y usar solo si el slug no es suficiente
					extractedName = normalizeManga18SeriesName(extractedName)
					// Capitalizar primera letra para mejor presentación
					if len(extractedName) > 0 {
						seriesName = strings.ToUpper(extractedName[:1]) + strings.ToLower(extractedName[1:])
					}
				}
			}

			// Buscar scripts que puedan contener información de páginas
			if n.DataAtom == atom.Script {
				var scriptContent strings.Builder
				for c := n.FirstChild; c != nil; c = c.NextSibling {
					if c.Type == html.TextNode {
						scriptContent.WriteString(c.Data)
					}
				}
				scriptText := scriptContent.String()
				
				// Buscar patrones como "totalPages: 33" o "pages: 33" o "count: 33"
				rePages := regexp.MustCompile(`(?i)(?:total|pages?|count)[\s:=]+(\d+)`)
				if match := rePages.FindStringSubmatch(scriptText); len(match) > 1 {
					if p, err := strconv.Atoi(match[1]); err == nil && p > 0 {
						totalPages = p
					}
				}
			}

			// Buscar en data attributes o meta tags
			if n.DataAtom == atom.Meta {
				for _, attr := range n.Attr {
					if attr.Key == "property" && strings.Contains(attr.Val, "page") {
						for _, attr2 := range n.Attr {
							if attr2.Key == "content" {
								if p, err := strconv.Atoi(attr2.Val); err == nil && p > 0 {
									totalPages = p
								}
							}
						}
					}
				}
			}
		}

		// Recursión sobre hijos
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			extractInfo(c)
		}
	}

	extractInfo(doc)

	// Normalizar nombre de la serie para consistencia
	seriesName = normalizeManga18SeriesName(seriesName)
	// Si después de normalizar está vacío o es "Unknown", usar el slug capitalizado
	if seriesName == "" || seriesName == "Unknown Series" {
		if len(series) > 0 {
			seriesName = strings.ToUpper(series[:1]) + strings.ToLower(series[1:])
		} else {
			seriesName = "Unknown Series"
		}
	}

	// Si no se encontró el número de páginas, probar números secuencialmente
	if totalPages == 0 {
		totalPages = d.findTotalPagesByProbing(series, chapter)
	}

	if totalPages == 0 {
		return nil, fmt.Errorf("could not determine total pages")
	}

	// Generar URLs de imágenes
	var images []ImageDownload
	baseURL := fmt.Sprintf("https://s1.manga18.club/manga/%s/chapters/%s", series, chapter)

	for i := 1; i <= totalPages; i++ {
		pageNum := fmt.Sprintf("%02d", i) // Padding de 2 dígitos: 01, 02, ...
		imgURL := fmt.Sprintf("%s/%s.jpg", baseURL, pageNum)

		images = append(images, ImageDownload{
			URL:      imgURL,
			Filename: fmt.Sprintf("%03d.jpg", i),
			Index:    i - 1,
			Headers: map[string]string{
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
				"Referer":    "https://manga18.club/",
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

func (d *Manga18Downloader) getSeries(url string) (*SiteInfo, error) {
	// Validar formato de URL
	// URL: https://manga18.club/manhwa/soeun
	reURL := regexp.MustCompile(`manga18\.club/manhwa/([^/]+)/?$`)
	match := reURL.FindStringSubmatch(url)
	if len(match) < 2 {
		return nil, fmt.Errorf("invalid manga18.club series URL format")
	}

	// Obtener HTML de la página de la serie
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Referer", "https://manga18.club/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch page: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch page, status: %d", resp.StatusCode)
	}

	// Parsear HTML
	doc, err := html.Parse(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %v", err)
	}

	// Extraer nombre de la serie
	// Usar el slug de la URL como fuente principal para consistencia
	seriesSlug := ""
	if len(match) >= 2 {
		seriesSlug = match[1]
	}

	seriesName := "Unknown Series"
	if seriesSlug != "" {
		// Capitalizar primera letra del slug
		seriesName = strings.ToUpper(seriesSlug[:1]) + strings.ToLower(seriesSlug[1:])
	}

	var extractSeriesName func(*html.Node)
	extractSeriesName = func(n *html.Node) {
		if n.Type == html.ElementNode {
			// Buscar en <title> como fallback
			if n.DataAtom == atom.Title && n.FirstChild != nil {
				titleText := strings.TrimSpace(n.FirstChild.Data)
				// Formato puede variar, intentar extraer nombre
				if idx := strings.Index(titleText, " - "); idx != -1 {
					extractedName := strings.TrimSpace(titleText[:idx])
					extractedName = normalizeManga18SeriesName(extractedName)
					if extractedName != "" {
						seriesName = strings.ToUpper(extractedName[:1]) + strings.ToLower(extractedName[1:])
					}
				} else if idx := strings.Index(titleText, " | "); idx != -1 {
					extractedName := strings.TrimSpace(titleText[:idx])
					extractedName = normalizeManga18SeriesName(extractedName)
					if extractedName != "" {
						seriesName = strings.ToUpper(extractedName[:1]) + strings.ToLower(extractedName[1:])
					}
				}
			}

			// Buscar en <h1> o elementos con clase que indiquen título
			if n.DataAtom == atom.H1 && n.FirstChild != nil {
				h1Text := strings.TrimSpace(n.FirstChild.Data)
				if h1Text != "" {
					h1Text = normalizeManga18SeriesName(h1Text)
					if h1Text != "" {
						seriesName = strings.ToUpper(h1Text[:1]) + strings.ToLower(h1Text[1:])
					}
				}
			}
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			extractSeriesName(c)
		}
	}

	extractSeriesName(doc)

	// Normalizar nombre final para consistencia
	seriesName = normalizeManga18SeriesName(seriesName)
	if seriesName == "" || seriesName == "Unknown Series" {
		if seriesSlug != "" {
			seriesName = strings.ToUpper(seriesSlug[:1]) + strings.ToLower(seriesSlug[1:])
		} else {
			seriesName = "Unknown Series"
		}
	}

	// Extraer lista de capítulos
	var chapters []ChapterInfo
	var extractChapters func(*html.Node)
	
	extractChapters = func(n *html.Node) {
		if n.Type == html.ElementNode {
			// Buscar enlaces que apunten a capítulos
			// Patrón: /manhwa/{series}/chap-{number}
			if n.DataAtom == atom.A {
				var href string
				for _, attr := range n.Attr {
					if attr.Key == "href" {
						href = attr.Val
						break
					}
				}

				// Verificar si es un enlace a un capítulo
				reChapterLink := regexp.MustCompile(`/manhwa/[^/]+/chap-([^/]+)`)
				if match := reChapterLink.FindStringSubmatch(href); len(match) > 1 {
					chapterID := match[1] // "79" o "chap-79"
					
					// Extraer texto del enlace (nombre del capítulo)
					var linkText strings.Builder
					var extractText func(*html.Node)
					extractText = func(node *html.Node) {
						if node.Type == html.TextNode {
							linkText.WriteString(strings.TrimSpace(node.Data))
						}
						for c := node.FirstChild; c != nil; c = c.NextSibling {
							extractText(c)
						}
					}
					extractText(n)
					
					chapterName := linkText.String()
					if chapterName == "" {
						chapterName = fmt.Sprintf("Chapter %s", strings.TrimPrefix(chapterID, "chap-"))
					}

					// Construir URL completa
					chapterURL := href
					if !strings.HasPrefix(chapterURL, "http") {
						if strings.HasPrefix(chapterURL, "/") {
							chapterURL = "https://manga18.club" + chapterURL
						} else {
							chapterURL = "https://manga18.club/" + chapterURL
						}
					}

					// Verificar si ya existe (evitar duplicados)
					exists := false
					for _, ch := range chapters {
						if ch.URL == chapterURL {
							exists = true
							break
						}
					}

					if !exists {
						chapters = append(chapters, ChapterInfo{
							ID:   chapterID,
							Name: chapterName,
							URL:  chapterURL,
						})
					}
				}
			}
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			extractChapters(c)
		}
	}

	extractChapters(doc)

	if len(chapters) == 0 {
		return nil, fmt.Errorf("no chapters found in series page")
	}

	// Ordenar capítulos (más recientes primero)
	// Intentar ordenar por número de capítulo
	// Si el ID es "79", ordenar numéricamente; si es "chap-79", extraer número
	for i := 0; i < len(chapters)-1; i++ {
		for j := i + 1; j < len(chapters); j++ {
			numI := d.extractChapterNumber(chapters[i].ID)
			numJ := d.extractChapterNumber(chapters[j].ID)
			if numI < numJ {
				chapters[i], chapters[j] = chapters[j], chapters[i]
			}
		}
	}

	// Revertir para mostrar más recientes primero
	for i, j := 0, len(chapters)-1; i < j; i, j = i+1, j-1 {
		chapters[i], chapters[j] = chapters[j], chapters[i]
	}

	return &SiteInfo{
		SeriesName: seriesName,
		SiteID:     d.GetSiteID(),
		Type:       "series",
		Chapters:   chapters,
	}, nil
}

// extractChapterNumber extrae el número del capítulo de un ID
// Ejemplos: "79" -> 79, "chap-79" -> 79, "chap-1" -> 1
func (d *Manga18Downloader) extractChapterNumber(id string) int {
	// Remover "chap-" si existe
	id = strings.TrimPrefix(id, "chap-")
	// Extraer número
	reNum := regexp.MustCompile(`(\d+)`)
	if match := reNum.FindStringSubmatch(id); len(match) > 1 {
		if num, err := strconv.Atoi(match[1]); err == nil {
			return num
		}
	}
	return 0
}

// findTotalPagesByProbing prueba números secuencialmente hasta obtener 404
func (d *Manga18Downloader) findTotalPagesByProbing(series, chapter string) int {
	client := &http.Client{}
	baseURL := fmt.Sprintf("https://s1.manga18.club/manga/%s/chapters/%s", series, chapter)

	// Probar hasta 500 páginas (límite razonable)
	maxPages := 500
	for i := 1; i <= maxPages; i++ {
		pageNum := fmt.Sprintf("%02d", i)
		imgURL := fmt.Sprintf("%s/%s.jpg", baseURL, pageNum)

		req, _ := http.NewRequest("HEAD", imgURL, nil)
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
		req.Header.Set("Referer", "https://manga18.club/")

		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		resp.Body.Close()

		if resp.StatusCode == 404 {
			// La página anterior era la última
			return i - 1
		}
	}

	return 0 // No se encontró
}

