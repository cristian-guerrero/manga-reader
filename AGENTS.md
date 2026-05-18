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
- **Go backend**: `internal/` with `services/` (DI container), `database/` (SQLite repositories), `persistence/` (shared model types only), `modules/` (colorizer, downloader, explorer, library, series, history), `fileloader/` (image server), `thumbnails/`, `archiver/`
- **Frontend**: Vite config at `frontend/vite.config.ts` with path aliases (`@app`, `@features`, `@shared`, `@services`, `@stores`, `@hooks`, `@components`, `@types`, `@utils`, `@constants`, `@themes`, `@i18n`)
- **API bridge**: Go methods in `app.go` exposed to frontend via Wails binding; frontend calls via `services/api/*`
- **Colorizer**: Python/Flask server for image processing; managed by `internal/modules/colorizer/`
- **Go is single source of truth**: No localStorage. All state lives in Go SQLite, exposed through Wails-bound methods. Frontend calls backend for every preference (sort, view mode, tabs, viewer state). Backend always returns defaults when nothing saved.

## Data Storage
`~/.manga-visor/` (Windows: `%USERPROFILE%\.manga-visor\`). SQLite database: `manga-visor.db`. Cache: `cache/`, downloads: `downloads/`, temp: `temp/`.

### Database (`internal/database/`)
- **Engine**: `modernc.org/sqlite` (pure Go, no CGo)
- **Schema**: 14 tables (`settings`, `explorer_folders`, `library_entries`, `series_entries`, `series_chapters`, `history`, `download_jobs`, `tabs`, `image_orders`, `folder_orders`, `folder_view_modes`, `viewer_states`, `ui_preferences`, `schema_version`)
- **Migration**: Auto-migrates from legacy JSON files on first startup
- **Each entity** has a dedicated repository file (e.g., `settings_repo.go`, `history_repo.go`) with `sync.RWMutex` + in-memory cache + write-through to SQLite
- **UIPreferencesRepository**: Central store for all UI preferences formerly in localStorage (sort modes, view modes)

### Folder Order (Custom & Auto Explorer Sorting)
- Stored in `folder_orders` SQLite table via `internal/database/folder_orders_repo.go`
- Custom mode applied in `internal/modules/explorer/explorer.go` `ListDirectoryWithSort` via `applyNamedOrder()`.
- Auto mode: folders promoted to front on click via `PromoteToFront()`, falls back to newest-first date sort.
- Frontend: `useExplorerDragAndDrop` hook + `SortableEntryTile` + `DirectoryView` components using `@dnd-kit`.

### UI Preferences (formerly localStorage)
All moved to Go backend. Backend always returns defaults when nothing saved:
- `GetExplorerSortPreference(path)` → `{sortBy, sortOrder}` (default: `{name, asc}`)
- `GetSeriesSortBy/Order()` → defaults `name`/`asc`
- `GetOneShotSortBy/Order()` → defaults `name`/`asc`
- `GetSeriesDetailsSortPreference(path)` → defaults `{name, asc}`
- `GetHistoryViewMode()` → default `list`
- `GetExplorerRootViewMode()` → default `grid`
- `GetFolderViewMode(path)` → default `grid`
- `GetTabs()`, `SaveTabs()` — tabs persistence via backend

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
