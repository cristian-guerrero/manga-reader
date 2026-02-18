# Build Instructions

## Quick Build

```bash
# Build for current platform
wails build
```

Output: `build/bin/manga-visor.exe` (Windows) or `manga-visor` (Linux/macOS)

## Production Build

```bash
# Optimized production build (stripped of symbols)
wails build -ldflags="-s -w"

# With specific output name
wails build -o MangaVisor
```

## Cross-Platform Builds

```bash
# Windows (64-bit)
wails build -platform windows/amd64

# macOS (Intel)
wails build -platform darwin/amd64

# macOS (Apple Silicon)
wails build -platform darwin/arm64

# Linux (64-bit)
wails build -platform linux/amd64
```

## Build Options

| Flag | Description |
|------|-------------|
| `-ldflags` | Flags to pass to the Go linker (e.g. `"-s -w"`) |
| `-platform` | Target platform (e.g., `windows/amd64`) |
| `-o` | Output filename |
| `-clean` | Clean build cache first |
| `-debug` | Include debug symbols |
| `-upx` | Compress with UPX |
| `-nsis` | Generate Windows installer |

## Windows Installer

```bash
wails build -nsis
```

This generates a Windows installer using NSIS.

## Linux AppImage

To create an AppImage for Linux, you can use the provided script:

```bash
./build-appimage.sh
```

This script will:
1. Build the binary using `wails build`.
2. Download `appimagetool` if not present.
3. Package everything into a standalone `.AppImage` file in `build/bin/`.

## Distribution Checklist

1. ✅ Build with optimized flags (e.g., `-ldflags="-s -w"`)
2. ✅ Test on target platform
3. ✅ Sign executable (Windows/macOS)
4. ✅ Create installer if needed
5. ✅ Package with README and LICENSE
