# Manga Viewer - Proof of Concept

Visor de imágenes simple en C usando Raylib con scroll vertical y drag & drop de carpetas.

## Características

- 📁 **Drag & Drop de carpetas** - Arrastra una carpeta para cargar sus imágenes
- 🖱️ **Scroll vertical** - Rueda del ratón o arrastrar para navegar
- ⌨️ **Navegación por teclado** - Flechas, J/K, Page Up/Down, Home/End
- 🖼️ **Formatos soportados** - PNG, JPG, BMP, TGA, GIF, QOI, PSD, HDR

> **Nota**: AVIF y WebP requieren bibliotecas adicionales (stb_image no las soporta nativamente)

## Requisitos

### Windows
1. **GCC** - Recomendado: [w64devkit](https://github.com/skeeto/w64devkit/releases)
2. **Raylib** - [Descargar aquí](https://github.com/raysan5/raylib/releases)

### Linux
```bash
# Ubuntu/Debian
sudo apt install libraylib-dev

# Arch
sudo pacman -S raylib

# Fedora
sudo dnf install raylib-devel
```

### macOS
```bash
brew install raylib
```

## Compilación

### Windows
```batch
# Editar build.bat para ajustar RAYLIB_PATH
build.bat
```

### Linux/macOS
```bash
make
```

## Uso

```bash
# Windows
build\viewer.exe

# Linux/macOS
./viewer
```

1. Ejecutar el programa
2. Arrastrar una carpeta con imágenes a la ventana
3. Navegar con scroll o teclado

## Controles

| Acción | Tecla/Ratón |
|--------|-------------|
| Scroll | Rueda del ratón |
| Arrastrar | Click izquierdo + mover |
| Scroll lento | ↑/↓ o J/K |
| Scroll rápido | Page Up/Down |
| Inicio/Fin | Home/End |
| Salir | ESC |

## Estructura

```
visor-c/
├── main.c          # Código principal
├── build.bat       # Script de compilación Windows
├── Makefile        # Makefile para Linux/macOS
└── README.md       # Este archivo
```

## TODO

- [ ] Soporte AVIF (requiere libavif)
- [ ] Soporte WebP (requiere libwebp)
- [ ] Zoom con Ctrl+Scroll
- [ ] Modo de una imagen
- [ ] Precarga de imágenes
- [ ] Cache de texturas
