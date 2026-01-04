# Manga Visor 📖

A premium desktop manga viewer application built with Wails, React, and Go.

![Manga Visor](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### Viewing Modes
- **Vertical Scroll** - Infinite scroll with configurable width (30-100%)
- **Lateral Pages** - Single or double page view with smooth transitions
- **Zoom & Pan** - Pinch to zoom, drag to pan with smooth animations

### Organization
- **Folder Browser** - Browse and manage your manga folders
- **Reading History** - Track your progress with visual indicators
- **Image Reordering** - Drag & drop to reorder images (persistent)

### Experience
- **5 Built-in Themes** - Dark, Light, Midnight Blue, Sakura, AMOLED Black
- **Multi-language** - English and Spanish (easy to add more)
- **Panic Button** - Press ESC to instantly clear the screen
- **Keyboard Navigation** - Full keyboard support

### Technical
- **Portable** - Single executable, no installation required
- **Fast** - Virtualized lists, lazy loading, thumbnail caching
- **Cross-platform** - Windows, macOS, and Linux support

## 🚀 Quick Start

### Prerequisites
- [Go 1.21+](https://golang.org/dl/)
- [Node.js 18+](https://nodejs.org/)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)

```bash
# Install Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### Development

```bash
# Clone the repository
git clone https://github.com/yourusername/manga-visor.git
cd manga-visor

# Install frontend dependencies
cd frontend && npm install && cd ..

# Run in development mode
wails dev
```

### Building

```bash
# Build for current platform
wails build

# Build for specific platform (cross-compilation)
wails build -platform windows/amd64
wails build -platform darwin/amd64
wails build -platform linux/amd64
```

The built executable will be in the `build/bin/` directory.

## 🎮 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` `A` | Previous page |
| `→` `D` `Space` | Next page |
| `Home` | First page |
| `End` | Last page |
| `+` `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom |
| `B` | Toggle sidebar |
| `Escape` | Panic mode (return home) |

## 🎨 Themes

Manga Visor comes with 5 premium themes:

- **Dark** - Default dark theme with purple accents
- **Light** - Clean light theme for daytime reading
- **Midnight Blue** - Deep blue theme for night owls
- **Sakura** - Soft pink theme inspired by cherry blossoms
- **AMOLED Black** - Pure black for OLED screens

### Adding Custom Themes

Create a JSON file in `~/.manga-visor/themes/`:

```json
{
  "id": "my-theme",
  "name": "My Custom Theme",
  "colors": {
    "accent": "#your-accent-color",
    "background": "#your-background-color",
    ...
  }
}
```

## 📁 Supported Formats

- **Images**: PNG, JPG, JPEG, WebP, GIF, BMP, TIFF, SVG
- **Archives**: Coming soon (ZIP, RAR, CBZ, CBR)

## 🌐 Translations

Currently supported languages:
- 🇺🇸 English
- 🇪🇸 Spanish

### Adding a New Language

1. Create a new JSON file in `frontend/src/i18n/locales/`
2. Copy the structure from `en.json`
3. Translate all values
4. Add the language to `frontend/src/i18n/index.ts`

## 🏗️ Project Structure

```
manga-visor/
├── app.go                 # Main Go application logic
├── main.go                # Entry point & Wails config
├── internal/              # Go internal packages
│   ├── persistence/       # Data persistence (settings, history, orders)
│   ├── fileloader/        # Image loading & processing
│   └── thumbnails/        # Thumbnail generation & caching
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── layout/    # Layout components
│   │   │   ├── viewers/   # Viewer components
│   │   │   ├── browser/   # Browser & history components
│   │   │   ├── settings/  # Settings components
│   │   │   └── common/    # Shared components
│   │   ├── stores/        # Zustand state management
│   │   ├── hooks/         # Custom React hooks
│   │   ├── i18n/          # Internationalization
│   │   ├── themes/        # Theme definitions
│   │   └── types/         # TypeScript types
│   └── ...
└── build/                 # Build output
```

## 📊 Data Storage

All user data is stored in `~/.manga-visor/`:

```
~/.manga-visor/
├── settings.json          # Application settings
├── history.json           # Reading history
├── orders.json            # Custom image orders
├── themes/                # Custom themes (optional)
└── cache/
    └── thumbnails/        # Cached thumbnails
```

## 🛠️ Tech Stack

- **Desktop Framework**: [Wails v2](https://wails.io/)
- **Backend**: Go 1.21+
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS 3
- **Animations**: Framer Motion 11
- **State Management**: Zustand
- **Virtualization**: @tanstack/react-virtual
- **i18n**: react-i18next

## 📝 License

MIT License - See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [Wails](https://wails.io/) for the amazing Go + Web framework
- [Framer Motion](https://www.framer.com/motion/) for beautiful animations
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling

---

Made with ❤️ for manga enthusiasts
