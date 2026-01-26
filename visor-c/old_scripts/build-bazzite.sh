#!/bin/bash

# Script para compilar dentro del contenedor de distrobox
# Este script ejecuta el build dentro del contenedor "development"

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONTAINER_NAME="development"

echo -e "${GREEN}=== Compilando dentro del contenedor $CONTAINER_NAME ===${NC}\n"

# Verificar que el contenedor existe
if ! distrobox list | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}[ERROR]${NC} El contenedor '$CONTAINER_NAME' no existe."
    echo -e "${YELLOW}Ejecuta primero: ./install.sh${NC}"
    exit 1
fi

# Obtener el directorio actual
PROJECT_DIR="$(pwd)"

echo -e "${BLUE}[INFO]${NC} Directorio del proyecto: $PROJECT_DIR"
echo -e "${BLUE}[INFO]${NC} Ejecutando build dentro del contenedor...\n"

# Ejecutar el build dentro del contenedor
# El contenedor tiene acceso al sistema de archivos del host
distrobox enter "$CONTAINER_NAME" -- bash -c "
    set -e
    cd '$PROJECT_DIR'
    
    # Ejecutar el script de build
    if [ -f './build-ubuntu.sh' ]; then
        echo 'Ejecutando ./build-ubuntu.sh...'
        bash ./build-ubuntu.sh
    else
        echo 'Error: No se encontró ./build-ubuntu.sh en el directorio actual'
        exit 1
    fi
"

echo -e "\n${GREEN}=== Build completado ===${NC}"
