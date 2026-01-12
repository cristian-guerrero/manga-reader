# Tests del Módulo Downloader

Este directorio contiene tests para el módulo downloader de manga-visor.

## Estructura de Tests

### Tests Básicos (sin conexión a internet)

Los tests básicos están en:
- `module_test.go` - Tests del módulo principal
- `downloaders_test.go` - Tests de los downloaders individuales

Estos tests verifican:
- ✅ Detección correcta de URLs (`CanHandle`)
- ✅ IDs de sitio correctos (`GetSiteID`)
- ✅ Selección del algoritmo correcto
- ✅ Manejo de URLs inválidas
- ✅ Funciones auxiliares (`sanitizeFilename`)
- ✅ Gestión de historial y jobs

**Ejecutar tests básicos:**
```bash
go test ./internal/modules/downloader -v
```

### Tests de Integración (requieren conexión a internet)

Los tests de integración están en `integration_test.go` y están marcados con el build tag `integration`.

Estos tests verifican:
- ✅ `FetchMangaInfo` con URLs reales de cada sitio
- ✅ Estructura de datos retornada
- ✅ Manejo de timeouts

**Ejecutar tests de integración:**
```bash
go test -tags=integration ./internal/modules/downloader -v
```

**Nota:** Los tests de integración pueden fallar si:
- No hay conexión a internet
- Las URLs de ejemplo ya no existen
- El sitio cambió su estructura

Los tests están diseñados para ser tolerantes a estos errores y solo registrar advertencias.

## URLs de Ejemplo

Los tests usan URLs de ejemplo que están documentadas en los comentarios del código:

- **Hitomi**: `https://hitomi.la/galleries/12345.html`
- **MangaDex**: `https://mangadex.org/chapter/d8176d81-0f14-4d5a-9d0b-fc56b3933cce`
- **NHentai**: `https://nhentai.net/g/12345/`
- **ManhwaWeb**: `https://manhwaweb.com/manhwa/slug`, `https://manhwaweb.com/leer/slug`
- **ZonaTMO**: `https://zonatmo.com/view_uploads/12345`
- **Manga18**: `https://manga18.club/manhwa/soeun`, `https://manga18.club/manhwa/soeun/chap-79`
- **Comics18**: `https://comics18.org/the-breakfast/`

## Ejecutar Tests Específicos

```bash
# Solo tests de CanHandle
go test ./internal/modules/downloader -v -run TestCanHandle

# Solo tests de sanitizeFilename
go test ./internal/modules/downloader -v -run TestSanitizeFilename

# Solo tests del módulo
go test ./internal/modules/downloader -v -run TestModule
```

## Cobertura

Para ver la cobertura de tests:
```bash
go test ./internal/modules/downloader -cover
```

Para un reporte detallado:
```bash
go test ./internal/modules/downloader -coverprofile=coverage.out
go tool cover -html=coverage.out
```
