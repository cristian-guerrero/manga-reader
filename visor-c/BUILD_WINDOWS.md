# Manga Viewer - Windows Build Guide

This guide explains how to build portable and installer versions of Manga Viewer for Windows that can run on any machine without requiring dependencies.

## Overview

Two build scripts are provided:

1. **`build-portable.bat`** - Creates a portable ZIP package
2. **`build-installer.bat`** - Creates an NSIS installer (`.exe`)

Both scripts automatically detect MSYS2 installation and copy all required DLLs.

## Prerequisites

### Required Tools

1. **MSYS2** - Development environment with MinGW64
   - Download: https://www.msys2.org/
   - Install to default location or custom path (scripts auto-detect common paths)
   - Required packages: `mingw-w64-x86_64-gcc`, `mingw-w64-x86_64-pkg-config`, `mingw-w64-x86_64-vips`, `mingw-w64-x86_64-raylib`

2. **For Installer Only: NSIS** (Nullsoft Scriptable Install System)
   - Download: https://nsis.sourceforge.io/Download
   - Required only for `build-installer.bat`

### Installing MSYS2 Packages

After installing MSYS2, open the MSYS2 MinGW 64-bit terminal and run:

```bash
pacman -S mingw-w64-x86_64-gcc
pacman -S mingw-w64-x86_64-pkg-config
pacman -S mingw-w64-x86_64-vips
pacman -S mingw-w64-x86_64-raylib
```

## MSYS2 Path Detection

Both scripts automatically detect MSYS2 by checking the following locations (in order):

1. `C:\msys64\mingw64\bin` (default)
2. `C:\msys64\ucrt64\bin` (UCRT variant)
3. `C:\devtools\msys64\mingw64\bin`
4. `D:\msys64\mingw64\bin`
5. Current PATH (if `gcc.exe` is found)

If MSYS2 is installed in a custom location not listed above, you can add it to your system PATH or modify the scripts.

## Build Scripts

### 1. Portable Build (`build-portable.bat`)

Creates a self-contained ZIP package that can run on any Windows machine.

#### Usage

```cmd
cd visor-c
build-portable.bat
```

#### What It Does

1. **Compiles the application** - Builds `viewer.exe` with release settings
2. **Prepares portable directory** - Creates `portable/` folder structure
3. **Copies executable** - Copies `viewer.exe` as `MangaViewer.exe`
4. **Finds and copies DLLs** - Uses `objdump` to find all dependencies
5. **Copies vips plugins** - Includes vips module plugins (if available)
6. **Creates documentation** - Generates `README.txt` and launcher script
7. **Creates ZIP package** - Packages everything into a ZIP file

#### Output

- `portable/` - Directory with all files (can be distributed as-is)
- `build/MangaViewer-1.0.0-portable.zip` - ZIP package for distribution

#### Contents

```
portable/
├── MangaViewer.exe          # Main executable
├── MangaViewer.bat          # Launcher script (sets PATH)
├── README.txt               # User documentation
├── dll/                     # Required DLLs
│   ├── libvips-*.dll
│   ├── libraylib*.dll
│   ├── libgcc_s_seh-1.dll
│   ├── libstdc++-6.dll
│   └── ... (other dependencies)
└── lib/
    └── vips-modules-8.16/  # Vips plugins (optional)
```

#### User Instructions

Users can:
1. Extract the ZIP file
2. Run `MangaViewer.exe` directly
3. Or run `MangaViewer.bat` (recommended for better compatibility)
4. Drag and drop a folder with images onto the executable

### 2. Installer Build (`build-installer.bat`)

Creates a professional Windows installer using NSIS.

#### Usage

```cmd
cd visor-c
build-installer.bat
```

#### What It Does

1. **Builds the application** - Calls `build.bat` to compile
2. **Prepares installer directory** - Creates `build/installer/` folder
3. **Copies all required files** - Executable, DLLs, and plugins
4. **Generates NSIS script** - Creates `build/installer.nsi`
5. **Builds installer** - Runs `makensis` to create the `.exe` installer

