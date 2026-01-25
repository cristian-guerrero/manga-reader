# Compilar visor-c sin MSYS2

## Estado Actual ✅ **FUNCIONANDO**

✅ **Compilación completa sin MSYS2** - 100% funcional
✅ **Build Portable automático** - Genera ZIP listo para distribuir
✅ **Installer NSIS automático** - Genera instalador EXE
✅ **Descarga automática de dependencias** - Sin intervención manual

---

## Quick Start

### Opción 1: Compilar solo (build-all-auto-without-msys2.bat)
```bash
cd visor-c
.\build-all-auto-without-msys2.bat
```

Resultado: `build\viewer.exe` (ejecutable compilado)

---

### Opción 2: Compilar + Portable ZIP (build-all-portable-auto.bat)
```bash
cd visor-c
.\build-all-portable-auto.bat
```

Resultado: `build\MangaViewer-1.0.0-portable.zip` (listo para distribuir)

---

### Opción 3: Compilar + Installer EXE (build-all-auto-installer.ps1)
```powershell
cd visor-c
.\build-all-auto-installer.ps1
```

Resultado: `build\MangaViewer-1.0.0-setup.exe` (instalador NSIS)

---

## Cómo Funciona

### 1. Descarga de Dependencias (`download-deps-curl.bat`)
- Descarga Raylib 5.5.0
- Descarga libvips 8.18.0 (con TODAS las dependencias incluidas)
- Extrae automáticamente en carpeta `deps\`
- Verifica si ya existe para evitar descargas duplicadas

### 2. Compilación (`build-all-auto-without-msys2.bat`)
- Usa gcc de tu instalación actual (TDM-GCC o MinGW)
- Compila contra las dependencias descargadas
- Genera `build\viewer.exe` optimizado

### 3. Empaquetado Portable (`build-all-portable-auto.bat`)
- Reutiliza la compilación anterior
- Copia ejecutable + DLLs necesarios
- Genera ZIP para distribución

### 4. Installer NSIS (`build-all-auto-installer.ps1`)
- Reutiliza la compilación anterior
- Prepara archivos para NSIS
- Genera instalador EXE con desinstalador

---

## Dependencias del Sistema

### Requeridas
- **gcc** - Compilador (TDM-GCC, MinGW, o similar)
- **PowerShell** - Para algunos scripts
- **curl** - Para descargar dependencias

### Opcionales
- **NSIS** - Solo si quieres crear installer EXE
  - Descargar: https://nsis.sourceforge.io/Download
  - Instalar en: `C:\Program Files (x86)\NSIS\` (por defecto)

---

## Estructura de Dependencias

```
deps/
├── raylib-4.5.0.zip          ← Descargado automáticamente
├── raylib/                    ← Extraído automáticamente
│   ├── include/
│   ├── lib/
│   └── bin/
├── vips-8.18.0-all.zip        ← Descargado automáticamente (CON TODAS LAS DEPS)
└── vips/                      ← Extraído automáticamente
    ├── include/
    ├── lib/
    └── bin/
```

### ¿Por qué `vips-dev-w64-all-8.18.0.zip`?

Este paquete incluye **TODAS las dependencias necesarias**:
- ✅ glib
- ✅ gobject
- ✅ gio
- ✅ zlib
- ✅ expat
- ✅ libffi
- ✅ Y muchas más

**Alternativa (NO recomendada):** `vips-dev-w64-web-8.18.0.zip` - solo formatos básicos, sin glib

---

## Scripts Disponibles

| Script | Propósito | Salida |
|--------|----------|--------|
| `download-deps-curl.bat` | Descargar y extraer dependencias | `deps/` |
| `build-all-auto-without-msys2.bat` | Compilar aplicación | `build/viewer.exe` |
| `build-all-portable-auto.bat` | Compilar + ZIP portable | `build/MangaViewer-*.zip` |
| `build-all-auto-installer.ps1` | Compilar + Installer NSIS | `build/MangaViewer-*-setup.exe` |
| `build-installer.ps1` | Original (referencia) | - |

---

## Troubleshooting

### Error: "No DLLs found"
**Causa:** Los DLLs no están donde el script espera
**Solución:**
```powershell
# Verificar estructura
dir deps\vips\lib\
dir deps\vips\bin\
dir deps\raylib\lib\
```

### Error: "gcc not found"
**Causa:** Compilador no en PATH
**Solución:**
```bash
# Verificar si gcc existe
gcc --version

