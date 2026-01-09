# Development Guide

## Prerequisites

- **Go 1.24+** - [Download](https://golang.org/dl/)
- **Node.js 20+** - [Download](https://nodejs.org/)
- **Wails CLI** - Install with `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

## Development Setup

```bash
# Clone and enter the project
git clone <repo-url>
cd manga-visor

# Install frontend dependencies
cd frontend && npm install && cd ..

# Start development server
wails dev
```

## Project Architecture

### Backend (Go)

```
app.go                    # Main application struct, bindings
main.go                   # Entry point, Wails configuration
internal/
├── persistence/          # Data persistence
│   ├── persistence.go    # Base helpers (saveJSON, loadJSON)
│   ├── settings.go       # Settings manager
│   ├── history.go        # History manager
│   ├── library.go        # Library manager
│   ├── explorer.go       # Explorer manager
│   ├── series.go         # Series manager
│   ├── downloader.go     # Downloader state manager
│   ├── imageorder.go     # Image order manager
│   └── types.go          # Shared types
├── modules/              # Business logic modules
│   ├── downloader/       # Downloader module (Hitomi, MangaDex, etc.)
│   ├── explorer/         # File explorer module
│   ├── history/          # Reading history module
│   ├── library/          # Library management module
│   └── series/           # Series management module
├── fileloader/
│   ├── loader.go         # Image loading, MIME types, natural sorting
│   └── imageserver.go    # Image server for thumbnails
├── archiver/
│   └── archiver.go       # Archive extraction (ZIP, RAR, etc.)
└── thumbnails/
    └── generator.go      # Thumbnail generation with caching
```

### Frontend (React/TypeScript)

```
src/
├── components/
│   ├── pages/            # All page components
│   │   ├── HomePage.tsx
│   │   ├── OneShotPage.tsx
│   │   ├── SeriesPage.tsx
│   │   ├── SeriesDetailsPage.tsx
│   │   ├── HistoryPage.tsx
│   │   ├── ExplorerPage.tsx
│   │   ├── ThumbnailsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── DownloadPage.tsx
│   ├── viewers/          # Viewer components
│   │   ├── VerticalViewer.tsx
│   │   ├── LateralViewer.tsx
│   │   └── ViewerPage.tsx
│   ├── layout/           # Layout components
│   │   ├── TitleBar.tsx
│   │   ├── Sidebar.tsx
│   │   └── MainLayout.tsx
│   └── common/           # Shared components
│       ├── Button.tsx
│       ├── Toast.tsx
│       ├── Tooltip.tsx
│       └── ... (other shared components)
├── stores/               # Zustand state management
│   ├── settingsStore.ts
│   ├── navigationStore.ts
│   └── viewerStore.ts
├── hooks/                # Custom hooks
│   ├── usePanicMode.ts
│   └── useKeyboardNav.ts
├── utils/                # Utility functions
│   └── iconGenerator.ts
├── i18n/                 # Internationalization
│   ├── index.ts
│   └── locales/
│       ├── en.json
│       └── es.json
├── themes/               # Theme definitions
│   ├── index.ts
│   └── pixel.css
└── types/                # TypeScript type definitions
    └── index.ts
```

## Code Conventions

### Go
- Use standard Go formatting (`gofmt`)
- Package names are lowercase, single words
- Exported functions/types have doc comments
- Error handling: return errors, don't panic

### TypeScript/React
- Functional components with hooks
- Named exports for components
- PascalCase for components, camelCase for functions/variables
- Props interfaces defined above components

### CSS/Tailwind
- Use CSS variables for theming (`var(--color-*)`)
- Tailwind utilities for layout
- Custom CSS for complex animations

## Adding Features

### New Page

1. Create component in `components/pages/` folder
2. Add to `renderPage()` in `App.tsx`
3. Add the page type to `PageType` in `types/index.ts`
4. Add navigation item to `Sidebar.tsx` if needed
5. Add translations to locale files (`i18n/locales/`)
6. Update `navigationStore.ts` if it's a main menu page

### New Backend Method

1. Add method to `App` struct in `app.go`
2. Method will be auto-bound and available as `window.go.main.App.MethodName()`

### New Theme

Add to `themes/index.ts`:
```typescript
const myTheme: Theme = {
  id: 'my-theme',
  name: 'My Theme',
  colors: { ... }
};
builtInThemes.push(myTheme);
```

## Building

```bash
# Development build
wails build

# Production build (optimized)
wails build -production

# Cross-platform
wails build -platform windows/amd64
wails build -platform darwin/amd64
wails build -platform linux/amd64
```

## Debugging

- **Frontend**: Open browser DevTools at `http://localhost:34115`
- **Backend**: Use standard Go debugging/logging
- **Wails**: Check console output for binding errors

## Testing

```bash
# Frontend tests
cd frontend && npm test

# Go tests
go test ./...
```
