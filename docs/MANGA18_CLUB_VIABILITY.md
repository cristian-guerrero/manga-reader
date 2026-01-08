# Análisis de Viabilidad: manga18.club Downloader

## Resumen Ejecutivo

El sitio `manga18.club` es **totalmente viable** para implementar un algoritmo de descarga. La estructura del sitio es simple y predecible, lo que facilita la implementación tanto con dependencias estándar como con librerías adicionales.

## Estructura del Sitio

### URL Pattern
- **Capítulo**: `https://manga18.club/manhwa/{series}/{chapter}`
- **Ejemplo**: `https://manga18.club/manhwa/soeun/chap-79`

### Imágenes
- **Base URL**: `https://s1.manga18.club/manga/{series}/chapters/{chapter}/{page}.jpg`
- **Ejemplo**: `https://s1.manga18.club/manga/soeun/chapters/chap-79/01.jpg`
- **Formato**: Páginas numeradas con padding de 2 dígitos (01.jpg, 02.jpg, ...)

### Observaciones
- Las imágenes se cargan directamente desde URLs predecibles
- No requiere autenticación para acceder a las imágenes
- El sitio usa Cloudflare pero las imágenes están en un subdominio separado (s1.manga18.club)
- Las imágenes son principalmente `.jpg`, pero podrían existir otros formatos

---

## Opción 1: Sin Agregar Nuevas Dependencias ✅

### Viabilidad: **ALTA** (9/10)

### Ventajas
- ✅ Usa solo librerías estándar de Go (`net/http`, `regexp`, `strings`, `io`)
- ✅ No aumenta el tamaño del binario
- ✅ No introduce dependencias externas que puedan romperse
- ✅ Implementación simple y directa

### Desafíos
1. **Determinar el número total de páginas**
   - **Solución A**: Parsear el HTML de la página para encontrar un indicador (meta tag, script, o contador)
   - **Solución B**: Probar números secuencialmente hasta obtener un 404
   - **Solución C**: Buscar en el HTML referencias a imágenes o scripts que indiquen el total

2. **Extraer título de la serie**
   - Parsear el `<title>` tag: `"Soeun - Chapter 79"`
   - O buscar en el HTML elementos como `<h1>` o breadcrumbs

3. **Manejo de errores HTTP**
   - Cloudflare puede bloquear peticiones sin headers apropiados
   - Necesita `User-Agent` y posiblemente `Referer`

### Implementación Propuesta

```go
// Estructura básica sin dependencias externas
type Manga18Downloader struct{}

func (d *Manga18Downloader) CanHandle(url string) bool {
    return strings.Contains(url, "manga18.club")
}

func (d *Manga18Downloader) GetSiteID() string {
    return "manga18.club"
}

func (d *Manga18Downloader) GetImages(url string) (*SiteInfo, error) {
    // 1. Extraer series y chapter de la URL
    //    URL: https://manga18.club/manhwa/soeun/chap-79
    //    Series: soeun, Chapter: chap-79
    
    // 2. Obtener HTML de la página para extraer título y número de páginas
    //    - Parsear <title> para obtener título de serie
    //    - Buscar en HTML o scripts el número total de páginas
    
    // 3. Generar URLs de imágenes
    //    https://s1.manga18.club/manga/soeun/chapters/chap-79/01.jpg
    //    https://s1.manga18.club/manga/soeun/chapters/chap-79/02.jpg
    //    ...
    
    // 4. Retornar SiteInfo con lista de imágenes
}
```

### Complejidad Estimada
- **Tiempo de desarrollo**: 2-4 horas
- **Líneas de código**: ~150-200 líneas
- **Mantenibilidad**: Media-Alta (depende de cambios en HTML)

---

## Opción 2: Agregando Nuevas Dependencias ✅

### Viabilidad: **MUY ALTA** (10/10)

### Dependencias Recomendadas

#### Opción A: `golang.org/x/net/html` (Parser HTML oficial)
```go
import "golang.org/x/net/html"
```
- ✅ Librería oficial de Google (parte de golang.org/x)
- ✅ Bien mantenida y estable
- ✅ Permite parsing robusto de HTML
- ✅ No requiere dependencias adicionales

**Ventajas:**
- Parsing más robusto que regex
- Manejo correcto de HTML malformado
- Fácil navegación del DOM
- Mejor extracción de atributos y contenido

**Desventajas:**
- Aumenta ligeramente el tamaño del binario (~100KB)
- Curva de aprendizaje mínima

