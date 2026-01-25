#!/bin/bash

# Script para compilar y crear un AppImage de visor-c directamente en el sistema
# Verifica y descarga las herramientas de AppImage si no están presentes

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

APP_NAME="MangaViewer"
APP_VERSION="1.0.0"
PROJECT_DIR="$(pwd)"
ROOT="$(cd "$(dirname "$0")" && pwd)"
EXTERNAL="$ROOT/external"
CACHE="$ROOT/.build-cache"
BUILD_DIR="$ROOT/build"
mkdir -p "$EXTERNAL" "$CACHE" "$BUILD_DIR"

# Herramientas de AppImage cacheadas por defecto en .build-cache
TOOLS_DIR="${APPIMAGE_TOOLS_DIR:-$PROJECT_DIR/.build-cache/appimage-tools}"

# Default vendored dependency URLs (puedes sobrescribir con variables de entorno)
RAYLIB_VERSION="${RAYLIB_VERSION:-5.5}"
RAYLIB_URL="${RAYLIB_URL:-https://github.com/raysan5/raylib/releases/download/${RAYLIB_VERSION}/raylib-${RAYLIB_VERSION}_linux_amd64.tar.gz}"
LIBVIPS_VERSION="${LIBVIPS_VERSION:-8.14.5}"
LIBVIPS_URL="${LIBVIPS_URL:-https://github.com/lovell/sharp-libvips/releases/download/v${LIBVIPS_VERSION}/libvips-${LIBVIPS_VERSION}-linux-x64.tar.gz}"

LINUXDEPLOY_URL="https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage"
APPIMAGETOOL_URL="https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"

echo -e "${GREEN}=== Creando AppImage de $APP_NAME (Nativo) ===${NC}\n"

# ============================================
# PASO 0: Verificar dependencias del sistema
# ============================================
echo -e "${BLUE}[0/7]${NC} Verificando dependencias del sistema..."

MISSING_DEPS=""

# Verificar compilador y herramientas básicas
command -v gcc >/dev/null 2>&1 || MISSING_DEPS="$MISSING_DEPS gcc"
command -v pkg-config >/dev/null 2>&1 || MISSING_DEPS="$MISSING_DEPS pkg-config"
command -v ldd >/dev/null 2>&1 || MISSING_DEPS="$MISSING_DEPS ldd"

if [ -n "$MISSING_DEPS" ]; then
    echo -e "${RED}[ERROR]${NC} Faltan dependencias del sistema: $MISSING_DEPS"
    echo -e "${YELLOW}[INFO]${NC} Instálalas con tu gestor de paquetes:"
    echo -e "  Debian/Ubuntu: sudo apt install build-essential pkg-config"
    echo -e "  Fedora/RHEL: sudo dnf install gcc pkg-config"
    echo -e "  Arch: sudo pacman -S base-devel pkg-config"
    exit 1
fi

# Preferir dependencias vendorizadas en external/
if [ -f "$EXTERNAL/libvips/lib/pkgconfig/vips.pc" ]; then
    export PKG_CONFIG_PATH="$EXTERNAL/libvips/lib/pkgconfig:${PKG_CONFIG_PATH:-}"
    echo -e "${BLUE}[INFO]${NC} Usando libvips vendorizado en $EXTERNAL/libvips"
fi

if ! pkg-config --exists vips; then
    echo -e "${RED}[ERROR]${NC} libvips no encontrado ni vendorizado. Instálalo (libvips-dev) o coloca un build en $EXTERNAL/libvips"
    exit 1
fi

# Raylib: aceptar vendorizado o sistema
if pkg-config --exists raylib; then
    echo -e "${GREEN}✓${NC} raylib encontrado via pkg-config"
else
    if [ -d "$EXTERNAL/raylib/include" ] && [ -d "$EXTERNAL/raylib/lib" ]; then
        echo -e "${BLUE}[INFO]${NC} raylib vendorizado encontrado en $EXTERNAL/raylib"
    else
        echo -e "${YELLOW}[WARN]${NC} raylib no encontrado (ni vendorizado ni en el sistema). El build intentará linkear con -lraylib y esperar que esté presente"
    fi
fi

echo -e "${GREEN}✓${NC} Todas las dependencias del sistema están presentes"

# ============================================
# PASO 1: Verificar/Descargar herramientas de AppImage
# ============================================
echo -e "\n${BLUE}[1/7]${NC} Verificando herramientas de AppImage..."

# Función para buscar herramienta en el PATH
find_in_path() {
    local tool_name="$1"
    if command -v "$tool_name" >/dev/null 2>&1; then
        command -v "$tool_name"
        return 0
    fi
    return 1
}

