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
- 📐 **Diseño Responsivo**: Las imágenes se centran o escalan automáticamente según el tamaño de la ventana.
- 💾 **Persistencia de Configuración**: Guarda automáticamente posición, tamaño de ventana y ajustes de scroll.
- 🖥️ **Multi-Monitor**: Valida la posición guardada contra monitores disponibles al iniciar.

## Configuración Persistente

El visor guarda automáticamente la configuración en:
- **Windows**: `%APPDATA%\.manga-visor\config.ini`
- **Linux**: `~/.manga-visor/config.ini`

Se guardan:
- Posición y tamaño de la ventana
- Suavizado de scroll (Smooth)
- Velocidad de auto-scroll (Speed)

## Requisitos (Windows - MSYS2)

1. **MSYS2 / MinGW-w64**: Compilador GCC
   ```bash
   # Instalar MSYS2 desde https://www.msys2.org/
   ```

2. **libvips**: Procesamiento de imágenes de alto rendimiento
   ```bash
   pacman -S mingw-w64-x86_64-vips
   ```

3. **Raylib**: Biblioteca gráfica
   ```bash
   pacman -S mingw-w64-x86_64-raylib
   ```

## Estructura del Proyecto

```
visor-c/
├── include/
│   └── types.h         # Estructuras de datos (Thread-safe)
├── src/
│   ├── main.c          # Punto de entrada y loop principal
│   ├── viewer.c        # Lógica de dibujo, hilos y Lazy Loading
│   ├── loader.c        # Interface con libvips
│   ├── input.c         # Gestión de teclado y ratón
│   ├── platform.c      # Abstracción de sistema (Windows/Linux)
│   ├── folder.c        # Escaneo y navegación de carpetas
│   └── config.c/h      # Persistencia de configuración
├── build.bat           # Script de compilación para Windows
└── README.md
```

## Controles

| Acción | Control |
|--------|---------|
| **Cargar Imágenes** | Arrastrar carpeta a la ventana |
| **Scroll** | Rueda del ratón / Arrastrar / J/K / ↑/↓ |
| **Navegar Carpeta** | Botones `<` `>` / ←/→ |
| **Auto-scroll** | Espacio o botón ▶ |
| **Salto Rápido** | Page Up / Page Down |
| **Inicio/Fin** | Home / End |
| **Ajustar Smooth** | Slider superior derecho |
| **Ajustar Speed** | Slider inferior derecho |
| **Salir** | ESC o cerrar ventana |

## Compilación

```bash
# Desde terminal con MinGW en PATH:
.\build.bat

# Ejecutables generados:
# build/viewer_debug.exe  (con consola para debug)
# build/viewer.exe        (sin consola, release)
```

## Uso

```bash
# Ejecutar el visor
.\build\viewer.exe

# Arrastrar una carpeta con imágenes a la ventana
# o arrastrar un archivo para cargar su carpeta padre
```

## Dependencias y Librerías

| Librería | Uso |
|----------|-----|
| **raylib** | Renderizado gráfico, ventana, input |
| **libvips** | Decodificación y redimensionado de imágenes |
| **shell32** | Rutas de sistema (Windows) |
| **gdi32, opengl32** | Gráficos (Windows) |

## Créditos

Desarrollado con Raylib y libvips. Focus en rendimiento extremo para lectura de Manga y colecciones masivas de imágenes.