#### Opción B: `github.com/PuerkitoBio/goquery` (jQuery-like)
```go
import "github.com/PuerkitoBio/goquery"
```
- ✅ Sintaxis similar a jQuery (muy intuitiva)
- ✅ Wrapper sobre `golang.org/x/net/html`
- ✅ Facilita mucho el parsing

**Ventajas:**
- Código más legible y mantenible
- Selección de elementos muy fácil
- Ideal para scraping complejo

**Desventajas:**
- Dependencia externa (aunque bien mantenida)
- Aumenta el tamaño del binario (~200KB)

### Implementación Propuesta con `golang.org/x/net/html`

```go
import (
    "golang.org/x/net/html"
    "golang.org/x/net/html/atom"
)

func (d *Manga18Downloader) GetImages(url string) (*SiteInfo, error) {
    // 1. Fetch HTML
    resp, err := http.Get(url)
    // ...
    
    // 2. Parse HTML
    doc, err := html.Parse(resp.Body)
    
    // 3. Extraer información usando navegación del DOM
    var title string
    var totalPages int
    
    var f func(*html.Node)
    f = func(n *html.Node) {
        if n.Type == html.ElementNode {
            // Buscar <title>
            if n.DataAtom == atom.Title {
                // Extraer texto
            }
            // Buscar scripts o meta tags con información de páginas
        }
        for c := n.FirstChild; c != nil; c = c.NextSibling {
            f(c)
        }
    }
    f(doc)
    
    // 4. Generar URLs de imágenes
    // ...
}
```

### Complejidad Estimada
- **Tiempo de desarrollo**: 1-2 horas
- **Líneas de código**: ~100-150 líneas
- **Mantenibilidad**: Alta (parsing robusto)

---

## Comparación de Opciones

| Aspecto | Sin Dependencias | Con Dependencias |
|---------|-----------------|-------------------|
| **Viabilidad** | 9/10 | 10/10 |
| **Tiempo de desarrollo** | 2-4 horas | 1-2 horas |
| **Robustez** | Media | Alta |
| **Mantenibilidad** | Media | Alta |
| **Tamaño binario** | Sin cambio | +100-200KB |
| **Dependencias externas** | 0 | 1-2 |
| **Facilidad de parsing** | Media (regex) | Alta (DOM) |

---

## Recomendación

### Para Implementación Inmediata: **Opción 1 (Sin Dependencias)**
- ✅ Rápida de implementar
- ✅ No cambia el ecosistema del proyecto
- ✅ Suficiente para el caso de uso

### Para Solución a Largo Plazo: **Opción 2A (`golang.org/x/net/html`)**
- ✅ Más robusta y mantenible
- ✅ Librería oficial (confiable)
- ✅ Mejor manejo de cambios en HTML
- ✅ Código más limpio

---

## Estrategia de Implementación

### Fase 1: Implementación Básica (Sin Dependencias)
1. Extraer `series` y `chapter` de la URL usando regex
2. Obtener HTML de la página del capítulo
3. Extraer título de la serie del `<title>` tag
4. Determinar número de páginas (probar hasta 404 o parsear HTML)
5. Generar lista de URLs de imágenes
6. Implementar descarga con headers apropiados

### Fase 2 (Opcional): Mejora con Parser HTML
1. Agregar `golang.org/x/net/html` a `go.mod`
2. Refactorizar para usar parser HTML
3. Mejorar extracción de metadatos
4. Agregar soporte para series (listar capítulos)

---

## Consideraciones Técnicas

### Headers Necesarios
```go
req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
req.Header.Set("Referer", "https://manga18.club/")
```

### Manejo de Errores
- 403 Forbidden: Agregar más headers o delay entre requests
- 404 Not Found: Fin de páginas (al probar números secuenciales)
- Rate Limiting: Implementar delays entre descargas

### Soporte de Series
- URL de serie: `https://manga18.club/manhwa/{series}`
- Necesitaría parsear lista de capítulos del HTML
- Más complejo pero factible con ambas opciones

---

## Conclusión

**El sitio manga18.club es altamente viable para implementar un downloader.** 

La estructura simple y predecible de las URLs de imágenes hace que la implementación sea directa. La recomendación es empezar con la **Opción 1 (sin dependencias)** para una solución rápida, y considerar migrar a **Opción 2A** si se necesita mayor robustez o se planea agregar soporte para series.

**Tiempo estimado total**: 2-4 horas para implementación completa y pruebas.

