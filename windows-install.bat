@echo off
REM =============================================
REM Windows Dependencies Installer
REM =============================================
REM This script installs all dependencies needed to build and run
REM C projects on Windows using MSYS2/MinGW.
REM
REM Prerequisites:
REM - MSYS2 installed (https://www.msys2.org/)
REM - Go installed (https://golang.org/dl/)
REM - Node.js installed (https://nodejs.org/)
REM =============================================

setlocal enabledelayedexpansion

echo ============================================
echo Windows Dependencies Installer
echo ============================================
echo.

REM Check if MSYS2 is installed
set MSYS2_PATH=C:\msys64
if not exist "%MSYS2_PATH%\usr\bin\bash.exe" (
    echo ERROR: MSYS2 not found at %MSYS2_PATH%
    echo Please install MSYS2 from https://www.msys2.org/
    pause
    exit /b 1
)
echo [OK] MSYS2 found at %MSYS2_PATH%
echo.

REM Check if Go is installed
where go >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Go not found in PATH
    echo Please install Go from https://golang.org/dl/
    pause
    exit /b 1
)
for /f "tokens=3" %%i in ('go version') do set GO_VERSION=%%i
echo [OK] Go found: %GO_VERSION%
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%
echo.

REM Check if npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm not found in PATH
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm found: %NPM_VERSION%
echo.

echo ============================================
echo  Installing MSYS2/MinGW Dependencies
echo ============================================
echo.

REM List of MSYS2 packages to install
set PACKAGES=mingw-w64-x86_64-gcc
set PACKAGES=%PACKAGES% mingw-w64-x86_64-libvips
set PACKAGES=%PACKAGES% mingw-w64-x86_64-raylib
set PACKAGES=%PACKAGES% mingw-w64-x86_64-pkg-config
set PACKAGES=%PACKAGES% mingw-w64-x86_64-make
set PACKAGES=%PACKAGES% mingw-w64-x86_64-gcc-libs
set PACKAGES=%PACKAGES% mingw-w64-x86_64-pcre2
REM Additional dependencies for portable/installer builds
set PACKAGES=%PACKAGES% mingw-w64-x86_64-binutils
set PACKAGES=%PACKAGES% mingw-w64-x86_64-libjpeg-turbo
set PACKAGES=%PACKAGES% mingw-w64-x86_64-libpng
set PACKAGES=%PACKAGES% mingw-w64-x86_64-libtiff
set PACKAGES=%PACKAGES% mingw-w64-x86_64-libwebp
REM AVIF format support and dependencies
set PACKAGES=%PACKAGES% mingw-w64-x86_64-libheif
set PACKAGES=%PACKAGES% mingw-w64-x86_64-libavif
set PACKAGES=%PACKAGES% mingw-w64-x86_64-aom
set PACKAGES=%PACKAGES% mingw-w64-x86_64-dav1d
REM HEIF/HEIC format support (HEVC codecs)
set PACKAGES=%PACKAGES% mingw-w64-x86_64-libde265
set PACKAGES=%PACKAGES% mingw-w64-x86_64-x265
REM Additional vips dependencies
set PACKAGES=%PACKAGES% mingw-w64-x86_64-glib2
set PACKAGES=%PACKAGES% mingw-w64-x86_64-libffi
set PACKAGES=%PACKAGES% mingw-w64-x86_64-zlib
REM Additional dependencies for vips plugins
set PACKAGES=%PACKAGES% mingw-w64-x86_64-fftw
set PACKAGES=%PACKAGES% mingw-w64-x86_64-expat

echo Installing packages:
echo   - mingw-w64-x86_64-gcc (C compiler)
echo   - mingw-w64-x86_64-libvips (Image processing library)
echo   - mingw-w64-x86_64-raylib (Graphics library)
echo   - mingw-w64-x86_64-pkg-config (Package configuration tool)
echo   - mingw-w64-x86_64-make (Build automation tool)
echo   - mingw-w64-x86_64-gcc-libs (GCC runtime libraries)
echo   - mingw-w64-x86_64-pcre2 (Regular expression library)
echo   - mingw-w64-x86_64-binutils (Binary utilities for objdump)
echo   - mingw-w64-x86_64-libjpeg-turbo (JPEG image format support)
echo   - mingw-w64-x86_64-libpng (PNG image format support)
echo   - mingw-w64-x86_64-libtiff (TIFF image format support)
echo   - mingw-w64-x86_64-libwebp (WebP image format support)
echo   - mingw-w64-x86_64-libheif (HEIF/HEIC image format support)
echo   - mingw-w64-x86_64-libavif (AVIF image format support)
echo   - mingw-w64-x86_64-aom (AV1 codec for AVIF encoding/decoding)
echo   - mingw-w64-x86_64-dav1d (AV1 decoder for AVIF)
echo   - mingw-w64-x86_64-libde265 (HEVC decoder for HEIF/HEIC)
echo   - mingw-w64-x86_64-x265 (HEVC encoder for HEIF/HEIC)
echo   - mingw-w64-x86_64-glib2 (GLib library for vips)
echo   - mingw-w64-x86_64-libffi (Foreign Function Interface)
echo   - mingw-w64-x86_64-zlib (Compression library)
echo   - mingw-w64-x86_64-fftw (Fast Fourier Transform library for vips)
echo   - mingw-w64-x86_64-expat (XML parsing library for vips)
echo.

REM Install packages using pacman
echo Running pacman -S %PACKAGES% --noconfirm...
"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pacman -S %PACKAGES% --noconfirm"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install MSYS2 packages
    pause
    exit /b 1
)
echo.
echo [OK] MSYS2 packages installed successfully
echo.

echo ============================================
echo  Installing Wails CLI
echo ============================================
echo.

REM Check if wails is already installed
where wails >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('wails version') do set WAILS_VERSION=%%i
    echo [OK] Wails CLI already installed: %WAILS_VERSION%
    echo.
    goto :install_frontend
)