#### Output

- `build/MangaViewer-1.0.0-setup.exe` - Installer executable

#### Installer Features

- Modern UI with English and Spanish language support
- Installs to `C:\Program Files\MangaViewer\` (default)
- Creates Start Menu shortcuts
- Creates Desktop shortcut (optional)
- Registers in Windows Add/Remove Programs
- Includes uninstaller
- Optional components (shortcuts)

#### User Installation

Users can:
1. Run `MangaViewer-1.0.0-setup.exe`
2. Follow the installation wizard
3. Launch from Start Menu or Desktop shortcut
4. Uninstall from Add/Remove Programs

## Configuration

Both scripts use configuration variables at the top that can be customized:

```batch
set APP_NAME=MangaViewer
set APP_VERSION=1.0.0
```

### Installer-Specific Configuration

```batch
set APP_NAME_DISPLAY="Manga Viewer"
set COMPANY_NAME="MangaViewer"
```

## Troubleshooting

### "MSYS2 not found" Error

**Problem**: Script cannot find MSYS2 installation.

**Solutions**:
1. Install MSYS2 from https://www.msys2.org/
2. Install to default location `C:\msys64\`
3. Or add MSYS2 bin directory to system PATH
4. Or modify the script to add your custom path

### "makensis not found" Error

**Problem**: NSIS is not installed or not in PATH.

**Solutions**:
1. Install NSIS from https://nsis.sourceforge.io/Download
2. Add NSIS to system PATH during installation
3. Or run `build-portable.bat` instead (doesn't require NSIS)

### Application Won't Run on Target Machine

**Problem**: Extracted portable version shows "DLL not found" error.

**Solutions**:
1. Use the `.bat` launcher script instead of running `.exe` directly
2. Verify all DLLs were copied to the `dll/` folder
3. Check that the target machine has Windows 7 or later
4. Verify the executable was built with the same MSYS2 version

### Missing Vips Plugins

**Problem**: Image formats not loading correctly.

**Solutions**:
1. Verify vips is installed in MSYS2
2. Check that `vips-modules-8.16` folder exists in MSYS2 lib directory
3. Re-run the build script

## Advanced Usage

### Building Both Versions

```cmd
cd visor-c

# Build portable version
build-portable.bat

# Build installer version
build-installer.bat
```

### Custom MSYS2 Path

If MSYS2 is installed in a non-standard location, modify the script's path detection section:

```batch
REM Add your custom path
if exist "D:\custom\path\to\msys64\mingw64\bin\gcc.exe" (
    set "MSYS2_PATH=D:\custom\path\to\msys64\mingw64\bin"
    echo Found MSYS2 at: D:\custom\path\to\msys64\mingw64\bin
)
```

### Distribution

**Portable Version**:
- Distribute the ZIP file
- Users extract and run
- No installation required
- Can be run from USB drive

**Installer Version**:
- Distribute the setup.exe
- Users run installer
- Proper installation with shortcuts
- Easy uninstall

## File Sizes

Typical output sizes (varies based on dependencies):

- **Portable ZIP**: ~30-50 MB (compressed)
- **Installer EXE**: ~30-50 MB (compressed)
- **Uncompressed**: ~80-120 MB

## Supported Image Formats

Thanks to vips and its plugins, the viewer supports:

- PNG, JPG, JPEG
- WebP, AVIF, HEIF, HEIC
- TIFF, BMP
- JPEG XL (JXL)
- And more formats supported by vips

## System Requirements

**Target Machine**:
- Windows 7 or later (Windows 10/11 recommended)
- No additional dependencies required
- ~100 MB free disk space

**Build Machine**:
- Windows 10/11 recommended
- MSYS2 with required packages
- NSIS (for installer only)

## License

These build scripts are part of the Manga Viewer project. See the main LICENSE file for details.
