#!/bin/bash
set -euo pipefail
# Build script for MSYS2 - run from MSYS2 MinGW64 shell

echo "Compiling Manga Viewer with libvips..."

ROOT="$(cd "$(dirname "$0")" && pwd)"
EXTERNAL="$ROOT/external"
CACHE="$ROOT/.build-cache"
BUILD_DIR="$ROOT/build"
mkdir -p "$EXTERNAL" "$CACHE" "$BUILD_DIR"

# Ensure script runs with project root as CWD so relative source paths resolve
cd "$ROOT"

mkdir -p build

# Source files
SOURCES='src/main.c src/config.c src/folder.c src/input.c src/loader.c src/platform.c src/viewer.c'

# If running on Linux, prefer vendored dependencies (download if needed)
if [ "$(uname -s)" = "Linux" ]; then
    RAYLIB_VERSION="${RAYLIB_VERSION:-5.5}"
    RAYLIB_URL="${RAYLIB_URL:-https://github.com/raysan5/raylib/releases/download/${RAYLIB_VERSION}/raylib-${RAYLIB_VERSION}_linux_amd64.tar.gz}"
    LIBVIPS_VERSION="${LIBVIPS_VERSION:-8.14.5}"
    LIBVIPS_URL="${LIBVIPS_URL:-https://github.com/lovell/sharp-libvips/releases/download/v${LIBVIPS_VERSION}/libvips-${LIBVIPS_VERSION}-linux-x64.tar.gz}"
    RAYLIB_DIR="$EXTERNAL/raylib"
    LIBVIPS_DIR="$EXTERNAL/libvips"

    download_and_extract() {
        local url="$1" tar_path="$2" target_root="$3"
        rm -rf "$target_root" "$tar_path"
        echo "Downloading: $url"
        wget -q --show-progress "$url" -O "$tar_path"
        mkdir -p "$target_root"
        tar -xf "$tar_path" -C "$target_root"
    }

    ensure_raylib() {
        if [ -f "$RAYLIB_DIR/lib/libraylib.a" ] || [ -f "$RAYLIB_DIR/lib/libraylib.so" ]; then
            echo "raylib: using cached copy at $RAYLIB_DIR"
            return
        fi
        local tar_path="$CACHE/raylib.tar.gz"
        local unpack="$CACHE/raylib-unpack"
        download_and_extract "$RAYLIB_URL" "$tar_path" "$unpack"
        local include_dir lib_dir
        include_dir=$(find "$unpack" -type f -name "raylib.h" -print -quit | xargs -r dirname)
        lib_dir=$(find "$unpack" -type f -name "libraylib.*" -print -quit | xargs -r dirname)
        if [ -z "$include_dir" ] || [ -z "$lib_dir" ]; then
            echo "ERROR: raylib package layout not recognized. Set RAYLIB_URL to a compatible tarball."
            exit 1
        fi
        rm -rf "$RAYLIB_DIR"
        mkdir -p "$RAYLIB_DIR/include" "$RAYLIB_DIR/lib"
        cp -r "$include_dir"/* "$RAYLIB_DIR/include/"
        cp -r "$lib_dir"/* "$RAYLIB_DIR/lib/"
        echo "raylib: installed to $RAYLIB_DIR"
    }

    ensure_libvips() {
        if [ -f "$LIBVIPS_DIR/lib/pkgconfig/vips.pc" ]; then
            echo "libvips: using cached copy at $LIBVIPS_DIR"
            return
        fi
        local tar_path="$CACHE/libvips.tar.xz"
        local unpack="$CACHE/libvips-unpack"
        download_and_extract "$LIBVIPS_URL" "$tar_path" "$unpack"
        local pc_dir
        pc_dir=$(find "$unpack" -path "*/lib/pkgconfig/vips.pc" -print -quit | xargs -r dirname)
        rm -rf "$LIBVIPS_DIR"
        mkdir -p "$LIBVIPS_DIR"
        if [ -n "$pc_dir" ]; then
            local root_dir
            root_dir=$(echo "$pc_dir" | sed 's,/lib/pkgconfig,,')
            cp -r "$root_dir"/* "$LIBVIPS_DIR/"
            echo "libvips: installed to $LIBVIPS_DIR (pkgconfig found)"
            return
        fi
        cp -r "$unpack"/* "$LIBVIPS_DIR/"
        mkdir -p "$LIBVIPS_DIR/lib/pkgconfig"
        cat > "$LIBVIPS_DIR/lib/pkgconfig/vips.pc" <<EOF
prefix=\${pcfiledir}/../..
exec_prefix=\${prefix}
libdir=\${exec_prefix}/lib
includedir=\${prefix}/include

Name: vips
Description: libvips image processing
Version: ${LIBVIPS_VERSION}
Libs: -L\${libdir} -lvips-cpp
Cflags: -I\${includedir}
EOF
        if [ -f "$LIBVIPS_DIR/lib/libvips-cpp.so.42" ] && [ ! -f "$LIBVIPS_DIR/lib/libvips-cpp.so" ]; then
            ln -s libvips-cpp.so.42 "$LIBVIPS_DIR/lib/libvips-cpp.so"
        fi
        echo "libvips: installed to $LIBVIPS_DIR (pkgconfig synthesized)"
    }

    ensure_raylib
    ensure_libvips

    export PKG_CONFIG_PATH="$LIBVIPS_DIR/lib/pkgconfig:${PKG_CONFIG_PATH:-}"
    export LD_LIBRARY_PATH="$LIBVIPS_DIR/lib:$RAYLIB_DIR/lib:${LD_LIBRARY_PATH:-}"

    VIPS_CFLAGS_EXTRA=""
    if [ -d "$LIBVIPS_DIR/include/glib-2.0" ]; then
        VIPS_CFLAGS_EXTRA="$VIPS_CFLAGS_EXTRA -I$LIBVIPS_DIR/include/glib-2.0"
    fi
    if [ -d "$LIBVIPS_DIR/lib/glib-2.0/include" ]; then
        VIPS_CFLAGS_EXTRA="$VIPS_CFLAGS_EXTRA -I$LIBVIPS_DIR/lib/glib-2.0/include"
    fi

    RAYLIB_CFLAGS=""
    RAYLIB_LIBS="-lraylib"
    if [ -d "$RAYLIB_DIR/include" ]; then
        RAYLIB_CFLAGS="-I$RAYLIB_DIR/include"
    fi
    if [ -d "$RAYLIB_DIR/lib" ]; then
        RAYLIB_LIBS="-L$RAYLIB_DIR/lib -lraylib"
    fi

    echo "Using vendored dependencies: libvips at $LIBVIPS_DIR, raylib at $RAYLIB_DIR"

    # Perform Linux build
    gcc $(pkg-config --cflags vips) $VIPS_CFLAGS_EXTRA $RAYLIB_CFLAGS \
        -o "$BUILD_DIR/viewer" $SOURCES \
        $(pkg-config --libs vips) $RAYLIB_LIBS \
        -lGL -lm -lpthread -ldl -lrt -lX11 \
        -Wl,-rpath,'\$ORIGIN/lib' -O2
    echo "Linux build: $BUILD_DIR/viewer"

    # Create a small launcher so the binary automatically loads libs from build/lib
    if [ -f "$BUILD_DIR/viewer" ]; then
        mv "$BUILD_DIR/viewer" "$BUILD_DIR/viewer.bin"
        cat > "$BUILD_DIR/viewer" <<'EOF'
#!/bin/sh
DIR="$(cd "$(dirname "$0")" && pwd)"
export LD_LIBRARY_PATH="$DIR/lib:${LD_LIBRARY_PATH:-}"
exec "$DIR/viewer.bin" "$@"
EOF
        chmod +x "$BUILD_DIR/viewer"
    fi

    # Create local build/lib and copy vendored libs there so the binary can run locally
    mkdir -p "$BUILD_DIR/lib"
    if [ -d "$LIBVIPS_DIR/lib" ]; then
        echo "Copying libvips libs to $BUILD_DIR/lib for local run..."
        for f in "$LIBVIPS_DIR/lib/"libvips*.so*; do
            [ -e "$f" ] || continue
            cp -a "$f" "$BUILD_DIR/lib/" 2>/dev/null || true
        done
    fi
    if [ -d "$RAYLIB_DIR/lib" ]; then
        echo "Copying raylib libs to $BUILD_DIR/lib for local run..."
        for f in "$RAYLIB_DIR/lib/"libraylib*.so*; do
            [ -e "$f" ] || continue
            cp -a "$f" "$BUILD_DIR/lib/" 2>/dev/null || true
        done
    fi

    echo "Note: to run locally use: LD_LIBRARY_PATH=$BUILD_DIR/lib:$LIBVIPS_DIR/lib:$RAYLIB_DIR/lib $BUILD_DIR/viewer"
    exit 0
fi

gcc $(pkg-config --cflags vips) \
    -o build/viewer_debug.exe $SOURCES \
    $(pkg-config --libs vips) \
    -lraylib -lopengl32 -lgdi32 -lwinmm

if [ $? -eq 0 ]; then
    echo ""
    echo "Build successful!"
    echo "Run: ./build/viewer_debug.exe"
    
    # Also build release version without console
    gcc $(pkg-config --cflags vips) \
        -o build/viewer.exe $SOURCES \
        $(pkg-config --libs vips) \
        -lraylib -lopengl32 -lgdi32 -lwinmm -mwindows
    
    echo "Release build: ./build/viewer.exe"
else
    echo ""
    echo "Build failed."
fi
