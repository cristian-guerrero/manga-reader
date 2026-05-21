#!/bin/bash

# Configuration
APP_NAME="Manga Visor"
BINARY_NAME="manga-visor2"
VERSION="1.0.5" # Should match wails.json
APPIMAGE_TOOL_URL="https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Building AppImage for $APP_NAME ($VERSION)...${NC}"

# 1. Build the application
echo -e "${GREEN}Building binary with Wails...${NC}"
LDFLAGS="${1:--s -w}"
wails build -platform linux/amd64 -ldflags="$LDFLAGS"

if [ ! -f "build/bin/$BINARY_NAME" ]; then
    echo -e "${RED}Error: Binary build/bin/$BINARY_NAME not found. Build failed?${NC}"
    exit 1
fi

# 2. Prepare AppDir
echo -e "${GREEN}Preparing AppDir...${NC}"
rm -rf build/linux/AppDir
mkdir -p build/linux/AppDir/usr/bin
mkdir -p build/linux/AppDir/usr/share/icons/hicolor/256x256/apps
mkdir -p build/linux/AppDir/usr/share/applications

# Copy binary
cp "build/bin/$BINARY_NAME" build/linux/AppDir/usr/bin/

# Copy desktop file and icons
cp build/linux/manga-visor.desktop build/linux/AppDir/usr/share/applications/
cp build/appicon.png build/linux/AppDir/usr/share/icons/hicolor/256x256/apps/manga-visor.png
cp build/appicon.png build/linux/AppDir/manga-visor.png # Needed in root for AppDir
ln -sf usr/share/icons/hicolor/256x256/apps/manga-visor.png build/linux/AppDir/.DirIcon

# Desktop file in root is required
cp build/linux/manga-visor.desktop build/linux/AppDir/manga-visor.desktop

# 3. Create AppRun (symlink to binary)
ln -sf usr/bin/$BINARY_NAME build/linux/AppDir/AppRun

# 4. Download and setup appimagetool if not present
if [ ! -d "build/linux/appimagetool-extract" ]; then
    if [ ! -f "build/linux/appimagetool" ]; then
        echo -e "${BLUE}Downloading appimagetool...${NC}"
        if command -v curl &> /dev/null; then
            curl -L -o build/linux/appimagetool "$APPIMAGE_TOOL_URL"
        elif command -v wget &> /dev/null; then
            wget -O build/linux/appimagetool "$APPIMAGE_TOOL_URL"
        else
            echo -e "${RED}Error: curl or wget is required but not found in the container.${NC}"
            exit 1
        fi
        chmod +x build/linux/appimagetool
    fi

    echo -e "${GREEN}Extracting appimagetool (to avoid FUSE issues in container)...${NC}"
    cd build/linux && ./appimagetool --appimage-extract > /dev/null
    mv squashfs-root appimagetool-extract
    cd ../..
fi

# 5. Build the AppImage
echo -e "${GREEN}Running appimagetool...${NC}"

# Ensure paths are absolute for the tool
ABS_APPDIR="$(realpath build/linux/AppDir)"
ABS_OUTDIR="$(realpath build/bin)"
APPIMAGE_NAME="Manga_Visor_$VERSION-x86_64.AppImage"

if [ ! -d "$ABS_APPDIR" ]; then
    echo -e "${RED}Error: $ABS_APPDIR does not exist before running tool.${NC}"
    exit 1
fi

# Use extracted tool to avoid FUSE dependency inside container
ARCH=x86_64 ./build/linux/appimagetool-extract/AppRun "$ABS_APPDIR" "$ABS_OUTDIR/$APPIMAGE_NAME"

if [ $? -eq 0 ]; then
    echo -e "${BLUE}Success! AppImage generated at:${NC}"
    echo -e "${GREEN}build/bin/$APPIMAGE_NAME${NC}"
else
    echo -e "${RED}Failed to create AppImage.${NC}"
    exit 1
fi
