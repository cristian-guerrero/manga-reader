# Manga Visor 📖

A premium desktop manga viewer and downloader application built with Wails, React, and Go. High performance, beautiful aesthetics, and smooth experience.

![Manga Visor](https://img.shields.io/badge/version-1.0.5-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 📥 Downloader
- **High-speed Downloader** - Multi-threaded image downloading.
- **Supported Sites** - Integrated support for 22 sites:
  - **Hitomi.la**
  - **MangaDex.org**
  - **nHentai.net**
  - **nHentai.xxx**
  - **nHentai.com**
  - **nHentai.website**
  - **ManhwaWeb.com**
  - **ZonaTMO.com**
  - **Hentaiera.com**
  - **HentaiRead.io**
  - **Hentai2Read.com**
  - **IMHentai.xxx**
  - **IMHentai.to**
  - **Hentaivox.com**
  - **Manga18.club**
  - **Comics18.org**
  - **Hentaifc.com**
  - **ComicPorn.xxx**
  - **E-Hentai.org**
  - **Submanhwa.com**
  - **Hentaiforce.net**
  - **lhentai.com**
  - **Hentaifox.com**
- **Smart Monitoring** - Automatic clipboard monitoring for instant downloads.
- **Queue Management** - Sequential download queue with pause/resume support.
- **Auto-resume** - Automatically resume incomplete downloads on app restart.
- **Auto-organization** - Downloads are automatically structured into folders for the Library.
- **Series Support** - Automatic detection and chapter selection for multi-chapter series.
- **Advanced Tab System** - Browser-like multi-tab experience.
  - **Intuitive Navigation** - Open multiple folders or series in independent tabs.
  - **Drag & Drop Reordering** - Organically organize your workspace by dragging tabs.
  - **Middle-click Actions** - Quickly close tabs or open folders/series in new tabs via middle-click.
  - **Smart Compression** - Tabs dynamically resize to fit any window width.

### 🎨 Manga Colorizer
- **AI-Powered Colorization** - Transform black and white manga into vibrant color using advanced AI models.
- **Image Enhancement**:
  - **Colorization** - Automatically add color to grayscale manga pages.
  - **Upscaling** - Enhance image resolution with adjustable upscale factor.
  - **Denoising** - Remove noise and artifacts with configurable denoise strength.
- **Batch Processing** - Drag & drop multiple images or entire folders for bulk colorization.
- **Flexible Workflow**:
  - **Single Image Mode** - Process and preview one image at a time.
  - **Batch Mode** - Colorize all images in a folder with progress tracking.
- **Easy Export** - Download individual colorized images or batch download all results.
- **Self-Contained Setup** - Automatic installation of Python runtime and colorizer backend on first use.

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
  - **Sort Modes** - Sort folders by name, date, or use Automatic mode where folders move to top when opened.
  - **Auto Sort** - Automatically promotes accessed folders to position 1, persisted per directory.
  - **Drag & Drop** - Manually reorder subfolders with Custom sort mode.
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
- **Tab Management Styles**:
  - **Memory Saving Mode** - Automatically unmount inactive tabs to keep resource usage minimal.
  - **Session Restoration** - "Continue where you left off" - optionally restore all open tabs on application restart.
- **Responsive Navigation** - Optimized for both mouse and keyboard.
- **Customizable Menu** - Show/hide sidebar navigation items to your preference.
- **Auto-hide Controls** - Viewer controls automatically hide for immersive reading.

## 🖼️ Native Image Decoding (AVIF & WebP)

Manga Visor uses **forked versions** of the [gen2brain/avif](https://github.com/gen2brain/avif) and [gen2brain/webp](https://github.com/gen2brain/webp) libraries to accelerate AVIF and WebP decoding via native FFI (not WASM).

| Format | Fork | Native library |
|--------|------|----------------|
| **AVIF** | [cristian-guerrero/avif](https://github.com/cristian-guerrero/avif) | `libavif` + `libdav1d` |
| **WebP** | [cristian-guerrero/webp](https://github.com/cristian-guerrero/webp) | `libwebp` + `libwebpdemux` |

### How it works

Both libraries ship with a built-in WASM decoder (slow fallback) and an optional native FFI path that calls the C library via purego. The problem is that `LoadLibrary` / `dlopen` only searches standard system paths, not a custom cache folder.

The forks solve this by intercepting the library's `init()` call via `preloadNative()`:

| Platform | Mechanism |
|----------|-----------|
| **Windows** | `LoadLibraryExW(DLL_LOAD_DIR)` — pre-loads all DLLs from `~/.manga-visor/avif-bin/` and `~/.manga-visor/webp-bin/` resolving all dependencies from the same directory. |
| **Linux** | Sets `LD_LIBRARY_PATH` before `purego.Dlopen` so that `dlopen("libavif.so")` / `dlopen("libwebp.so")` finds the cached copy. |
| **macOS** | No-op (WASM fallback; DYLD_LIBRARY_PATH can be configured if needed). |

This means:
- ✅ No changes to Go's compilation flags (no CGO, no build tags)
- ✅ No permanent PATH modifications
- ✅ All binaries stay inside the app's data directory
- ✅ WASM fallback when native library is not available

### Pre-built binaries

Native libraries are built via CI workflows ([`build-avif-binaries.yml`](.github/workflows/build-avif-binaries.yml), [`build-webp-binaries.yml`](.github/workflows/build-webp-binaries.yml)) and published as GitHub Releases. They are auto-downloaded on first run to:

```
~/.manga-visor/avif-bin/
├── libavif.dll       (Windows) / libavif.so (Linux)
├── libdav1d-7.dll
├── libyuv.dll
├── libsharpyuv-0.dll
└── ... (runtime dependencies)

~/.manga-visor/webp-bin/
├── libwebp.dll       (Windows) / libwebp.so (Linux)
├── libwebpdemux.dll
└── ... (runtime dependencies)
```

## 🚀 Getting Started

### Prerequisites
- [Go 1.24.0](https://golang.org/dl/)
- [Node.js 20+](https://nodejs.org/)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)

### Development

```bash
# Clone the repository
git clone https://github.com/yourusername/manga-visor.git
cd manga-visor

# The fork is referenced via replace in go.mod:
#   replace github.com/gen2brain/avif v0.4.4 => github.com/cristian-guerrero/avif v0.0.0-...

# Install frontend dependencies
cd frontend && npm install && cd ..

# Run in development mode
wails dev
```

### 📦 Building & Releases
The project uses GitHub Actions for **multiplatform builds**. When a new tag (e.g., `v1.0.5`) is pushed, builds are automatically generated for:
- **Windows** (AMD64)
- **Linux** (AMD64 - requires `libgtk-3-dev` and `libwebkit2gtk-4.1-dev`)
- **macOS** (Universal/Silicon support)

To build manually:
```bash
wails build -platform windows/amd64 -name manga-visor2
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
- **Styling**: Tailwind CSS (Premium, custom-crafted designs)
- **State Management**: Zustand
- **Drag & Drop**: @dnd-kit
- **i18n**: react-i18next

## 📊 Data Storage
Data is stored locally in the user's home directory under `~/.manga-visor/` (on Windows: `%APPDATA%/manga-visor/`).

### Folders
- **`avif-bin/`** - Cached native AVIF libraries (libavif.dll / libavif.so + runtime deps) auto-downloaded from GitHub Releases.
- **`webp-bin/`** - Cached native WebP libraries (libwebp.dll / libwebp.so + libwebpdemux) auto-downloaded from GitHub Releases.
- **`cache/`** - Persistent storage for high-quality thumbnails generated for the Explorer and Library.
- **`downloads/`** - Default location for all downloaded manga chapters.
- **`temp/`** - Temporary workspace for extracting archives (ZIP, RAR, etc.) and processing transient data.

### Configuration Files
- **`downloader.json`** - Manages the state of the download queue, including pending, running, and completed jobs.
- **`explorer.json`** - Stores user-defined base folders, pinned locations, and explorer view preferences.
- **`folder_orders.json`** - Stores custom and automatic folder ordering for Explorer subdirectories.
- **`history.json`** - Detailed record of your reading progress (last page, completion status, scroll position).
- **`library.json`** - Metadata and organization info for folders managed within the One Shot Library.
- **`orders.json`** - Stores custom manual sorting and reordering of images within specific folders.
- **`tabs.json`** - Persists the state, order, and history of all open tabs for session restoration.
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
  - Tab behavior (Memory saving, Restore on start)
  - Menu item visibility

## 📝 License
MIT License - See [LICENSE](LICENSE) for details.

---
Made with ❤️ for the manga community.
