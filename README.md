# Manga Visor 📖

A premium desktop manga viewer and downloader application built with Wails, React, and Go. High performance, beautiful aesthetics, and smooth experience.

![Manga Visor](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 📥 Downloader
- **High-speed Downloader** - Multi-threaded image downloading.
- **Supported Sites** - Integrated support for:
  - **Hitomi.la** (with language filtering)
  - **MangaDex** (with language filtering)
  - **nHentai**
  - **ManhwaWeb**
  - **ZonaTMO**
  - **Manga18.club**
- **Smart Monitoring** - Automatic clipboard monitoring for instant downloads.
- **Queue Management** - Sequential download queue with pause/resume support.
- **Auto-resume** - Automatically resume incomplete downloads on app restart.
- **Auto-organization** - Downloads are automatically structured into folders for the Library.
- **Series Support** - Automatic detection and chapter selection for multi-chapter series.

### 🖼️ Viewing Modes
- **Vertical Scroll** - Infinite scroll with configurable width (30-100%).
  - **Auto-scroll** - Automatic scrolling with adjustable speed (0-100) for hands-free reading.
  - **Play/Pause Controls** - Easy toggle for auto-scroll with speed slider.
  - **Smart Detection** - Automatically pauses when user manually scrolls.
- **Lateral Pages** - Single or double page view with smooth CSS transitions.
  - **Reading Direction** - Left-to-right (LTR) or right-to-left (RTL) support.
- **Zoom & Pan** - Advanced controls for detailed viewing with smooth responsiveness.
- **Thumbnails View** - Grid overview for quick navigation and selection.
  - **Image Reordering** - Drag & drop to manually reorder images within folders.
  - **Reset Order** - Restore original image order at any time.

### 📂 Organization
- **Explorer** - Recursive folder browsing with base folder management.
  - **Recursive Search** - Automatically scans subdirectories for manga folders.
  - **Quick Access** - Pin frequently accessed base folders.
- **Library Management**:
  - **One Shot Library** - Organize standalone manga chapters and one-shots.
  - **Series Library** - Group chapters into series with automatic chapter detection.
  - **Chapter Navigation** - Seamless navigation between chapters within series.
- **Reading History** - Track your progress with visual indicators and resume functionality.
  - **Progress Tracking** - Visual progress bars and "continue reading" shortcuts.
  - **List & Grid Views** - Switch between detailed list and visual grid layouts.
  - **Optional History** - Enable/disable history tracking in settings.
- **Archive Support** - Read directly from ZIP, RAR, CBZ, and CBR archives with automatic cleanup.
- **Folder Thumbnails** - Visual previews for all your series and chapters.

### 🎨 Experience
- **9 Premium Themes** - Dark, Light, Midnight Blue, Sakura, AMOLED Black, Lavender Dream, Mint Fresh, Peach Blossom, and Ichigo.
  - **Custom Accent Colors** - Personalize each theme with custom accent colors.
- **Multi-language** - Full support for English and Spanish.
- **Performance Optimized** - Virtualized lists and intelligent caching for smooth handling of thousands of images.
  - **Image Preloading** - Configurable preloading of adjacent images (1-10 images).
  - **Smart Filtering** - Filter out small images (covers/logos) by minimum size threshold.
- **Panic Button** - Customizable panic key (default: `ESC`) to instantly return to home screen.
- **Responsive Navigation** - Optimized for both mouse and keyboard.
- **Customizable Menu** - Show/hide sidebar navigation items to your preference.
- **Auto-hide Controls** - Viewer controls automatically hide for immersive reading.

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

### Navigation
| Key | Action |
|-----|--------|
| `←` `A` | Previous page |
| `→` `D` `Space` | Next page |
| `Home` | First page |
| `End` | Last page |
| `Escape` | Panic mode / Close viewer / Return to home |

### Viewer Controls
| Key | Action |
|-----|--------|
| `+` `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom |
| `B` | Toggle sidebar |
| `T` | Toggle Thumbnail view |
| `Ctrl + Wheel` | Adjust vertical width (vertical mode) |

### General
| Key | Action |
|-----|--------|
| `ESC` | Panic button (customizable in settings) |

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
- **`history.json`** - Detailed record of your reading progress (last page, completion status, scroll position).
- **`library.json`** - Metadata and organization info for folders managed within the One Shot Library.
- **`orders.json`** - Stores custom manual sorting and reordering of images within specific folders.
- **`series.json`** - Metadata and grouping information for manga series and their chapters.
- **`settings.json`** - Application-wide preferences including:
  - Theme and accent colors
  - Language preference
  - Viewer modes (vertical/lateral, single/double page)
  - Vertical width and auto-scroll speed
  - Reading direction (LTR/RTL)
  - Image preloading settings
  - History enable/disable
  - Minimum image size filter
  - Panic key customization
  - Menu item visibility

## 📝 License
MIT License - See [LICENSE](LICENSE) for details.

---
Made with ❤️ for the manga community.
