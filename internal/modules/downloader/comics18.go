package downloader

import (
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"
)

type Comics18Downloader struct{}

func (d *Comics18Downloader) CanHandle(url string) bool {
	return strings.Contains(url, "comics18.org")
}

func (d *Comics18Downloader) GetSiteID() string {
	return "comics18.org"
}

func (d *Comics18Downloader) GetImages(url string) (*SiteInfo, error) {
	// Extraer el slug del comic de la URL
	// Ejemplo: https://comics18.org/the-breakfast/ -> "the-breakfast"
	reURL := regexp.MustCompile(`comics18\.org/([^/]+)/?$`)
	match := reURL.FindStringSubmatch(url)
	if len(match) < 2 {
		return nil, fmt.Errorf("invalid comics18.org URL format: %s", url)
	}
	slug := match[1]

	// Obtener HTML de la página
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
	req.Header.Set("Referer", "https://comics18.org/")

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
	seriesName := slug
	var imageURLs []string
	var imgBaseURL string
	var imgNumber int

	var extractInfo func(*html.Node)
	extractInfo = func(n *html.Node) {
		if n.Type == html.ElementNode {
			// Extraer título de la serie del <title>
			if n.DataAtom == atom.Title && n.FirstChild != nil {
				titleText := strings.TrimSpace(n.FirstChild.Data)
				// Formato puede variar, intentar extraer nombre
				if idx := strings.Index(titleText, " - "); idx != -1 {
					extractedName := strings.TrimSpace(titleText[:idx])
					if extractedName != "" {
						seriesName = extractedName
					}
				} else if idx := strings.Index(titleText, " | "); idx != -1 {
					extractedName := strings.TrimSpace(titleText[:idx])
					if extractedName != "" {
						seriesName = extractedName
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
							imgSrc = "https://comics18.org" + imgSrc
						}

						// Buscar imágenes del comic en fullcomics18.org
						// Patrón: https://fullcomics18.org/img{numero}/{slug}-{número}.jpg
						reImgPattern := regexp.MustCompile(`fullcomics18\.org/img(\d+)/([^/]+)-(\d+)\.(jpg|jpeg|png|webp)`)
						if imgMatch := reImgPattern.FindStringSubmatch(imgSrc); len(imgMatch) >= 4 {
							imgBaseURL = fmt.Sprintf("https://fullcomics18.org/img%s/%s", imgMatch[1], imgMatch[2])
							if num, err := strconv.Atoi(imgMatch[3]); err == nil {
								if num > imgNumber {
									imgNumber = num
								}
							}
							imageURLs = append(imageURLs, imgSrc)
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

				// Buscar URLs de imágenes en scripts
				reImgPattern := regexp.MustCompile(`fullcomics18\.org/img(\d+)/([^/]+)-(\d+)\.(jpg|jpeg|png|webp)`)
				matches := reImgPattern.FindAllStringSubmatch(scriptText, -1)
				for _, match := range matches {
					if len(match) >= 4 {
						if imgBaseURL == "" {
							imgBaseURL = fmt.Sprintf("https://fullcomics18.org/img%s/%s", match[1], match[2])
						}
						if num, err := strconv.Atoi(match[3]); err == nil {
							if num > imgNumber {
								imgNumber = num
							}
						}
						// Construir URL completa
						fullURL := fmt.Sprintf("https://fullcomics18.org/img%s/%s-%s.%s", match[1], match[2], match[3], match[4])
						imageURLs = append(imageURLs, fullURL)
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

	// Si no encontramos imágenes en el HTML, intentar construir la URL base
	if imgBaseURL == "" {
		// Intentar diferentes números de carpeta comunes (img23, img24, etc.)
		// y construir la URL base basándose en el slug
		for i := 20; i <= 30; i++ {
			testURL := fmt.Sprintf("https://fullcomics18.org/img%d/%s-1.jpg", i, slug)
			req, _ := http.NewRequest("HEAD", testURL, nil)
			req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
			req.Header.Set("Referer", "https://comics18.org/")
			testResp, err := client.Do(req)
			if err == nil && testResp.StatusCode == http.StatusOK {
				imgBaseURL = fmt.Sprintf("https://fullcomics18.org/img%d/%s", i, slug)
				testResp.Body.Close()
				break
			}
			if testResp != nil {
				testResp.Body.Close()
			}
		}
	}

	if imgBaseURL == "" {
		return nil, fmt.Errorf("could not determine image base URL for comic: %s", slug)
	}

	// Determinar el número total de páginas
	totalPages := imgNumber
	if totalPages == 0 {
		// Si no encontramos el número máximo en el HTML, probar secuencialmente
		totalPages = d.findTotalPagesByProbing(imgBaseURL, slug)
	}

	if totalPages == 0 {
		return nil, fmt.Errorf("could not determine total pages for comic: %s", slug)
	}

	// Determinar extensión (por defecto jpg)
	extension := "jpg"
	if len(imageURLs) > 0 {
		reExt := regexp.MustCompile(`\.(jpg|jpeg|png|webp)$`)
		if extMatch := reExt.FindStringSubmatch(imageURLs[0]); len(extMatch) > 1 {
			extension = extMatch[1]
		}
	}

	// Normalizar nombre de la serie
	seriesName = strings.TrimSpace(seriesName)
	if seriesName == "" {
		// Capitalizar primera letra del slug
		if len(slug) > 0 {
			seriesName = strings.ToUpper(slug[:1]) + strings.ToLower(slug[1:])
			seriesName = strings.ReplaceAll(seriesName, "-", " ")
		} else {
			seriesName = "Unknown Series"
		}
	}

	// Generar URLs de imágenes
	var images []ImageDownload
	for i := 1; i <= totalPages; i++ {
		imgURL := fmt.Sprintf("%s-%d.%s", imgBaseURL, i, extension)
		images = append(images, ImageDownload{
			URL:      imgURL,
			Filename: fmt.Sprintf("%03d.%s", i, extension),
			Index:    i - 1,
			Headers: map[string]string{
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
				"Referer":    "https://comics18.org/",
			},
		})
	}

	return &SiteInfo{
		SeriesName:  seriesName,
		ChapterName: seriesName, // En comics18.org, cada URL es un comic completo, no un capítulo
		Images:      images,
		SiteID:      d.GetSiteID(),
		Type:        "single",
	}, nil
}

// findTotalPagesByProbing prueba números secuencialmente hasta obtener 404
func (d *Comics18Downloader) findTotalPagesByProbing(baseURL, slug string) int {
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	// Probar diferentes extensiones
	extensions := []string{"jpg", "jpeg", "png", "webp"}

	for _, ext := range extensions {
		lastFound := 0
		for i := 1; i <= 500; i++ {
			imgURL := fmt.Sprintf("%s-%d.%s", baseURL, i, ext)

			req, err := http.NewRequest("HEAD", imgURL, nil)
			if err != nil {
				continue
			}
			req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
			req.Header.Set("Referer", "https://comics18.org/")

			resp, err := client.Do(req)
			if err != nil {
				if lastFound > 0 {
					return lastFound
				}
				break
			}

			statusCode := resp.StatusCode
			resp.Body.Close()

			if statusCode == 200 || statusCode == 304 {
				lastFound = i
			} else if statusCode == 404 {
				if lastFound > 0 {
					return lastFound
				}
				break
			}
		}

		if lastFound > 0 {
			return lastFound
		}
	}

	return 0
}