# Función para descargar una herramienta si no está presente
download_tool() {
    local tool_name="$1"
    local url="$2"
    local output_file="$3"
    
    if [ ! -f "$output_file" ]; then
        echo -e "${YELLOW}[INFO]${NC} Descargando $tool_name..."
        
        # Verificar si curl está disponible, si no usar wget
        if command -v curl >/dev/null 2>&1; then
            curl -L -o "$output_file" "$url"
        elif command -v wget >/dev/null 2>&1; then
            wget -O "$output_file" "$url"
        else
            echo -e "${RED}[ERROR]${NC} Se requiere curl o wget para descargar herramientas"
            exit 1
        fi
        
        chmod +x "$output_file"
        echo -e "${GREEN}✓${NC} $tool_name descargado: $output_file"
    else
        echo -e "${GREEN}✓${NC} $tool_name ya existe: $output_file"
    fi
}

# Verificar linuxdeploy primero en el sistema
LINUXDEPLOY=""
if LINUXDEPLOY_PATH=$(find_in_path "linuxdeploy"); then
    echo -e "${GREEN}✓${NC} linuxdeploy encontrado en el sistema: $LINUXDEPLOY_PATH"
    LINUXDEPLOY="$LINUXDEPLOY_PATH"
elif [ -f "$TOOLS_DIR/linuxdeploy-x86_64.AppImage" ]; then
    echo -e "${GREEN}✓${NC} linuxdeploy encontrado en caché: $TOOLS_DIR/linuxdeploy-x86_64.AppImage"
    LINUXDEPLOY="$TOOLS_DIR/linuxdeploy-x86_64.AppImage"
else
    # Crear directorio de herramientas si no existe
    mkdir -p "$TOOLS_DIR"
    download_tool "linuxdeploy" "$LINUXDEPLOY_URL" "$TOOLS_DIR/linuxdeploy-x86_64.AppImage"
    LINUXDEPLOY="$TOOLS_DIR/linuxdeploy-x86_64.AppImage"
fi

# Verificar appimagetool primero en el sistema
APPIMAGETOOL=""
if APPIMAGETOOL_PATH=$(find_in_path "appimagetool"); then
    echo -e "${GREEN}✓${NC} appimagetool encontrado en el sistema: $APPIMAGETOOL_PATH"
    APPIMAGETOOL="$APPIMAGETOOL_PATH"
elif [ -f "$TOOLS_DIR/appimagetool-x86_64.AppImage" ]; then
    echo -e "${GREEN}✓${NC} appimagetool encontrado en caché: $TOOLS_DIR/appimagetool-x86_64.AppImage"
    APPIMAGETOOL="$TOOLS_DIR/appimagetool-x86_64.AppImage"
else
    # Crear directorio de herramientas si no existe
    mkdir -p "$TOOLS_DIR"
    download_tool "appimagetool" "$APPIMAGETOOL_URL" "$TOOLS_DIR/appimagetool-x86_64.AppImage"
    APPIMAGETOOL="$TOOLS_DIR/appimagetool-x86_64.AppImage"
fi

echo -e "${GREEN}✓${NC} Herramientas de AppImage listas"
echo -e "${BLUE}  linuxdeploy:${NC} $LINUXDEPLOY"
echo -e "${BLUE}  appimagetool:${NC} $APPIMAGETOOL"

# ============================================
# PASO 2: Compilar el binario
# ============================================
echo -e "\n${BLUE}[2/7]${NC} Compilando binario..."

mkdir -p build

SOURCES='src/main.c src/config.c src/folder.c src/input.c src/loader.c src/platform.c src/viewer.c'
INCLUDE='-Iinclude'

# Compilar versión release con optimizaciones
# Detectar flags para dependencias vendorizadas
RAYLIB_CFLAGS=""
RAYLIB_LIBS="-lraylib"
if [ -d "$EXTERNAL/raylib/include" ]; then
    RAYLIB_CFLAGS="-I$EXTERNAL/raylib/include"
fi
if [ -d "$EXTERNAL/raylib/lib" ]; then
    RAYLIB_LIBS="-L$EXTERNAL/raylib/lib -lraylib"
fi

VIPS_CFLAGS_EXTRA=""
if [ -d "$EXTERNAL/libvips/include/glib-2.0" ]; then
    VIPS_CFLAGS_EXTRA="$VIPS_CFLAGS_EXTRA -I$EXTERNAL/libvips/include/glib-2.0"
fi
if [ -d "$EXTERNAL/libvips/lib/glib-2.0/include" ]; then
    VIPS_CFLAGS_EXTRA="$VIPS_CFLAGS_EXTRA -I$EXTERNAL/libvips/lib/glib-2.0/include"
