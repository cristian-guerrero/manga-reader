package downloader

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

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
	// Normalizar URL (remover doble slash y parámetros de consulta para detección)
	normalizedURL := strings.ReplaceAll(url, "//manhwa/", "/manhwa/")
	normalizedURL = strings.ReplaceAll(normalizedURL, "manga18.club//", "manga18.club/")

	// Remover parámetros de consulta y fragmentos para la detección
	// pero mantener la URL original para la solicitud HTTP
	urlForDetection := normalizedURL
	if idx := strings.Index(urlForDetection, "?"); idx != -1 {
		urlForDetection = urlForDetection[:idx]
	}
	if idx := strings.Index(urlForDetection, "#"); idx != -1 {
		urlForDetection = urlForDetection[:idx]
	}

	// Determinar si es serie o capítulo
	// Serie: https://manga18.club/manhwa/soeun
	// Capítulo: https://manga18.club/manhwa/soeun/chap-79
	// Capítulo: https://manga18.club/manhwa/so-eun-raw/42
	// Capítulo: https://manga18.club/manhwa/so-eun-raw/chapter-80
	// Patrón: /manhwa/{series}/{chapter} donde chapter puede ser:
	//   - chap-{number}
	//   - chapter-{number}
	//   - {number} (solo número, puede tener parámetros después)
	// Verificar si hay un tercer segmento después de /manhwa/{series}/
	reChapter := regexp.MustCompile(`manga18\.club/manhwa/[^/]+/(chap-|chapter-|\d+)`)
	if reChapter.MatchString(urlForDetection) {
		return d.getChapter(normalizedURL) // Usar URL normalizada pero con parámetros si los hay
	}
	return d.getSeries(normalizedURL)
}

