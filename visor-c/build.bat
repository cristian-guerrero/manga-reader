@echo off
REM Build script for Windows (MSYS2 MINGW64)
REM Requires: raylib and libvips installed via MSYS2 pacman
REM 
REM IMPORTANT: We compile main.c and loader.c separately to avoid
REM header conflicts between raylib and libvips (via glib -> windows.h)

REM Add MSYS2 MINGW64 to PATH
set PATH=C:\msys64\mingw64\bin;%PATH%

echo ============================================
echo  Manga Viewer - Build (Windows)
echo ============================================
echo.

REM Kill any running instances
taskkill /IM viewer_debug.exe /F >nul 2>&1
taskkill /IM viewer.exe /F >nul 2>&1

REM Check for pkg-config
where pkg-config >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: pkg-config not found.
    echo Make sure MSYS2 MINGW64 bin is in your PATH:
    echo   set PATH=C:\msys64\mingw64\bin;%%PATH%%
    echo.
    echo To install dependencies in MSYS2 MINGW64:
    echo   pacman -S mingw-w64-x86_64-gcc
    echo   pacman -S mingw-w64-x86_64-pkg-config
    echo   pacman -S mingw-w64-x86_64-raylib
    echo   pacman -S mingw-w64-x86_64-libvips
    exit /b 1
)

REM Create build directory
if not exist "build" mkdir build

echo Step 1: Compiling loader.c (libvips)...
for /f "delims=" %%i in ('pkg-config --cflags vips') do set VIPS_CFLAGS=%%i
gcc -c loader.c -o build/loader.o %VIPS_CFLAGS% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile loader.c
    exit /b 1
)

echo Step 2: Compiling main.c (raylib only)...
gcc -c main.c -o build/main.o -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile main.c
    exit /b 1
)

echo Step 3: Linking...
for /f "delims=" %%i in ('pkg-config --libs vips') do set VIPS_LIBS=%%i

REM Debug build (with console)
gcc build/main.o build/loader.o -o build/viewer_debug.exe %VIPS_LIBS% -lraylib -lgdi32 -lwinmm -lopengl32 -lpthread
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to link debug build
    exit /b 1
)

REM Release build (no console)
gcc build/main.o build/loader.o -o build/viewer.exe %VIPS_LIBS% -lraylib -lgdi32 -lwinmm -lopengl32 -lpthread -mwindows
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to link release build
    exit /b 1
)

echo.
echo ============================================
echo  BUILD SUCCESSFUL!
echo ============================================
echo Debug:   build\viewer_debug.exe
echo Release: build\viewer.exe
echo.

REM Cleanup object files
del build\main.o build\loader.o 2>nul
