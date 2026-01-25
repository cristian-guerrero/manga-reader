@echo off
REM Download dependencies for visor-c WITHOUT MSYS2 using curl
REM This script only downloads the required dependencies

echo ============================================
echo  Downloading Dependencies
echo ============================================
echo.

REM Create directories
if not exist "deps" mkdir deps
if not exist "deps\raylib" mkdir deps\raylib
if not exist "deps\vips" mkdir deps\vips

REM ============================================
REM Step 1: Download Raylib
REM ============================================
echo Step 1: Downloading Raylib 5.5.0...
echo.

set RAYLIB_URL=https://sourceforge.net/projects/raylib.mirror/files/4.5.0/raylib-4.5.0_win64_mingw-w64.zip/download
set RAYLIB_ZIP=deps\raylib-4.5.0.zip

curl -L -o "%RAYLIB_ZIP%" "%RAYLIB_URL%"

if not exist "%RAYLIB_ZIP%" (
    echo ERROR: Failed to download Raylib
    exit /b 1
)

echo Raylib downloaded: %RAYLIB_ZIP%
echo.

REM ============================================
REM Step 2: Download libvips (WITH ALL DEPENDENCIES)
REM ============================================
echo Step 2: Downloading libvips 8.18.0 (with all dependencies)...
echo.

set VIPS_URL=https://github.com/libvips/build-win64-mxe/releases/download/v8.18.0/vips-dev-w64-all-8.18.0.zip
set VIPS_ZIP=deps\vips-8.18.0-all.zip

curl -L -o "%VIPS_ZIP%" "%VIPS_URL%"

if not exist "%VIPS_ZIP%" (
    echo ERROR: Failed to download libvips
    exit /b 1
)

echo libvips downloaded: %VIPS_ZIP%
echo.

REM ============================================
REM Step 3: Extract files
REM ============================================
echo Step 3: Extracting files...
echo.

REM Delete old directories if they exist
if exist "deps\raylib\raylib.h" (
    echo Removing old Raylib installation...
    rmdir /s /q deps\raylib
)

if exist "deps\vips\include\vips\vips.h" (
    echo Removing old libvips installation...
    rmdir /s /q deps\vips
)

REM Create directories again
if not exist "deps\raylib" mkdir deps\raylib
if not exist "deps\vips" mkdir deps\vips

REM Extract Raylib
echo Extracting Raylib...
powershell -ExecutionPolicy Bypass -File "extraer-zips.ps1" -raylibZipPath "%RAYLIB_ZIP%" -vipsZipPath "%VIPS_ZIP%"

if not exist "deps\raylib\include\raylib.h" (
    echo ERROR: Failed to extract Raylib
    echo Please extract manually: %RAYLIB_ZIP%
    exit /b 1
)

REM Extract libvips
echo Extracting libvips...
powershell -Command "Expand-Archive -Path '%VIPS_ZIP%' -DestinationPath 'deps\vips' -Force"

if not exist "deps\vips\include\vips\vips.h" (
    echo ERROR: Failed to extract libvips
    echo Please extract manually: %VIPS_ZIP%
    exit /b 1
)

echo.
echo ============================================
echo  Extraction Complete!
echo ============================================
echo.
echo Raylib: deps\raylib\
echo libvips: deps\vips\
echo.
echo Now run: build-without-msys2.bat to compile visor-c
echo ============================================