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
- **Go backend**: `internal/` with `services/` (DI container), `database/` (SQLite repositories), `persistence/` (shared model types only), `modules/` (colorizer, downloader, explorer, library, series, history), `fileloader/` (image server), `thumbnails/`, `archiver/`, `updater/` (auto-update via GitHub releases), `version/` (build-time version injection via ldflags)
- **Frontend**: Vite config at `frontend/vite.config.ts` with path aliases (`@app`, `@features`, `@shared`, `@services`, `@stores`, `@hooks`, `@components`, `@types`, `@utils`, `@constants`, `@themes`, `@i18n`)
- **API bridge**: Go methods in `app.go` exposed to frontend via Wails binding; frontend calls via `services/api/*`
- **Colorizer**: Python/Flask server for image processing; managed by `internal/modules/colorizer/`
- **Go is single source of truth**: No localStorage, no IndexedDB, no frontend defaults. All state lives in Go SQLite, exposed through Wails-bound methods. Frontend calls backend for **every** preference (sort, view mode, tabs, viewer state). Backend always returns defaults when nothing saved. Frontend Zustand stores are ephemeral UI state only — never pre-seed defaults, never persist to IndexedDB/localStorage. If a value needs to survive restart, add a backend repository method.

## Data Storage
`~/.manga-visor/` (Windows: `%USERPROFILE%\.manga-visor\`). Each library is a fully self-contained SQLite database. A JSON file (`libraries.json`) serves as the library registry.

```
~/.manga-visor/
├── libraries.json          ← Registry: list of libraries + active library ID
├── manga-visor.db          ← Default library
├── library__<name>.db      ← Additional libraries
├── update-log.txt          ← Update history (timestamp | version | channel)
├── cache/
│   └── thumbnails.db      ← bbolt thumbnail cache (single file, invisible)
├── downloads/
└── temp/
```

### Database (`internal/database/`)
- **Engine**: `modernc.org/sqlite` (pure Go, no CGo)
- **Each `.db`** has a `fullSchema` with all tables: `settings`, `ui_preferences`, `explorer_folders`, `library_entries`, `series_entries`, `series_chapters`, `history`, `download_jobs`, `tabs`, `image_orders`, `folder_orders`, `folder_view_modes`, `folder_grid_sizes`, `viewer_states`, `schema_version`
- **Migration**: Auto-migrates from legacy JSON files on first startup (only in default library)
- **Each entity** has a dedicated repository file (e.g., `settings_repo.go`, `history_repo.go`) with `sync.RWMutex` + in-memory cache + write-through to SQLite
- **All repos have `SetDB()`** — when switching libraries, the container calls `SetDB()` + `Load()` on every repository to point to the new library's database
- **Settings and UI prefs are per-library**, so each library can have its own theme, sidebar visibility, viewer mode, etc.
- **Library registry** (`internal/modules/librarymanager/`) manages `libraries.json` — no `libraries` SQLite table

### Library Manager (`internal/modules/librarymanager/`)
- Manages `libraries.json` with the list of registered libraries and the active library ID
- `EnsureDefault()` — creates default entry if JSON doesn't exist (uses legacy `manga-visor.db` if found)
- `Create(name, currentDB)` — creates a new `.db`, copies settings/ui_preferences from current DB
- `Delete(id)` — removes from JSON registry only (`.db` file preserved)
- `OpenLibrary(path)` — copies an external `.db` into the data directory and registers it
- `GetActiveID()` / `SetActiveID()` — get/set the active library ID in JSON

### Folder Order (Custom & Auto Explorer Sorting)
- Stored in `folder_orders` SQLite table via `internal/database/folder_orders_repo.go`
- Custom mode applied in `internal/modules/explorer/explorer.go` `ListDirectoryWithSort` via `applyNamedOrder()`.
- Auto mode: folders promoted to front on click via `PromoteToFront()`, falls back to newest-first date sort.
- Frontend: `useExplorerDragAndDrop` hook + `SortableEntryTile` + `DirectoryView` components using `@dnd-kit`.

### UI Preferences
**Backend is the single source of truth.** No localStorage, no IndexedDB, no frontend defaults. Frontend calls backend for every preference and never pre-seeds defaults. Backend always returns defaults when nothing saved:
- `GetExplorerSortPreference(path)` → `{sortBy, sortOrder}` (default: `{name, asc}`)
- `GetSeriesSortBy/Order()` → defaults `name`/`asc`
- `GetOneShotSortBy/Order()` → defaults `name`/`asc`
- `GetSeriesDetailsSortPreference(path)` → defaults `{name, asc}`
- `GetHistoryViewMode()` → default `list`
- `GetExplorerRootViewMode()` → default `grid`
- `GetFolderViewMode(path)` → default `grid`
- `GetTabs()`, `SaveTabs()` — tabs persistence via backend (per-library)
- **Library switching** — frontend listens to `library_switched` event via Wails runtime and re-fetches settings + tabs from the new library's database

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

## Updater Module
- Auto-update via GitHub releases (`cristian-guerrero/manga-reader`). Single channel using build numbers (`bNNNN`).
- Each push to `main` creates a new release with tag `bNNNN` where NNNN is the commit count (like llama.cpp).
- Check on startup via GitHub API. Download in background. Applies on shutdown via `os.Rename` + `WriteFile` (no scripts, no terminal).
- Toggle `auto_update` in Settings (default `true`). Version stored in SQLite.
- Version injected via `-ldflags=-X manga-visor/internal/version.Version=b<build_number>` in CI.
- UI: toast banner for new version with Download button, Settings section with auto-update toggle + status.

## Downloader Module
- 22 supported sites with per-algorithm concurrency config (parallel chapters + parallel images per chapter) stored in SQLite settings and editable via settings dialog in download page (gear icon)
- Clipboard monitoring triggers auto-detection (`internal/modules/downloader/clipboard.go`)
- Sites detected by URL patterns, each with dedicated `internal/modules/downloader/*.go` file

## Build Notes
- **Linux**: Uses `build-appimage.sh` (not standard `wails build`) to produce AppImage with FUSE-free tooling
- **Windows**: Standard `wails build -platform windows/amd64`
- **macOS**: `wails build -platform darwin/universal` (CI builds universal binary)
- **CI**: GitHub Actions on push to `main` or version tags; Linux requires `libgtk-3-dev libwebkit2gtk-4.1-dev libfuse2 libappstream-glib-dev`, uses Node.js 20 and Go 1.24
