#!/bin/bash
# Build script for MSYS2 - run from MSYS2 MinGW64 shell

echo "Compiling Manga Viewer with libvips..."

mkdir -p build

gcc $(pkg-config --cflags vips) \
    -o build/viewer_debug.exe main.c \
    $(pkg-config --libs vips) \
    -lraylib -lopengl32 -lgdi32 -lwinmm

if [ $? -eq 0 ]; then
    echo ""
    echo "Build successful!"
    echo "Run: ./build/viewer_debug.exe"
    
    # Also build release version without console
    gcc $(pkg-config --cflags vips) \
        -o build/viewer.exe main.c \
        $(pkg-config --libs vips) \
        -lraylib -lopengl32 -lgdi32 -lwinmm -mwindows
    
    echo "Release build: ./build/viewer.exe"
else
    echo ""
    echo "Build failed."
fi