func (d *Manga18Downloader) getChapter(url string) (*SiteInfo, error) {
	// Remover parámetros de consulta y fragmentos para extracción, pero mantenerlos para la solicitud HTTP
	urlForExtraction := url
	if idx := strings.Index(urlForExtraction, "?"); idx != -1 {
		urlForExtraction = urlForExtraction[:idx]
	}
	if idx := strings.Index(urlForExtraction, "#"); idx != -1 {
		urlForExtraction = urlForExtraction[:idx]
	}

	// Extraer series y chapter de la URL
	// URL: https://manga18.club/manhwa/soeun/chap-79
	// URL: https://manga18.club/manhwa/so-eun-raw/42
	// URL: https://manga18.club/manhwa/so-eun-raw/chapter-80
	reURL := regexp.MustCompile(`manga18\.club/manhwa/([^/]+)/([^/?#]+)`)
	match := reURL.FindStringSubmatch(urlForExtraction)
	if len(match) < 3 {
		return nil, fmt.Errorf("invalid manga18.club chapter URL format: %s", url)
	}
	series := match[1]          // "soeun" o "so-eun-raw"
	chapterOriginal := match[2] // "chap-79", "chapter-80", o "42"
	chapter := chapterOriginal

	// Normalizar el formato del capítulo para consistencia
	// Si es solo un número, agregar prefijo "chap-"
	isNumericOnly := false
	isChapterFormat := false
	if matched, _ := regexp.MatchString(`^\d+$`, chapter); matched {
		isNumericOnly = true
		chapter = "chap-" + chapter
	} else if strings.HasPrefix(chapter, "chapter-") {
		// Guardar que era formato "chapter-" para probar ambos formatos
		isChapterFormat = true
		// Convertir "chapter-80" a "chap-80" para consistencia en el código
		chapter = strings.Replace(chapter, "chapter-", "chap-", 1)
	}

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
	var imageURLs []string // Almacenar URLs reales de imágenes encontradas
	var detectedFormat struct {
		baseURL    string
		pageFormat string // "%02d", "%d", "%03d"
		extension  string
	}
	// Inicializar baseURL antes de usarlo
	// Si el formato original era solo numérico o "chapter-", probar con el formato original primero
	// ya que es más probable que sea el correcto en el servidor
	if isNumericOnly {
		detectedFormat.baseURL = fmt.Sprintf("https://s1.manga18.club/manga/%s/chapters/%s", series, chapterOriginal)
	} else if isChapterFormat {
		// Para formato "chapter-", usar el formato original
		detectedFormat.baseURL = fmt.Sprintf("https://s1.manga18.club/manga/%s/chapters/%s", series, chapterOriginal)
	} else {
		detectedFormat.baseURL = fmt.Sprintf("https://s1.manga18.club/manga/%s/chapters/%s", series, chapter)
	}

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

			// Buscar imágenes directamente en el HTML
			if n.DataAtom == atom.Img {
				for _, attr := range n.Attr {
					if attr.Key == "src" || attr.Key == "data-src" || attr.Key == "data-lazy-src" {
						imgSrc := attr.Val
						// Convertir URL relativa a absoluta si es necesario
						if strings.HasPrefix(imgSrc, "//") {
							imgSrc = "https:" + imgSrc
						} else if strings.HasPrefix(imgSrc, "/") {
							imgSrc = "https://s1.manga18.club" + imgSrc
						} else if !strings.HasPrefix(imgSrc, "http") {
							// URL relativa, construir completa
							imgSrc = detectedFormat.baseURL + "/" + imgSrc
						}

						// Verificar si es una URL de imagen del capítulo
						// Ser más flexible: buscar cualquier URL que contenga el patrón de imágenes del capítulo
						isChapterImage := false
						if strings.Contains(imgSrc, "/chapters/") {
							// Verificar si contiene el capítulo (normalizado, original, o cualquier variante) o si está en el dominio correcto
							// Aceptar tanto "chap-80" como "chapter-80" como variantes numéricas
							chapterVariants := []string{chapter, chapterOriginal}
							if isChapterFormat {
								// También agregar la variante normalizada
								chapterVariants = append(chapterVariants, chapter)
							}

							matchesChapter := false
							for _, variant := range chapterVariants {
								if strings.Contains(imgSrc, variant) {
									matchesChapter = true
									break
								}
							}

							if matchesChapter || strings.Contains(imgSrc, "s1.manga18.club") || strings.Contains(imgSrc, "manga18.club") {
								isChapterImage = true
							}
						} else if strings.Contains(imgSrc, "s1.manga18.club") || strings.Contains(imgSrc, "manga18.club") {
							// También aceptar URLs del dominio aunque no tengan /chapters/ explícito
							// si contienen números de página (probablemente son imágenes del capítulo)
							reImgPage := regexp.MustCompile(`/(\d+)\.(jpg|jpeg|png|webp)`)
							if reImgPage.MatchString(imgSrc) {
								isChapterImage = true
							}
						}

						// Si encontramos una imagen del capítulo, actualizar baseURL con el formato real usado
						if isChapterImage {
							// Extraer la baseURL real de la URL encontrada
							// Esto capturará el formato real usado (chap-80, chapter-80, o 80)
							reBaseURL := regexp.MustCompile(`(https?://[^/]+/manga/[^/]+/chapters/[^/]+)`)
							if baseMatch := reBaseURL.FindStringSubmatch(imgSrc); len(baseMatch) > 1 {
								detectedFormat.baseURL = baseMatch[1]
								// Si detectamos el formato real, también podemos inferir si usa "chapter-" o "chap-"
								if strings.Contains(detectedFormat.baseURL, "chapter-") {
									// El servidor usa formato "chapter-", mantenerlo
								}
							}
						}

						if isChapterImage {
							imageURLs = append(imageURLs, imgSrc)

							// Buscar patrones de URL de imagen que contengan números de página
							// Ejemplo: .../chapters/chap-42/01.jpg o .../chapters/chap-42/1.jpg
							reImgPage := regexp.MustCompile(`/(\d+)\.(jpg|jpeg|png|webp)`)
							if match := reImgPage.FindStringSubmatch(imgSrc); len(match) > 1 {
								if p, err := strconv.Atoi(match[1]); err == nil && p > totalPages {
									totalPages = p
								}

								// Detectar formato del número de página
								pageNumStr := match[1]
								if len(pageNumStr) == 2 && strings.HasPrefix(pageNumStr, "0") {
									detectedFormat.pageFormat = "%02d"
								} else if len(pageNumStr) == 3 && strings.HasPrefix(pageNumStr, "00") {
									detectedFormat.pageFormat = "%03d"
								} else {
									detectedFormat.pageFormat = "%d"
								}
								detectedFormat.extension = match[2]
							}
						}
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

				// Buscar arrays de URLs codificadas en Base64 (slides_p_path)
				// Formato: var slides_p_path = ["aHR0cHM6Ly...", "aHR0cHM6Ly...", ...];
				reBase64Array := regexp.MustCompile(`slides_p_path\s*=\s*\[(.*?)\];`)
				if match := reBase64Array.FindStringSubmatch(scriptText); len(match) > 1 {
					// Extraer todas las cadenas Base64 del array
					reBase64Strings := regexp.MustCompile(`"([A-Za-z0-9+/=]+)"`)
					base64Strings := reBase64Strings.FindAllStringSubmatch(match[1], -1)

					// Detectar si las páginas empiezan en 01 basándose en la primera URL
					firstPageStartsAtOne := false
					maxPageNum := 0

					for idx, base64Match := range base64Strings {
						if len(base64Match) > 1 {
							// Decodificar Base64
							decoded, err := base64.StdEncoding.DecodeString(base64Match[1])
							if err == nil {
								decodedURL := string(decoded)
								// Agregar a imageURLs si es una URL válida
								if strings.Contains(decodedURL, "/chapters/") {
									imageURLs = append(imageURLs, decodedURL)

									// Extraer información del formato
									reImgPage := regexp.MustCompile(`/(\d+)\.(jpg|jpeg|png|webp)`)
									if imgMatch := reImgPage.FindStringSubmatch(decodedURL); len(imgMatch) > 1 {
										pageNumStr := imgMatch[1]
										// Convertir número de página (00 -> 0, 000 -> 0, 01 -> 1, 001 -> 1, etc.)
										if p, err := strconv.Atoi(pageNumStr); err == nil {
											// En la primera URL, detectar si empieza en 01
											if idx == 0 {
												if strings.HasPrefix(pageNumStr, "01") || (len(pageNumStr) == 2 && pageNumStr == "01") {
													firstPageStartsAtOne = true
												}
											}

											// Guardar el número de página más alto
											if p > maxPageNum {
												maxPageNum = p
											}

											// Detectar formato del número de página basado en la longitud
											// Si es 3 dígitos (000, 001, etc.), usar %03d
											// Si es 2 dígitos (00, 01, etc.), usar %02d
											// Si es 1 dígito (0, 1, etc.), usar %d
											if len(pageNumStr) == 3 {
												detectedFormat.pageFormat = "%03d"
											} else if len(pageNumStr) == 2 {
												detectedFormat.pageFormat = "%02d"
											} else {
												detectedFormat.pageFormat = "%d"
											}

											detectedFormat.extension = imgMatch[2]

											// Extraer baseURL de la URL decodificada
											// Ejemplo: https://s1.manga18.club/manga/so-eun-raw/chapters/42/01.jpg
											// Debe extraer: https://s1.manga18.club/manga/so-eun-raw/chapters/42
											reBaseURL := regexp.MustCompile(`(https?://[^/]+/manga/[^/]+/chapters/[^/]+)`)
											if baseMatch := reBaseURL.FindStringSubmatch(decodedURL); len(baseMatch) > 1 {
												detectedFormat.baseURL = baseMatch[1]
											} else {
												// Fallback: intentar extraer manualmente
												// Buscar el patrón /chapters/ seguido del nombre del capítulo
												reBaseURLFallback := regexp.MustCompile(`(https?://[^/]+/manga/[^/]+/chapters/[^/]+)`)
												if baseMatch := reBaseURLFallback.FindStringSubmatch(decodedURL); len(baseMatch) > 1 {
													detectedFormat.baseURL = baseMatch[1]
												}
											}
										}
									}
								}
							}
						}
					}

					// Calcular totalPages basado en el formato detectado
					if maxPageNum > 0 {
						if firstPageStartsAtOne {
							// Si empieza en 01, totalPages es el número más alto encontrado
							totalPages = maxPageNum
							// Marcar que las páginas empiezan en 01
							detectedFormat.pageFormat = detectedFormat.pageFormat + ":start1"
						} else {
							// Si empieza en 00 o 000, totalPages es maxPageNum + 1
							totalPages = maxPageNum + 1
						}
					} else if len(base64Strings) > 0 {
						// Fallback: usar el número de URLs como totalPages
						totalPages = len(base64Strings)
					}
				}

				// Buscar patrones como "totalPages: 33" o "pages: 33" o "count: 33"
				rePages := regexp.MustCompile(`(?i)(?:total|pages?|count)[\s:=]+(\d+)`)
				if match := rePages.FindStringSubmatch(scriptText); len(match) > 1 {
					if p, err := strconv.Atoi(match[1]); err == nil && p > 0 {
						totalPages = p
					}
				}

				// Buscar arrays de imágenes o URLs en scripts
				// Ejemplo: ["01.jpg", "02.jpg", ...] o ["/chapters/chap-42/01.jpg", ...]
				// Buscar patrones más completos que puedan contener todas las URLs
				reImgArray := regexp.MustCompile(`\[(.*?(\d+)\.(jpg|jpeg|png|webp).*?)\]`)
				matches := reImgArray.FindAllStringSubmatch(scriptText, -1)
				for _, match := range matches {
					if len(match) > 1 {
						// Contar cuántas imágenes hay en el array
						imgMatches := regexp.MustCompile(`(\d+)\.(jpg|jpeg|png|webp)`).FindAllString(match[1], -1)
						if len(imgMatches) > totalPages {
							totalPages = len(imgMatches)
						}

						// También buscar el número más alto
						reNum := regexp.MustCompile(`(\d+)\.(jpg|jpeg|png|webp)`)
						numMatches := reNum.FindAllStringSubmatch(match[1], -1)
						for _, numMatch := range numMatches {
							if len(numMatch) > 1 {
								if p, err := strconv.Atoi(numMatch[1]); err == nil && p > totalPages {
									totalPages = p
								}
							}
						}
					}
				}

				// Buscar variables que contengan arrays de imágenes
				// Ejemplo: var images = ["01.jpg", "02.jpg", ...]
				reVarArray := regexp.MustCompile(`(?:var|let|const)\s+\w+\s*=\s*\[(.*?(\d+)\.(jpg|jpeg|png|webp).*?)\]`)
				varMatches := reVarArray.FindAllStringSubmatch(scriptText, -1)
				for _, match := range varMatches {
					if len(match) > 1 {
						imgMatches := regexp.MustCompile(`(\d+)\.(jpg|jpeg|png|webp)`).FindAllString(match[1], -1)
						if len(imgMatches) > totalPages {
							totalPages = len(imgMatches)
						}
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

	// Primero intentar obtener totalPages mediante probing (más confiable)
	// Probar con el formato original si era numérico o "chapter-", sino con el normalizado
	// findTotalPagesByProbing también actualizará detectedFormat con el formato que funcionó
	if totalPages == 0 {
		if isNumericOnly || isChapterFormat {
			// Probar primero con formato original
			totalPages = d.findTotalPagesByProbing(series, chapterOriginal, &detectedFormat)
			// Si no funciona, probar con formato normalizado
			if totalPages == 0 {
				totalPages = d.findTotalPagesByProbing(series, chapter, &detectedFormat)
			}
		} else {
			totalPages = d.findTotalPagesByProbing(series, chapter, &detectedFormat)
		}
	}

	// Si aún no tenemos totalPages y encontramos URLs, usar el número más alto encontrado
	// Pero solo como último recurso, ya que el HTML puede tener solo la primera imagen cargada
	if totalPages == 0 {
		if len(imageURLs) > 0 {
			// Si encontramos URLs, usar el número más alto encontrado
			reNum := regexp.MustCompile(`/(\d+)\.(jpg|jpeg|png|webp)`)
			maxPage := 0
			for _, imgURL := range imageURLs {
				if match := reNum.FindStringSubmatch(imgURL); len(match) > 1 {
					if p, err := strconv.Atoi(match[1]); err == nil && p > maxPage {
						maxPage = p
					}
				}
			}
			if maxPage > 0 {
				totalPages = maxPage
			} else {
				totalPages = len(imageURLs)
			}
		}
	}

	if totalPages == 0 {
		return nil, fmt.Errorf("could not determine total pages for chapter %s/%s. The chapter might not exist or the page structure has changed", series, chapter)
	}

	// Generar URLs de imágenes
	var images []ImageDownload
	baseURL := detectedFormat.baseURL
	if baseURL == "" {
		// Si no detectamos baseURL, usar el formato original si era numérico o "chapter-", sino el normalizado
		if isNumericOnly || isChapterFormat {
			baseURL = fmt.Sprintf("https://s1.manga18.club/manga/%s/chapters/%s", series, chapterOriginal)
		} else {
			baseURL = fmt.Sprintf("https://s1.manga18.club/manga/%s/chapters/%s", series, chapter)
		}
	}

	// Usar formato detectado o valores por defecto
	pageFormat := detectedFormat.pageFormat
	if pageFormat == "" {
		pageFormat = "%02d" // Formato por defecto
	}
	extension := detectedFormat.extension
	if extension == "" {
		extension = "jpg" // Extensión por defecto
	}

	// Siempre generar todas las URLs usando el formato detectado
	// El HTML puede tener solo la primera imagen cargada (lazy loading), así que no confiar solo en las URLs encontradas
	// Si encontramos URLs, usarlas para detectar el formato, pero generar todas las URLs necesarias
	for i := 1; i <= totalPages; i++ {
		var pageNum string
		// Detectar si el formato tiene marcador ":start1" (empieza en 01, no 00)
		startFromOne := strings.HasSuffix(pageFormat, ":start1")
		actualFormat := pageFormat
		if startFromOne {
			actualFormat = strings.TrimSuffix(pageFormat, ":start1")
		}

		// Para formatos con padding (%02d, %03d):
		// - Si empieza en 01 (startFromOne), usar i directamente
		// - Si empieza en 00 o 000, usar i-1
		// Para formato sin padding (%d), usar i
		if actualFormat == "%03d" || actualFormat == "%02d" {
			if startFromOne {
				pageNum = fmt.Sprintf(actualFormat, i)
			} else {
				pageNum = fmt.Sprintf(actualFormat, i-1)
			}
		} else {
			pageNum = fmt.Sprintf(actualFormat, i)
		}
		imgURL := fmt.Sprintf("%s/%s.%s", baseURL, pageNum, extension)

		images = append(images, ImageDownload{
			URL:      imgURL,
			Filename: fmt.Sprintf("%03d.%s", i, extension),
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
		Type:        "single", // Explicitly mark as single chapter
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
	chapters := []ChapterInfo{}
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
				// Patrones: /manhwa/{series}/chap-{number}, /manhwa/{series}/chapter-{number}, /manhwa/{series}/{number}
				reChapterLink := regexp.MustCompile(`/manhwa/[^/]+/(chap-|chapter-)?([^/]+)`)
				if match := reChapterLink.FindStringSubmatch(href); len(match) > 2 {
					prefix := match[1]    // "chap-", "chapter-", o ""
					chapterID := match[2] // "79" o número

					// Normalizar el formato del ID del capítulo
					if prefix == "" {
						// Es solo un número, agregar prefijo "chap-"
						chapterID = "chap-" + chapterID
					} else if prefix == "chapter-" {
						// Convertir "chapter-" a "chap-" para consistencia
						chapterID = "chap-" + chapterID
					} else {
						// Ya tiene "chap-", mantenerlo
						chapterID = prefix + chapterID
					}

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
// También actualiza detectedFormat con el formato que funcionó
func (d *Manga18Downloader) findTotalPagesByProbing(series, chapter string, detectedFormat *struct {
	baseURL    string
	pageFormat string
	extension  string
}) int {
	client := &http.Client{
		Timeout: 5 * time.Second, // Timeout para evitar esperas largas
	}
	baseURL := fmt.Sprintf("https://s1.manga18.club/manga/%s/chapters/%s", series, chapter)

	// Probar diferentes formatos de número y extensiones
	formats := []struct {
		format   string
		ext      string
		maxPages int
	}{
		{"%02d", "jpg", 500},  // 01.jpg, 02.jpg, ...
		{"%d", "jpg", 500},    // 1.jpg, 2.jpg, ...
		{"%03d", "jpg", 500},  // 001.jpg, 002.jpg, ...
		{"%02d", "png", 200},  // 01.png, 02.png, ...
		{"%d", "png", 200},    // 1.png, 2.png, ...
		{"%02d", "webp", 200}, // 01.webp, 02.webp, ...
	}

	for _, fmtConfig := range formats {
		lastFound := 0
		for i := 1; i <= fmtConfig.maxPages; i++ {
			pageNum := fmt.Sprintf(fmtConfig.format, i)
			imgURL := fmt.Sprintf("%s/%s.%s", baseURL, pageNum, fmtConfig.ext)

			req, err := http.NewRequest("HEAD", imgURL, nil)
			if err != nil {
				continue
			}
			req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
			req.Header.Set("Referer", "https://manga18.club/")

			resp, err := client.Do(req)
			if err != nil {
				// Si hay un error de red, continuar con el siguiente formato
				if lastFound > 0 {
					// Si ya encontramos algunas páginas, actualizar formato y devolver
					detectedFormat.baseURL = baseURL
					detectedFormat.pageFormat = fmtConfig.format
					detectedFormat.extension = fmtConfig.ext
					return lastFound
				}
				break // Cambiar a siguiente formato
			}

			statusCode := resp.StatusCode
			resp.Body.Close()

			if statusCode == 200 || statusCode == 304 {
				// Imagen existe
				lastFound = i
			} else if statusCode == 404 {
				// La página anterior era la última
				if lastFound > 0 {
					// Actualizar formato con el que funcionó
					detectedFormat.baseURL = baseURL
					detectedFormat.pageFormat = fmtConfig.format
					detectedFormat.extension = fmtConfig.ext
					return lastFound
				}
				// Si la primera página da 404, probar siguiente formato
				break
			}
		}

		// Si encontramos páginas con este formato, actualizar y devolver el resultado
		if lastFound > 0 {
			detectedFormat.baseURL = baseURL
			detectedFormat.pageFormat = fmtConfig.format
			detectedFormat.extension = fmtConfig.ext
			return lastFound
		}
	}

	return 0 // No se encontró ningún formato válido
}