fi

# Añadir runpath para buscar librerías dentro del AppImage y también las vendorizadas localmente
RPATH='\$ORIGIN/../lib'
if [ -d "$EXTERNAL/libvips/lib" ]; then
    RPATH="$RPATH:$EXTERNAL/libvips/lib"
fi
if [ -d "$EXTERNAL/raylib/lib" ]; then
    RPATH="$RPATH:$EXTERNAL/raylib/lib"
fi

gcc $(pkg-config --cflags vips) $VIPS_CFLAGS_EXTRA $RAYLIB_CFLAGS \
    $INCLUDE \
    -o build/viewer $SOURCES \
    $(pkg-config --libs vips) $RAYLIB_LIBS \
    -lGL -lm -lpthread -ldl -lrt -lX11 \
    -Wl,-rpath,"$RPATH" \
    -O3 -DNDEBUG

echo -e "${GREEN}✓${NC} Binario compilado exitosamente"

# ============================================
# PASO 3: Crear estructura AppDir (dentro de build/)
# ============================================
echo -e "\n${BLUE}[3/7]${NC} Creando estructura AppDir..."

APPDIR="$PROJECT_DIR/build/AppDir"
rm -rf "$APPDIR"
mkdir -p "$APPDIR/usr/bin"
mkdir -p "$APPDIR/usr/share/applications"
mkdir -p "$APPDIR/usr/share/icons/hicolor/256x256/apps"
mkdir -p "$APPDIR/usr/share/icons/hicolor/512x512/apps"

# Copiar binario
cp build/viewer "$APPDIR/usr/bin/viewer"
chmod +x "$APPDIR/usr/bin/viewer"

# Crear archivo .desktop
cat > "$APPDIR/usr/share/applications/${APP_NAME}.desktop" << 'EOF'
[Desktop Entry]
Type=Application
Name=Manga Viewer
Comment=Visor de manga con soporte para múltiples formatos
Exec=viewer
Icon=MangaViewer
Categories=Graphics;Viewer;
Terminal=false
StartupNotify=true
EOF

# Copiar archivo .desktop a la raíz de AppDir (requerido por appimagetool)
cp "$APPDIR/usr/share/applications/${APP_NAME}.desktop" "$APPDIR/${APP_NAME}.desktop"

# Copiar icono (usar uno existente o crear uno genérico)
if [ -f '../build/appicon.png' ]; then
    cp ../build/appicon.png "$APPDIR/usr/share/icons/hicolor/256x256/apps/viewer.png"
    cp ../build/appicon.png "$APPDIR/usr/share/icons/hicolor/512x512/apps/viewer.png"
    # Copiar icono a la raíz de AppDir (requerido por appimagetool)
    cp ../build/appicon.png "$APPDIR/${APP_NAME}.png"
else
    echo -e "${YELLOW}[WARN]${NC} No se encontró icono, usando uno genérico"
fi

echo -e "${GREEN}✓${NC} Estructura AppDir creada"

# ============================================
# PASO 4: Copiar dependencias manualmente
# ============================================
echo -e "\n${BLUE}[4/7]${NC} Copiando dependencias..."

mkdir -p "$APPDIR/usr/lib"

# Librerías del sistema que NO deben copiarse (deben venir del host)
SYSTEM_LIBS='libc.so.6 libm.so.6 libdl.so.2 libpthread.so.0 librt.so.1 ld-linux-x86-64.so.2 libstdc++.so.6 libgcc_s.so.1'

# Copiar vendorizados (libvips, raylib) si existen
if [ -d "$EXTERNAL/libvips/lib" ]; then
    echo -e "${BLUE}[INFO]${NC} Copiando libvips vendorizado a $APPDIR/usr/lib..."
    for f in "$EXTERNAL/libvips/lib/"*; do
        [ -e "$f" ] || continue
        dest="$APPDIR/usr/lib/$(basename "$f")"
        if [ -e "$dest" ]; then
            continue
        fi
        cp -a "$f" "$dest" 2>/dev/null || true
    done
fi
if [ -d "$EXTERNAL/raylib/lib" ]; then
    echo -e "${BLUE}[INFO]${NC} Copiando raylib vendorizado a $APPDIR/usr/lib..."
    for f in "$EXTERNAL/raylib/lib/"*; do
        [ -e "$f" ] || continue
        dest="$APPDIR/usr/lib/$(basename "$f")"
        if [ -e "$dest" ]; then
            continue
        fi
        cp -a "$f" "$dest" 2>/dev/null || true
    done
