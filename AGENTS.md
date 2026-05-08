# Manga Visor Agent Guide

## Stack
Wails v2 (Go 1.24 backend, React 18 + TypeScript + Vite frontend). State: Zustand. Styling: Tailwind CSS. i18n: react-i18next (EN/ES).

## Developer Commands
- **Setup**: `cd frontend && npm install`
- **Dev (full)**: `wails dev` — Go backend + Vite hot-reload
- **Dev (frontend only)**: `cd frontend && npm run dev`
- **Build**: `wails build -platform windows/amd64` (Linux: uses `build-appimage.sh`)
- **Lint**: `cd frontend && npm run lint`
- **Typecheck**: `cd frontend && npm run type-check`
- **Go tests**: `go test ./...` (no frontend test script defined)

## Architecture
- **Entrypoints**: `main.go` → `app.go` (Wails app struct with bound methods)
- **Go backend**: `internal/` with `services/` (DI container), `modules/` (colorizer, downloader, explorer, library, series, history), `persistence/` (JSON file stores), `fileloader/` (image server), `thumbnails/`, `archiver/`
- **Frontend**: Vite config at `frontend/vite.config.ts` with path aliases (`@app`, `@features`, `@shared`, `@services`, `@stores`, `@hooks`, `@components`, `@types`, `@utils`, `@constants`, `@themes`, `@i18n`)
- **API bridge**: Go methods in `app.go` exposed to frontend via Wails binding; frontend calls via `services/api/*`
- **Colorizer**: Python/Flask server for image processing; managed by `internal/modules/colorizer/`

## Data Storage
`~/.manga-visor/` (Windows: `%USERPROFILE%\.manga-visor\`). JSON files: `settings.json`, `downloader.json`, `explorer.json`, `history.json`, `library.json`, `series.json`, `tabs.json`, `orders.json`. Cache: `cache/`, downloads: `downloads/`, temp: `temp/`.

## Conventions
- **Commits**: English only, conventional format (`type: description`), no Spanish characters (see `.cursorrules`)
- **Output binary**: `manga-visor2` (not `manga-visor`) — configured in `wails.json`
- **Frontend style**: Functional React components, TypeScript strict mode

## Downloader Module
- 21 supported sites with site-specific concurrency limits in `internal/modules/downloader/module.go:53-70`
- Clipboard monitoring triggers auto-detection (`internal/modules/downloader/clipboard.go`)
- Sites detected by URL patterns, each with dedicated `internal/modules/downloader/*.go` file

## Build Notes
- **Linux**: Uses `build-appimage.sh` (not standard `wails build`) to produce AppImage with FUSE-free tooling
- **Windows**: Standard `wails build -platform windows/amd64`
- **macOS**: `wails build -platform darwin/universal` (CI builds universal binary)
- **CI**: GitHub Actions on push to `main` or version tags; Linux requires `libgtk-3-dev libwebkit2gtk-4.1-dev libfuse2 libappstream-glib-dev`, uses Node.js 20 and Go 1.24
