# Development Guide

## Prerequisites

- **Go 1.21+** - [Download](https://golang.org/dl/)
- **Node.js 18+** - [Download](https://nodejs.org/)
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
│   └── imageorder.go     # Image order manager
├── fileloader/
│   └── loader.go         # Image loading, MIME types, natural sorting
└── thumbnails/
    └── generator.go      # Thumbnail generation with caching
```

### Frontend (React/TypeScript)

```
src/
├── components/
│   ├── layout/           # TitleBar, Sidebar, MainLayout
│   ├── viewers/          # VerticalViewer, LateralViewer, ViewerPage
│   ├── browser/          # FoldersPage, HistoryPage, ThumbnailsPage
│   ├── settings/         # SettingsPage
│   └── common/           # Toast, shared components
├── stores/               # Zustand state management
│   ├── settingsStore.ts
│   ├── navigationStore.ts
│   └── viewerStore.ts
├── hooks/                # Custom hooks
│   ├── usePanicMode.ts
│   └── useKeyboardNav.ts
├── i18n/                 # Internationalization
├── themes/               # Theme definitions
└── types/                # TypeScript type definitions
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

1. Create component in appropriate folder
2. Add to `renderPage()` in `App.tsx`
3. Add navigation item to `Sidebar.tsx` if needed
4. Add translations to locale files

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
