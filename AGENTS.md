# Manga Visor Agent Guide

## Development
- **Setup**: Install Go 1.24+, Node.js 20+, Wails CLI
- **Deps**: `cd frontend && npm install`
- **Dev server**: `wails dev` (runs Go backend + React frontend)
- **Frontend only**: `cd frontend && npm run dev`
- **Build**: `wails build -platform windows/amd64` (see README for other platforms)

## Verification
- **Lint**: `cd frontend && npm run lint`
- **Typecheck**: `cd frontend && npm run type-check`
- **Preview build**: `cd frontend && npm run preview`

## Conventions
- **Commits**: English only, conventional format (`type: description`), no Spanish characters (see .cursorrules)
- **Data storage**: Local in `~/.manga-visor/` (Windows: `%APPDATA%/manga-visor/`)
- **Entrypoints**: Backend `main.go`, Frontend `frontend/src/`
- **Stack**: Wails v2 (Go 1.24 + React 18 + TypeScript + Vite), Zustand state management

## Directories
- `frontend/` - React/Vite TypeScript app
- Internal Go packages in root and `internal/` directory
- Build outputs: `build/` directory

## Supported Download Sites
The downloader module supports multiple manga sites. Recent additions:
- **imhentai.to**: Added support via `imhentai_to.go` downloader (uses zrocdn.xyz CDN, WebP format, media IDs)
- **imhentai.xxx**: Different site with different structure (uses hidden inputs, g_th JSON, m*.imhentai.xxx CDN)
- Sites are detected via clipboard monitoring and URL patterns
- Each site has specific concurrency limits in `module.go`