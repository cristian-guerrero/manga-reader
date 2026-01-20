# Manga Viewer - High Performance Image Viewer (C + Raylib + libvips)

Visor de imágenes de alto rendimiento escrito en C. Especializado en manejar carpetas con miles de imágenes de forma instantánea gracias a su arquitectura multi-hilo y carga dinámica.

## Características de Alto Rendimiento

- ⚡ **Inicio Instantáneo**: Escanea metadatos de miles de imágenes en milisegundos para pre-calcular el layout sin cargar texturas.
- 🧵 **Multithreading (Carga Asíncrona)**: Un hilo secundario dedicado procesa las imágenes en segundo plano. El scroll nunca se detiene (60 FPS constantes).
- 🖼️ **Carga Dinámica (Lazy Loading)**: Solo se cargan las texturas visibles o cercanas al área de visión.
- 🧠 **Gestión de VRAM**: Descarga automáticamente de la GPU las imágenes fuera de rango para mantener un consumo de memoria bajo y estable.
- 🚀 **Integración con libvips**: Utiliza `vips_thumbnail` para redimensionar imágenes de forma ultra-rápida directamente desde el disco.
- 📁 **Formatos Soportados**: PNG, JPG, **AVIF**, **WebP**, **HEIC**, **HEIF**, **JXL**, TIFF, BMP y más.

## Características UI/UX

- 📁 **Navegación entre Carpetas**: Detecta automáticamente carpetas hermanas y permite navegar entre ellas con `<` `>` o flechas.
- 🔡 **Fuente Integrada**: Incluye una fuente personalizada con soporte para caracteres latinos (ñ, tildes).
- 🎢 **Scroll Suave**: Control de suavidad de scroll ajustable dinámicamente.
- 🤖 **Auto-scroll**: Lectura manos libres con velocidad ajustable.

## Requisitos (Windows)

1. **MSYS2 / MinGW-w64**: Se requiere un compilador C (GCC).
2. **libvips**: Esencial para el procesamiento de imágenes. 
   - Instalar vía MSYS2: `pacman -S mingw-w64-x86_64-vips`
3. **Raylib**: Bibliotecas de desarrollo instaladas en el sistema.

## Estructura del Proyecto

El proyecto está modularizado para mayor claridad:

```
visor-c/
├── include/
│   ├── types.h         # Estructuras de datos (Thread-safe)
│   ├── font_data.h     # Fuente embebida
├── src/
│   ├── main.c          # Punto de entrada y loop principal
│   ├── viewer.c        # Lógica de dibujo, hilos y Lazy Loading
│   ├── loader.c        # Interface con libvips
│   ├── input.c         # Gestión de teclado y ratón
│   ├── platform.c      # Abstracción de sistema (Windows/Linux)
│   └── folder.c        # Escaneo y navegación de carpetas
├── build.bat           # Script de compilación para Windows
└── README.md
```

## Controles

| Acción | Control |
|--------|---------|
| **Scroll** | Rueda del ratón o Drag del área central |
| **Navegar Carpeta** | Botones UI o Flechas Izquierda/Derecha |
| **Auto-scroll** | Espacio (Toggle) |
| **Ajustes** | Sliders en el panel inferior derecho |
| **Salto Rápido** | Page Up / Page Down |
| **Inicio/Fin** | Home / End |
| **Salir** | ESC |

## Compilación

```batch
# En una terminal MSYS2 o con el PATH de MinGW configurado:
./build.bat
```

## Créditos
Desarrollado con Raylib y libvips. Focus en rendimiento extremo para lectura de Manga y colecciones masivas de imágenes.

