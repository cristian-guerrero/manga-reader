# Manga Visor 📖

A premium desktop manga viewer and downloader application built with Wails, React, and Go. High performance, beautiful aesthetics, and smooth experience.

![Manga Visor](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 📥 Downloader (NEW)
- **High-speed Downloader** - Multi-threaded image downloading.
- **Supported Sites** - Integrated support for:
  - **Hitomi.la** (with language filtering)
  - **MangaDex** (with language filtering)
  - **nHentai**
  - **ManhwaWeb**
  - **ZonaTMO**
- **Smart Monitoring** - Automatic clipboard monitoring for instant downloads.
- **Queue Management** - Sequential download queue with pause/resume support.
- **Auto-organization** - Downloads are automatically structured into folders for the Library.

### 🖼️ Viewing Modes
- **Vertical Scroll** - Infinite scroll with configurable width (30-100%).
- **Lateral Pages** - Single or double page view with smooth CSS transitions.
- **Zoom & Pan** - Advanced controls for detailed viewing with smooth responsiveness.
- **Thumbnails View** - Grid overview for quick navigation and selection.

### 📂 Organization
- **Explorer & Library** - Browse local folders or let the app manage your collection.
- **Reading History** - Track your progress with visual indicators and resume functionality.
- **Image Reordering** - Drag & drop to reorder images manually or sort by name/date.
- **Archive Support** - Read directly from ZIP, RAR, CBZ, and CBR archives with automatic cleanup.
- **Folder Thumbnails** - Visual previews for all your series and chapters.

### 🎨 Experience
- **9 Premium Themes** - Dark, Light, Midnight Blue, Sakura, AMOLED Black, Lavender Dream, Mint Fresh, Peach Blossom, and Ichigo.
- **Multi-language** - Full support for English and Spanish.
- **Performance Optimized** - Virtualized lists and intelligent caching for smooth handling of thousands of images.
- **Panic Button** - Press `ESC` to instantly return to the home screen.
- **Responsive Navigation** - Optimized for both mouse and keyboard.

## 🚀 Getting Started

### Prerequisites
- [Go 1.24+](https://golang.org/dl/)
- [Node.js 20+](https://nodejs.org/)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)

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

### 📦 Building & Releases
The project uses GitHub Actions for **multiplatform builds**. When a new tag (e.g., `v1.1.0`) is pushed, builds are automatically generated for:
- **Windows** (AMD64)
- **Linux** (AMD64 - requires `libgtk-3-dev` and `libwebkit2gtk-4.1-dev`)
- **macOS** (Universal/Silicon support)

To build manually:
```bash
wails build -platform windows/amd64
```

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
| `T` | Toggle Thumbnail view |
| `Escape` | Panic mode / Close viewer |

## 🛠️ Tech Stack

- **Framework**: [Wails v2](https://wails.io/) (Go + Webview)
- **Backend**: Go 1.24 (High performance logic and file handling)
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Vanilla CSS (Premium, custom-crafted designs)
- **State Management**: Zustand
- **Drag & Drop**: @dnd-kit
- **i18n**: react-i18next

## 📊 Data Storage
Data is stored locally in the user's home directory under `~/.manga-visor/` (on Windows: `%APPDATA%/manga-visor/`).

### Folders
- **`cache/`** - Persistent storage for high-quality thumbnails generated for the Explorer and Library.
- **`downloads/`** - Default location for all downloaded manga chapters.
- **`temp/`** - Temporary workspace for extracting archives (ZIP, RAR, etc.) and processing transient data.

### Configuration Files
- **`downloader.json`** - Manages the state of the download queue, including pending, running, and completed jobs.
- **`explorer.json`** - Stores user-defined base folders, pinned locations, and explorer view preferences.
- **`history.json`** - Detailed record of your reading progress (last page, completion status).
- **`library.json`** - Metadata and organization info for folders managed within the internal Library.
- **`orders.json`** - Stores custom manual sorting and reordering of images within specific folders.
- **`series.json`** - Metadata and grouping information for manga series and their chapters.
- **`settings.json`** - Application-wide preferences (Theme, Language, Viewer modes, etc.).

## 📝 License
MIT License - See [LICENSE](LICENSE) for details.

---
Made with ❤️ for the manga community.
