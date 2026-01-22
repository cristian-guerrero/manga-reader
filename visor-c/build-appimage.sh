#!/bin/bash

# Script para compilar y crear un AppImage de visor-c dentro del contenedor de distrobox
# Este script genera un AppImage autocontenido que funciona en cualquier distribución Linux

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONTAINER_NAME="development"
APP_NAME="MangaViewer"
APP_VERSION="1.0.0"
PROJECT_DIR="$(pwd)"

echo -e "${GREEN}=== Creando AppImage de $APP_NAME ===${NC}\n"

# Verificar que el contenedor existe
if ! distrobox list | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}[ERROR]${NC} El contenedor '$CONTAINER_NAME' no existe."
    exit 1
fi

echo -e "${BLUE}[INFO]${NC} Directorio del proyecto: $PROJECT_DIR"
echo -e "${BLUE}[INFO]${NC} Ejecutando build y creación de AppImage dentro del contenedor...\n"

# Ejecutar todo el proceso dentro del contenedor
distrobox enter "$CONTAINER_NAME" -- bash -c "
    set -e
    
    cd '$PROJECT_DIR'
    
    # ============================================
    # PASO 1: Compilar el binario
    # ============================================
    echo -e '${BLUE}[1/5]${NC} Compilando binario...'
    
    mkdir -p build
    
    SOURCES='src/main.c src/config.c src/folder.c src/input.c src/loader.c src/platform.c src/viewer.c'
    INCLUDE='-Iinclude'
    
    # Compilar versión release con optimizaciones
    gcc \$(pkg-config --cflags vips) \\
        \$INCLUDE \\
        -o build/viewer \$SOURCES \\
        \$(pkg-config --libs vips) \\
        -lraylib -lGL -lm -lpthread -ldl -lrt -lX11 \\
        -O3 -DNDEBUG
    
    echo -e '${GREEN}✓${NC} Binario compilado exitosamente'
    
    # ============================================
    # PASO 2: Usar herramientas de AppImage instaladas
    # ============================================
    echo -e '${BLUE}[2/5]${NC} Verificando herramientas de AppImage...'
    
    # Usar herramientas instaladas en /opt/appimage-tools
    APPIMAGE_TOOLS_DIR=/opt/appimage-tools
    
    if [ ! -d "\$APPIMAGE_TOOLS_DIR" ]; then
        echo -e '${RED}[ERROR]${NC} No se encontraron las herramientas de AppImage en \$APPIMAGE_TOOLS_DIR'
        echo -e '${YELLOW}[INFO]${NC} Ejecuta ./bazzite/install.sh para instalarlas'
        exit 1
    fi
    
    if [ ! -f "\$APPIMAGE_TOOLS_DIR/linuxdeploy-x86_64.AppImage" ] || \\
       [ ! -f "\$APPIMAGE_TOOLS_DIR/appimagetool-x86_64.AppImage" ]; then
        echo -e '${RED}[ERROR]${NC} Faltan herramientas de AppImage en \$APPIMAGE_TOOLS_DIR'
        echo -e '${YELLOW}[INFO]${NC} Ejecuta ./bazzite/install.sh para instalarlas'
        exit 1
    fi
    
    echo -e '${GREEN}✓${NC} Herramientas de AppImage encontradas en \$APPIMAGE_TOOLS_DIR'
    
    # ============================================
    # PASO 3: Crear estructura AppDir
    # ============================================
    echo -e '${BLUE}[3/5]${NC} Creando estructura AppDir...'
    
    # Definir variables para el nombre de la aplicación
    APP_NAME='MangaViewer'
    APP_VERSION='1.0.0'
    
    rm -rf AppDir
    mkdir -p AppDir/usr/bin
    mkdir -p AppDir/usr/share/applications
    mkdir -p AppDir/usr/share/icons/hicolor/256x256/apps
    mkdir -p AppDir/usr/share/icons/hicolor/512x512/apps
    
    # Copiar binario
    cp build/viewer AppDir/usr/bin/viewer
    chmod +x AppDir/usr/bin/viewer
    
    # Crear archivo .desktop
    cat > AppDir/usr/share/applications/\${APP_NAME}.desktop << 'EOF'
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
    cp AppDir/usr/share/applications/\${APP_NAME}.desktop AppDir/\${APP_NAME}.desktop
    
    # Copiar icono (usar uno existente o crear uno genérico)
    if [ -f '../build/appicon.png' ]; then
        cp ../build/appicon.png AppDir/usr/share/icons/hicolor/256x256/apps/viewer.png
        cp ../build/appicon.png AppDir/usr/share/icons/hicolor/512x512/apps/viewer.png
        # Copiar icono a la raíz de AppDir (requerido por appimagetool)
        cp ../build/appicon.png AppDir/\${APP_NAME}.png
    else
        # Crear un icono simple si no existe
        echo -e '${YELLOW}[WARN]${NC} No se encontró icono, usando uno genérico'
    fi
    
    echo -e '${GREEN}✓${NC} Estructura AppDir creada'
    
    # ============================================
    # PASO 4: Copiar dependencias manualmente
    # ============================================
    echo -e '${BLUE}[4/5]${NC} Copiando dependencias...'
    
    mkdir -p AppDir/usr/lib
    
    # Librerías del sistema que NO deben copiarse (deben venir del host)
    SYSTEM_LIBS='libc.so.6 libm.so.6 libdl.so.2 libpthread.so.0 librt.so.1 ld-linux-x86-64.so.2 libstdc++.so.6 libgcc_s.so.1'
    
    # Función para copiar librerías y sus dependencias recursivamente
    copy_libs() {
        local binary=\"\$1\"
        local dest=\"\$2\"
        local copied_libs=\"\$3\"
        
        # Obtener lista de librerías necesarias
        ldd \"\$binary\" | grep '=>' | awk '{print \$3}' | sort -u | while read lib; do
            if [ -f \"\$lib\" ]; then
                local libname=\$(basename \"\$lib\")
                
                # Saltar librerías del sistema
                if echo \"\$SYSTEM_LIBS\" | grep -q \"\$libname\"; then
                    echo \"  Omitida (sistema): \$libname\"
                    continue
                fi
                
                # Verificar si ya fue copiada
                if ! echo \"\$copied_libs\" | grep -q \"\$libname\"; then
                    cp \"\$lib\" \"\$dest/\"
                    echo \"  Copiada: \$libname\"
                    copied_libs=\"\$copied_libs \$libname\"
                    
                    # Copiar dependencias de esta librería recursivamente
                    copy_libs \"\$lib\" \"\$dest\" \"\$copied_libs\"
                fi
            fi
        done
    }
    
    # Copiar librerías del binario principal
    copied=''
    copy_libs AppDir/usr/bin/viewer AppDir/usr/lib \"\$copied\"
    
    # Copiar librerías específicas de vips que pueden no aparecer en ldd
    VIPS_LIBS=\$(pkg-config --libs-only-L vips | sed 's/-L//g')
    for lib_dir in \$VIPS_LIBS; do
        if [ -d \"\$lib_dir\" ]; then
            find \"\$lib_dir\" -maxdepth 1 -name 'libvips*.so*' -exec cp {} AppDir/usr/lib/ \\; 2>/dev/null || true
        fi
    done
    
    echo -e '${GREEN}✓${NC} Dependencias copiadas'
    
    # ============================================
    # PASO 5: Crear AppRun
    # ============================================
    echo -e '${BLUE}[5/5]${NC} Creando AppRun...'
    
    cat > AppDir/AppRun << 'EOF'
#!/bin/bash

SELF=\$(readlink -f \"\$0\")
HERE=\${SELF%/*}

# Configurar rutas de librerías
export LD_LIBRARY_PATH=\"\${HERE}/usr/lib:\${LD_LIBRARY_PATH}\"
export PATH=\"\${HERE}/usr/bin:\${PATH}\"

# Configurar rutas de datos de la aplicación
export XDG_DATA_DIRS=\"\${HERE}/usr/share:\${XDG_DATA_DIRS}\"

# Ejecutar la aplicación
exec \"\${HERE}/usr/bin/viewer\" \"\$@\"
EOF
    
    chmod +x AppDir/AppRun
    
    echo -e '${GREEN}✓${NC} AppRun creado'
    
    # ============================================
    # PASO 6: Generar AppImage
    # ============================================
    echo -e '${BLUE}[6/6]${NC} Generando AppImage...'
    
    # Definir variables para el nombre del AppImage
    APP_NAME='MangaViewer'
    APP_VERSION='1.0.0'
    APPIMAGE_FILE=\"build/\${APP_NAME}-\${APP_VERSION}-x86_64.AppImage\"
    
    # Eliminar AppImage anterior si existe
    rm -f \"\${APPIMAGE_FILE}\"
    
    # Generar AppImage
    /opt/appimage-tools/appimagetool-x86_64.AppImage AppDir \"\${APPIMAGE_FILE}\"
    
    # Dar permisos de ejecución
    chmod +x \"\${APPIMAGE_FILE}\"
    
    echo -e '${GREEN}✓${NC} AppImage generado: \${APPIMAGE_FILE}'
    
    # ============================================
    # PASO 7: Verificar
    # ============================================
    echo ''
    echo -e '${GREEN}=== AppImage creado exitosamente ===${NC}'
    echo ''
    echo -e '${BLUE}Archivo:${NC} \$APPIMAGE_FILE'
    echo -e '${BLUE}Tamaño:${NC}' \$(du -h \"\$APPIMAGE_FILE\" | cut -f1)
    echo ''
    echo -e '${YELLOW}Para ejecutar:${NC}'
    echo -e '  ./\$APPIMAGE_FILE'
    echo ''
    echo -e '${YELLOW}Para instalar en el sistema:${NC}'
    echo -e '  ./\$APPIMAGE_FILE --install'
    echo ''
"

echo -e "\n${GREEN}=== Proceso completado ===${NC}"