fi
# Función para copiar librerías y sus dependencias recursivamente
copy_libs() {
    local binary="$1"
    local dest="$2"
    local copied_libs="$3"
    
    # Obtener lista de librerías necesarias
    ldd "$binary" | grep '=>' | awk '{print $3}' | sort -u | while read lib; do
        if [ -f "$lib" ]; then
            local libname=$(basename "$lib")
            
            # Saltar librerías del sistema
            if echo "$SYSTEM_LIBS" | grep -q "$libname"; then
                echo "  Omitida (sistema): $libname"
                continue
            fi
            
            # Verificar si ya fue copiada
            if ! echo "$copied_libs" | grep -q "$libname"; then
                cp "$lib" "$dest/"
                echo "  Copiada: $libname"
                copied_libs="$copied_libs $libname"
                
                # Copiar dependencias de esta librería recursivamente
                copy_libs "$lib" "$dest" "$copied_libs"
            fi
        fi
    done
}

# Copiar librerías del binario principal
copied=''
copy_libs "$APPDIR/usr/bin/viewer" "$APPDIR/usr/lib" "$copied"

# Copiar librerías específicas de vips que pueden no aparecer en ldd
VIPS_LIBS=$(pkg-config --libs-only-L vips | sed 's/-L//g')
for lib_dir in $VIPS_LIBS; do
    if [ -d "$lib_dir" ]; then
        find "$lib_dir" -maxdepth 1 -name 'libvips*.so*' -exec cp {} "$APPDIR/usr/lib/" \; 2>/dev/null || true
    fi
done

echo -e "${GREEN}✓${NC} Dependencias copiadas"

# ============================================
# PASO 5: Crear AppRun
# ============================================
echo -e "\n${BLUE}[5/7]${NC} Creando AppRun..."

cat > "$APPDIR/AppRun" << 'EOF'
#!/bin/bash

SELF=$(readlink -f "$0")
HERE=${SELF%/*}

# Configurar rutas de librerías
export LD_LIBRARY_PATH="${HERE}/usr/lib:${LD_LIBRARY_PATH}"
export PATH="${HERE}/usr/bin:${PATH}"

# Configurar rutas de datos de la aplicación
export XDG_DATA_DIRS="${HERE}/usr/share:${XDG_DATA_DIRS}"

# Ejecutar la aplicación
exec "${HERE}/usr/bin/viewer" "$@"
EOF

chmod +x "$APPDIR/AppRun"

echo -e "${GREEN}✓${NC} AppRun creado"

# ============================================
# PASO 6: Generar AppImage
# ============================================
echo -e "\n${BLUE}[6/7]${NC} Generando AppImage..."

APPIMAGE_FILE="build/${APP_NAME}-${APP_VERSION}-x86_64.AppImage"

# Eliminar AppImage anterior si existe
rm -f "${APPIMAGE_FILE}"

# Asegurar que AppDir/usr/lib esté antes en LD_LIBRARY_PATH al ejecutar appimagetool
export LD_LIBRARY_PATH="$APPDIR/usr/lib:${LD_LIBRARY_PATH:-}"

# Generar AppImage
"$APPIMAGETOOL" "$APPDIR" "${APPIMAGE_FILE}"

# Dar permisos de ejecución
chmod +x "${APPIMAGE_FILE}"

echo -e "${GREEN}✓${NC} AppImage generado: ${APPIMAGE_FILE}"

# ============================================
# PASO 7: Verificar
# ============================================
echo -e "\n${BLUE}[7/7]${NC} Verificando AppImage..."

# Verificar que el archivo existe y tiene permisos de ejecución
if [ -f "${APPIMAGE_FILE}" ] && [ -x "${APPIMAGE_FILE}" ]; then
    echo -e "${GREEN}✓${NC} AppImage verificado correctamente"
else
    echo -e "${RED}[ERROR]${NC} El AppImage no se generó correctamente"
    exit 1
fi

# Mostrar información del archivo
echo ''
echo -e "${GREEN}=== AppImage creado exitosamente ===${NC}"
echo ''
echo -e "${BLUE}Archivo:${NC} $APPIMAGE_FILE"
echo -e "${BLUE}Tamaño:${NC} $(du -h "$APPIMAGE_FILE" | cut -f1)"
echo -e "${BLUE}Herramientas:${NC} $TOOLS_DIR"
echo ''
echo -e "${YELLOW}Para ejecutar:${NC}"
echo -e "  ./$APPIMAGE_FILE"
echo ''
echo -e "${YELLOW}Para instalar en el sistema:${NC}"
echo -e "  ./$APPIMAGE_FILE --install"
echo ''
echo -e "${YELLOW}Para limpiar herramientas de AppImage (liberar espacio):${NC}"
echo -e "  rm -rf $TOOLS_DIR"
echo ''