# O instalar TDM-GCC: https://jmeubank.github.io/tdm-gcc/
```

### Error: "makensis not found" (solo NSIS)
**Causa:** NSIS no instalado
**Solución:**
```bash
# Descargar e instalar NSIS
# https://nsis.sourceforge.io/Download

# O instalar en path personalizado editando build-all-auto-installer.ps1
```

### La aplicación no encuentra DLLs al ejecutar
**Causa:** Los DLLs deben estar en el mismo directorio que el ejecutable
**Solución:**
- Portable: Extraer el ZIP
- Installer: Ejecutar el instalador
- Manual: Copiar DLLs al mismo directorio que viewer.exe

---

## Opciones Alternativas

### ✅ Opción 1: RECOMENDADA (Este proceso)
- Tiempo: 10-15 minutos
- Complejidad: Baja
- Requisitos: gcc + curl
- Resultado: Ejecutable + Portable + Installer

### Opción 2: Instalar MSYS2 (Oficial)
- Tiempo: 20-30 minutos
- Complejidad: Media
- Requisitos: 3GB espacio
- Descargar: https://www.msys2.org/

### Opción 3: Compilar sin libvips (Reducido)
- Tiempo: 5 minutos
- Complejidad: Baja
- Requisitos: gcc
- Limitación: Solo PNG/JPG, sin AVIF/WebP/HEIC

### Opción 4: WSL (Linux en Windows)
- Resultado: Ejecutable Linux, no Windows

---

## Formatos Soportados

Con esta configuración (`vips-dev-w64-all`), soportas:

✅ PNG
✅ JPEG
✅ AVIF
✅ WebP
✅ HEIC/HEIF
✅ TIFF
✅ JXL
✅ BMP
✅ Y más...

---

## Ejemplos de Uso

### Compilar y distribuir como ZIP
```bash
cd visor-c
.\build-all-portable-auto.bat
# Resultado: build\MangaViewer-1.0.0-portable.zip
# Enviado a usuarios
```

### Compilar y crear installer
```powershell
cd visor-c
.\build-all-auto-installer.ps1
# Resultado: build\MangaViewer-1.0.0-setup.exe
# Usuarios lo ejecutan para instalar
```

### Solo compilar (desarrollo)
```bash
cd visor-c
.\build-all-auto-without-msys2.bat
# Resultado: build\viewer.exe
# Ejecutar directamente
```

---

## Conclusión

**¡Compilar sin MSYS2 es completamente viable y funcional!**

Los scripts automatizados hacen el proceso trivial:
1. Descargan dependencias precompiladas con TODAS las libs necesarias
2. Compilan la aplicación
3. Generan paquetes listos para distribuir (ZIP o EXE)

**Todo esto sin instalar MSYS2 ni nada adicional más que gcc.**

---

## Enlaces Útiles

- **Raylib**: https://github.com/raysan5/raylib/releases
- **libvips**: https://github.com/libvips/libvips/releases
- **libvips Binaries (RECOMENDADO)**: https://github.com/libvips/build-win64-mxe/releases
  - Usar: `vips-dev-w64-all-8.18.0.zip` ✅
- **NSIS**: https://nsis.sourceforge.io/Download
- **TDM-GCC**: https://jmeubank.github.io/tdm-gcc/
- **MSYS2**: https://www.msys2.org/
