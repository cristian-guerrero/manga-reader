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

### Folder Order (Custom & Auto Explorer Sorting)
- `folder_orders.json` stores custom (`customOrder`) and auto (`autoOrder`) folder ordering for Explorer subdirectories.
- Managed by `internal/persistence/folderorder.go` (FolderOrdersManager), same pattern as ImageOrder.
- Custom mode applied in `internal/modules/explorer/explorer.go` `ListDirectoryWithSort` via `applyNamedOrder()`.
- Auto mode: folders promoted to front on click via `PromoteToFront()`, falls back to newest-first date sort.
- Frontend: `useExplorerDragAndDrop` hook + `SortableEntryTile` + `DirectoryView` components using `@dnd-kit`.
- Wails-bound methods for custom: `GetFolderOrder`, `SetFolderOrder`, `ResetFolderOrder`, `HasFolderCustomOrder`, `GetFolderOriginalOrder`.
- Wails-bound methods for auto: `GetFolderAutoOrder`, `SetFolderAutoOrder`, `HasFolderAutoOrder`, `PromoteToAutoOrder`, `ResetFolderAutoOrder`.

## Conventions
- **Commits**: English only, conventional format (`type: description`), no Spanish characters (see `.cursorrules`)
- **Auto-update on commit**: When generating commit messages or making commits, the agent MUST:
  1. Review and update `README.md` if the changes affect features, supported sites, version, shortcuts, dependencies, data storage, build process, or prerequisites.
  2. Review and update `AGENTS.md` if the changes affect architecture, modules, commands, data storage, conventions, downloader sites, or build notes.
  3. Present the proposed commit and ask for confirmation before executing.
  See [`.pi/skills/git-commit/SKILL.md`](.pi/skills/git-commit/SKILL.md) for the full workflow.
- **Output binary**: `manga-visor2` (not `manga-visor`) — configured in `wails.json`
- **Frontend style**: Functional React components, TypeScript strict mode
- **ContextMenu**: Reusable right-click menu at `components/ui/ContextMenu.tsx` using `ContextMenuItem` type from `@types`. Used in Explorer for folder actions (Open in Colorizer, Open in File Manager). Theming via CSS variables.

## Downloader Module
- 22 supported sites with site-specific concurrency limits in `internal/modules/downloader/module.go:53-70`
- Clipboard monitoring triggers auto-detection (`internal/modules/downloader/clipboard.go`)
- Sites detected by URL patterns, each with dedicated `internal/modules/downloader/*.go` file

## Build Notes
- **Linux**: Uses `build-appimage.sh` (not standard `wails build`) to produce AppImage with FUSE-free tooling
- **Windows**: Standard `wails build -platform windows/amd64`
- **macOS**: `wails build -platform darwin/universal` (CI builds universal binary)
- **CI**: GitHub Actions on push to `main` or version tags; Linux requires `libgtk-3-dev libwebkit2gtk-4.1-dev libfuse2 libappstream-glib-dev`, uses Node.js 20 and Go 1.24
