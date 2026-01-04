# Build Instructions

## Quick Build

```bash
# Build for current platform
wails build
```

Output: `build/bin/manga-visor.exe` (Windows) or `manga-visor` (Linux/macOS)

## Production Build

```bash
# Optimized production build
wails build -production

# With specific output name
wails build -production -o MangaVisor
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
| `-production` | Production build (smaller, optimized) |
| `-platform` | Target platform (e.g., `windows/amd64`) |
| `-o` | Output filename |
| `-clean` | Clean build cache first |
| `-debug` | Include debug symbols |
| `-upx` | Compress with UPX |
| `-nsis` | Generate Windows installer |

## Windows Installer

```bash
wails build -production -nsis
```

This generates a Windows installer using NSIS.

## Distribution Checklist

1. ✅ Build with `-production` flag
2. ✅ Test on target platform
3. ✅ Sign executable (Windows/macOS)
4. ✅ Create installer if needed
5. ✅ Package with README and LICENSE
