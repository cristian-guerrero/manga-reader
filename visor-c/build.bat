@echo off
REM Build script for Windows (MSYS2 MINGW64)
REM Modular build: compiles each source file separately then links
REM Requires: raylib and libvips installed via MSYS2 pacman

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
    echo Make sure MSYS2 MINGW64 bin is in your PATH
    exit /b 1
)

REM Create build directory
if not exist "build" mkdir build

REM Include paths
set INCLUDES=-I./include -I./src

REM Get VIPS flags
for /f "delims=" %%i in ('pkg-config --cflags vips') do set VIPS_CFLAGS=%%i
for /f "delims=" %%i in ('pkg-config --libs vips') do set VIPS_LIBS=%%i

echo Step 1: Compiling loader.c (with libvips)...
gcc -c src/loader.c -o build/loader.o %VIPS_CFLAGS% %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile loader.c
    exit /b 1
)

echo Step 2: Compiling platform.c...
gcc -c src/platform.c -o build/platform.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile platform.c
    exit /b 1
)

echo Step 3: Compiling folder.c...
gcc -c src/folder.c -o build/folder.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile folder.c
    exit /b 1
)

echo Step 4: Compiling viewer.c...
gcc -c src/viewer.c -o build/viewer.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile viewer.c
    exit /b 1
)

echo Step 5: Compiling input.c...
gcc -c src/input.c -o build/input.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile input.c
    exit /b 1
)

echo Step 6: Compiling main.c...
gcc -c src/main.c -o build/main.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile main.c
    exit /b 1
)

echo Step 7: Linking...
set OBJECTS=build/main.o build/loader.o build/platform.o build/folder.o build/viewer.o build/input.o
set LIBS=%VIPS_LIBS% -lraylib -lgdi32 -lwinmm -lopengl32 -lpthread

REM Debug build (with console)
gcc %OBJECTS% -o build/viewer_debug.exe %LIBS%
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to link debug build
    exit /b 1
)

REM Release build (no console)
gcc %OBJECTS% -o build/viewer.exe %LIBS% -mwindows
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
del build\*.o 2>nul
