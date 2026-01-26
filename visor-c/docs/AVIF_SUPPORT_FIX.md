# AVIF Support Fix for Manga Viewer

## Problem

The manga viewer fails to load AVIF images with the error:
```
VIPS Error: VipsForeignLoad: "...avif" is not a known file format
```

## Root Cause

The issue occurs when the `libheif` package is missing from MSYS2. The `vips-heif.dll` plugin (which handles AVIF files) cannot load without this dependency.

## Solution

Simply install the missing package:

```bash
# In MSYS2 MinGW 64-bit terminal
pacman -S mingw-w64-x86_64-libheif
```

Then rebuild the viewer:

```cmd
# In Windows Command Prompt
cd visor-c
build.bat
```

## Verification

To verify AVIF support is working:

```bash
# In MSYS2 MinGW 64-bit terminal
vips -l | findstr /i avif
```

You should see:
```
VipsForeignLoadHeifFile (heifload), load a HEIF image (.heic, .heif, .avif), priority=0, is_a, get_flags, header, load
```

## Required Packages

For AVIF support, ensure these packages are installed:

```bash
pacman -S mingw-w64-x86_64-vips
pacman -S mingw-w64-x86_64-libheif
pacman -S mingw-w64-x86_64-libavif
pacman -S mingw-w64-x86_64-aom
pacman -S mingw-w64-x86_64-dav1d
```

## Troubleshooting

### "VIPS-WARNING: unable to load vips-heif.dll"

This warning indicates that `libheif.dll` is missing. Install it with:
```bash
pacman -S mingw-w64-x86_64-libheif
```

### AVIF files still not loading after installing libheif

1. Verify the installation:
   ```bash
   dir C:\msys64\mingw64\bin\libheif*.dll
   ```

2. Check that vips can load the HEIF plugin:
   ```bash
   vips -l | findstr /i heif
   ```

3. Rebuild the viewer:
   ```cmd
   build.bat
   ```

## Notes

- AVIF support is handled by the `vips-heif.dll` plugin
- The plugin requires `libheif.dll` to function
- On Linux, these packages are typically installed by default
- On Windows, you may need to install them manually via pacman

## Quick Check Script

Run [`check-avif-support.bat`](../check-avif-support.bat) to verify your AVIF support status.