echo Installing Wails CLI...
go install github.com/wailsapp/wails/v2/cmd/wails@latest
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install Wails CLI
    echo Please make sure Go is properly installed
    pause
    exit /b 1
)
echo [OK] Wails CLI installed successfully
echo.

:install_frontend
echo ============================================
echo  Installing Frontend Dependencies
echo ============================================
echo.

REM Check if frontend directory exists
if not exist "frontend" (
    echo ERROR: frontend directory not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

echo Running npm install in frontend directory...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend dependencies installed successfully
echo.

echo ============================================
echo  Installing Go Dependencies
echo ============================================
echo.

echo Running go mod download...
go mod download
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to download Go dependencies
    pause
    exit /b 1
)
echo [OK] Go dependencies downloaded successfully
echo.

echo ============================================
echo  Verifying Installation
echo ============================================
echo.

REM Verify pkg-config
"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pkg-config --version" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pkg-config --version"') do set PKG_CONFIG_VERSION=%%i
    echo [OK] pkg-config: %PKG_CONFIG_VERSION%
) else (
    echo [WARNING] pkg-config not found
)

REM Verify vips
"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pkg-config --modversion vips" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pkg-config --modversion vips"') do set VIPS_VERSION=%%i
    echo [OK] libvips: %VIPS_VERSION%
) else (
    echo [WARNING] libvips not found
)

REM Verify raylib
"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pkg-config --modversion raylib" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pkg-config --modversion raylib"') do set RAYLIB_VERSION=%%i
    echo [OK] raylib: %RAYLIB_VERSION%
) else (
    echo [WARNING] raylib not found
)

REM Verify gcc
"%MSYS2_PATH%\mingw64\bin\gcc.exe" --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=2" %%i in ('"%MSYS2_PATH%\mingw64\bin\gcc.exe" --version ^| findstr /i "gcc"') do set GCC_VERSION=%%i
    echo [OK] GCC: %GCC_VERSION%
) else (
    echo [WARNING] GCC not found
)

REM Verify objdump (needed for portable build)
"%MSYS2_PATH%\mingw64\bin\objdump.exe" --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=3" %%i in ('"%MSYS2_PATH%\mingw64\bin\objdump.exe" --version ^| findstr /i "objdump"') do set OBJDUMP_VERSION=%%i
    echo [OK] objdump: %OBJDUMP_VERSION%
) else (
    echo [WARNING] objdump not found (needed for portable build)
)

REM Verify image format libraries
"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pkg-config --modversion libjpeg" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pkg-config --modversion libjpeg"') do set LIBJPEG_VERSION=%%i
    echo [OK] libjpeg: %LIBJPEG_VERSION%
) else (
    echo [WARNING] libjpeg not found
)

"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pkg-config --modversion libpng" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pkg-config --modversion libpng"') do set LIBPNG_VERSION=%%i
    echo [OK] libpng: %LIBPNG_VERSION%
) else (
    echo [WARNING] libpng not found
)

"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pkg-config --modversion libwebp" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pkg-config --modversion libwebp"') do set LIBWEBP_VERSION=%%i
    echo [OK] libwebp: %LIBWEBP_VERSION%
) else (
    echo [WARNING] libwebp not found
)

"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pkg-config --modversion libheif" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('"%MSYS2_PATH%\usr\bin\bash.exe" -lc "pkg-config --modversion libheif"') do set LIBHEIF_VERSION=%%i
    echo [OK] libheif: %LIBHEIF_VERSION%
) else (
    echo [WARNING] libheif not found
)

REM Verify AVIF codec libraries
if exist "%MSYS2_PATH%\mingw64\bin\libaom.dll" (
    echo [OK] libaom (AV1 codec)
) else (
    echo [WARNING] libaom not found
)

if exist "%MSYS2_PATH%\mingw64\bin\libdav1d-*.dll" (
    echo [OK] libdav1d (AV1 decoder)
) else (
    echo [WARNING] libdav1d not found
)

REM Verify HEVC codec libraries
if exist "%MSYS2_PATH%\mingw64\bin\libde265.dll" (
    echo [OK] libde265 (HEVC decoder)
) else (
    echo [WARNING] libde265 not found
)

if exist "%MSYS2_PATH%\mingw64\bin\libx265.dll" (
    echo [OK] libx265 (HEVC encoder)
) else (
    echo [WARNING] libx265 not found
)

REM Verify AVIF support is working
echo.
echo Checking AVIF support...
"%MSYS2_PATH%\usr\bin\bash.exe" -lc "vips -l 2>/dev/null | grep -i avif" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] AVIF support is enabled
) else (
    echo [WARNING] AVIF support may not be fully enabled
    echo         Run: pacman -S mingw-w64-x86_64-libheif --needed
)

echo.
echo ============================================
echo  Installation Complete!
echo ============================================
echo.
echo You can now build the project:
echo.
echo   - Build the C viewer:       .\visor-c\build.bat
echo   - Build portable version:   .\visor-c\build-portable.bat
echo   - Build installer version:  .\visor-c\build-installer.bat
echo   - Build Wails app:          wails build
echo   - Run Wails dev mode:       wails dev
echo.
echo Note: For building the installer version, you need to install NSIS
echo       from https://nsis.sourceforge.io/Download
echo.
echo ============================================
echo.

pause
