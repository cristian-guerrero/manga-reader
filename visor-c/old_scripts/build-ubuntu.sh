#!/bin/bash
# Build script for Ubuntu Linux - run from terminal

echo "Compiling Manga Viewer with libvips for Linux..."

mkdir -p build

# Source files
SOURCES="src/main.c src/config.c src/folder.c src/input.c src/loader.c src/platform.c src/viewer.c"

# Include directory
INCLUDE="-Iinclude"

# Build debug version
gcc $(pkg-config --cflags vips) \
    $INCLUDE \
    -o build/viewer_debug $SOURCES \
    $(pkg-config --libs vips) \
    -lraylib -lGL -lm -lpthread -ldl -lrt -lX11

if [ $? -eq 0 ]; then
    echo ""
    echo "Build successful!"
    echo "Run: ./build/viewer_debug"
    
    # Also build release version with optimizations
    gcc $(pkg-config --cflags vips) \
        $INCLUDE \
        -o build/viewer $SOURCES \
        $(pkg-config --libs vips) \
        -lraylib -lGL -lm -lpthread -ldl -lrt -lX11 \
        -O3 -DNDEBUG
    
    echo "Release build: ./build/viewer"
else
    echo ""
    echo "Build failed."
fi
