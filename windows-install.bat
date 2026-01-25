@echo off
REM =============================================
REM Windows Dependencies Installer
REM =============================================
REM This script installs all dependencies needed to build and run
REM C projects and Wails applications on Windows.
REM
REM This script will automatically:
REM - Detect and add Go (native or MSYS2) to PATH
REM - Detect and add Node.js (native or MSYS2) to PATH
REM - Add MSYS2/MinGW tools to PATH
REM - Install MSYS2/MinGW dependencies (if MSYS2 is present)
REM - Install Wails CLI
REM - Configure GOPATH and Wails in PATH
REM =============================================
REM  configuracion npm
REM  npm config set prefix "C:\Users\cristian\npm-global"


setlocal enabledelayedexpansion

echo ============================================
echo Windows Dependencies Installer
echo ============================================
echo.

REM ============================================
REM Go Installation
REM ============================================
echo ============================================
echo Checking Go Installation
echo ============================================
echo.

REM Check if Go is already in PATH
where go >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=3" %%i in ('go version') do set GO_VERSION=%%i
    echo [OK] Go found: %GO_VERSION%
    echo.
    goto :check_nodejs
)

REM Check if Go is installed but not in PATH (check common locations including MSYS2)
set GO_FOUND=0
set GO_POSSIBLE_PATHS=%LOCALAPPDATA%\Programs\Go;C:\Go;C:\Program Files\Go;C:\Program Files (x86)\Go;C:\msys64\mingw64\lib\go;C:\msys64\mingw64\bin

for %%P in (%GO_POSSIBLE_PATHS%) do (
    if exist "%%P\bin\go.exe" (
        set GO_FOUND=1
        set GO_PATH=%%P\bin
        echo [INFO] Go found at %%P\bin but not in PATH
        echo [INFO] Adding Go to PATH...
        reg add "HKCU\Environment" /v Path /t REG_EXPAND_SZ /d "%PATH%;%%P\bin" /f >nul 2>&1
        set "PATH=%PATH%;%%P\bin"
        for /f "tokens=3" %%i in ('go version') do set GO_VERSION=%%i
        echo [OK] Go added to PATH: %GO_VERSION%
        echo.
        goto :check_nodejs
    )
)

REM Go not found, install it
echo [INFO] Go not found in any common location
echo [INFO] Attempting to install Go automatically...
echo.

REM Set Go version and paths
set GO_VERSION=1.25.5
set GO_INSTALL_DIR=%LOCALAPPDATA%\Programs\Go
set GO_ZIP_URL=https://go.dev/dl/go%GO_VERSION%.windows-amd64.zip
set GO_ZIP_PATH=%TEMP%\go%GO_VERSION%.windows-amd64.zip

echo Downloading Go %GO_VERSION%...
echo   URL: %GO_ZIP_URL%
echo   Destination: %GO_INSTALL_DIR%
echo.

REM Check if PowerShell is available
where powershell >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PowerShell not found. Cannot download Go.
    echo Please install Go manually from https://golang.org/dl/
    pause
    exit /b 1
)

REM Download Go using PowerShell
powershell -Command "& {Invoke-WebRequest -Uri '%GO_ZIP_URL%' -OutFile '%GO_ZIP_PATH%'}"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to download Go
    echo Please download manually from: %GO_ZIP_URL%
    pause
    exit /b 1
)
echo [OK] Go downloaded successfully
echo.

REM Extract Go zip
echo Extracting Go to %GO_INSTALL_DIR%...
if not exist "%GO_INSTALL_DIR%" mkdir "%GO_INSTALL_DIR%"
powershell -Command "& {Expand-Archive -Path '%GO_ZIP_PATH%' -DestinationPath '%LOCALAPPDATA%' -Force}"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to extract Go
    pause
    exit /b 1
)

REM Cleanup zip file
del "%GO_ZIP_PATH%" >nul 2>&1

echo [OK] Go installed successfully at %GO_INSTALL_DIR%
echo.

REM Add Go to PATH permanently
echo Adding Go to PATH...
setx PATH "%PATH%;%GO_INSTALL_DIR%\bin" >nul 2>&1
set "PATH=%PATH%;%GO_INSTALL_DIR%\bin"

REM Also set GOPATH and GOROOT if not set
if not defined GOROOT setx GOROOT "%GO_INSTALL_DIR%" >nul 2>&1
if not defined GOPATH (
    setx GOPATH "%USERPROFILE%\go" >nul 2>&1
    set "GOPATH=%USERPROFILE%\go"
)

echo [OK] Go added to PATH
echo.
echo IMPORTANT: Close and reopen your terminal for PATH changes to take effect
echo.

:check_nodejs
echo ============================================
echo Checking Node.js Installation
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [OK] Node.js found: %NODE_VERSION%

    REM Check if npm is installed
    where npm >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] npm not found in PATH
    ) else (
        for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
        echo [OK] npm found: %NPM_VERSION%

        REM ============================================
        REM Configure npm global packages directory in PATH
        REM ============================================
        echo [INFO] Checking npm global packages directory...
        for /f "tokens=*" %%i in ('npm config get prefix') do set NPM_PREFIX=%%i
        set NPM_GLOBAL_BIN=%NPM_PREFIX%\bin

        echo [INFO] npm prefix: %NPM_PREFIX%
        echo [INFO] npm global bin: %NPM_GLOBAL_BIN%

        REM Check if npm global bin directory exists
        if exist "%NPM_GLOBAL_BIN%" (
            REM Check if already in PATH
            echo %PATH% | findstr /C:"%NPM_GLOBAL_BIN%" >nul 2>&1
            if %ERRORLEVEL% EQU 0 (
                echo [OK] npm global bin directory already in PATH
            ) else (
                echo [INFO] Adding npm global bin directory to PATH...
                reg add "HKCU\Environment" /v Path /t REG_EXPAND_SZ /d "%PATH%;%NPM_GLOBAL_BIN%" /f >nul 2>&1
                set "PATH=%PATH%;%NPM_GLOBAL_BIN%"
                echo [OK] npm global bin directory added to PATH
            )

            REM Show some installed global packages if any
            echo [INFO] Global npm packages available:
            if exist "%NPM_GLOBAL_BIN%\*.exe" (
                dir /b "%NPM_GLOBAL_BIN%\*.exe" 2>nul | findstr /v "." >nul 2>&1
                if !ERRORLEVEL! EQU 0 (
                    for %%f in ("%NPM_GLOBAL_BIN%\*.exe") do echo   - %%~nxf
                )
            ) else (
                echo   - (no global packages found)
            )
        ) else (
            echo [WARNING] npm global bin directory not found: %NPM_GLOBAL_BIN%
            echo [INFO] You may need to run: npm config set prefix %USERPROFILE%\npm-global
        )
    )
    echo.
    goto :check_msys2
)

REM Check if Node.js is installed but not in PATH (check common locations including MSYS2)
set NODE_FOUND=0
set NODE_POSSIBLE_PATHS=%LOCALAPPDATA%\Programs\nodejs;C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;C:\msys64\mingw64\bin

for %%P in (%NODE_POSSIBLE_PATHS%) do (
    if exist "%%P\node.exe" (
        set NODE_FOUND=1
        set NODE_PATH=%%P
        echo [INFO] Node.js found at %%P but not in PATH
        echo [INFO] Adding Node.js to PATH...
        reg add "HKCU\Environment" /v Path /t REG_EXPAND_SZ /d "%PATH%;%%P" /f >nul 2>&1
        set "PATH=%PATH%;%%P"
        for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
        echo [OK] Node.js added to PATH: %NODE_VERSION%

        REM Also check for npm in the same directory
        if exist "%%P\npm.cmd" (
            for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
            echo [OK] npm found: %NPM_VERSION%

            REM ============================================
            REM Configure npm global packages directory in PATH
            REM ============================================
            echo [INFO] Checking npm global packages directory...
            for /f "tokens=*" %%j in ('npm config get prefix') do set NPM_PREFIX=%%j
            set NPM_GLOBAL_BIN=%NPM_PREFIX%\bin

            echo [INFO] npm prefix: %NPM_PREFIX%
            echo [INFO] npm global bin: %NPM_GLOBAL_BIN%

            REM Check if npm global bin directory exists
            if exist "%NPM_GLOBAL_BIN%" (
                REM Check if already in PATH
                echo %PATH% | findstr /C:"%NPM_GLOBAL_BIN%" >nul 2>&1
                if %ERRORLEVEL% EQU 0 (
                    echo [OK] npm global bin directory already in PATH
                ) else (
                    echo [INFO] Adding npm global bin directory to PATH...
                    reg add "HKCU\Environment" /v Path /t REG_EXPAND_SZ /d "%PATH%;%NPM_GLOBAL_BIN%" /f >nul 2>&1
                    set "PATH=%PATH%;%NPM_GLOBAL_BIN%"
                    echo [OK] npm global bin directory added to PATH
                )

                REM Show some installed global packages if any
                echo [INFO] Global npm packages available:
                if exist "%NPM_GLOBAL_BIN%\*.exe" (
                    dir /b "%NPM_GLOBAL_BIN%\*.exe" 2>nul | findstr /v "." >nul 2>&1
                    if !ERRORLEVEL! EQU 0 (
                        for %%f in ("%NPM_GLOBAL_BIN%\*.exe") do echo   - %%~nxf
                    )
                ) else (
                    echo   - (no global packages found)
                )
            ) else (
                echo [WARNING] npm global bin directory not found: %NPM_GLOBAL_BIN%
                echo [INFO] You may need to run: npm config set prefix %USERPROFILE%\npm-global
            )
        )
        echo.
        goto :check_msys2
    )
)

echo [WARNING] Node.js not found in PATH or common locations
echo          Please install Node.js from https://nodejs.org/
echo          or install it with MSYS2: pacman -S mingw-w64-x86_64-nodejs
echo          This is optional for C projects but required for Wails
echo.

:check_msys2
echo ============================================
echo Checking MSYS2 Installation
echo ============================================
echo.

REM Check if MSYS2 is installed
set MSYS2_PATH=C:\msys64
if not exist "%MSYS2_PATH%\usr\bin\bash.exe" (
    echo [WARNING] MSYS2 not found at %MSYS2_PATH%
    echo          MSYS2 is optional if you only want to use Wails
    echo          Install MSYS2 from https://www.msys2.org/ for C projects
    echo.
    goto :install_wails
)
echo [OK] MSYS2 found at %MSYS2_PATH%
echo.

REM ============================================
REM Configure MSYS2 MinGW bin in PATH
REM ============================================
REM This adds C:\msys64\mingw64\bin to PATH
REM so tools like go, node, npm, gcc, etc. are available
echo ============================================
echo Configuring MSYS2 MinGW in PATH
echo ============================================
echo.

set MSYS2_BIN=%MSYS2_PATH%\mingw64\bin

REM Check if MSYS2 bin is already in PATH
echo %PATH% | findstr /C:"%MSYS2_BIN%" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] MSYS2 bin directory already in PATH
) else (
    echo Adding %MSYS2_BIN% to PATH...
    
    REM Add to PATH permanently (for current user)
    reg add "HKCU\Environment" /v Path /t REG_EXPAND_SZ /d "%PATH%;%MSYS2_BIN%" /f >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] MSYS2 bin directory added to PATH permanently
        echo [INFO] You may need to restart your terminal for changes to take effect
    ) else (
        echo [WARNING] Could not add MSYS2 bin to PATH automatically
        echo [INFO] You can add it manually: Add "%MSYS2_BIN%" to your PATH
    )
)

REM Add MSYS2 bin to current session PATH
set "PATH=%PATH%;%MSYS2_BIN%"
echo.
echo Tools now available from MSYS2:
if exist "%MSYS2_BIN%\go.exe" (
    for /f "tokens=3" %%i in ('go version 2^>nul') do echo   - Go: %%i
)
if exist "%MSYS2_BIN%\node.exe" (
    for /f "tokens=*" %%i in ('node --version 2^>nul') do echo   - Node.js: %%i
)
if exist "%MSYS2_BIN%\npm.cmd" (
    for /f "tokens=*" %%i in ('npm --version 2^>nul') do echo   - npm: %%i
)
if exist "%MSYS2_BIN%\gcc.exe" (
    echo   - GCC: (available)
)
echo.

echo ============================================
echo Installing MSYS2/MinGW Dependencies
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

:install_wails
echo ============================================
echo Installing Wails CLI
echo ============================================
echo.

REM Check if Go is available (it should be from earlier)
where go >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Go not found. Cannot install Wails.
    echo Please restart your terminal and run this script again.
    pause
    exit /b 1
)

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

REM Get Go GOPATH to find wails binary location
for /f "delims=" %%i in ('go env GOPATH') do set GOPATH=%%i
set WAILS_PATH=%GOPATH%\bin

echo [INFO] Go GOPATH: %GOPATH%
echo [INFO] Go bin: %WAILS_PATH%
echo.

REM Check if wails binary exists
if not exist "%WAILS_PATH%\wails.exe" (
    echo ERROR: wails.exe not found in %WAILS_PATH%
    pause
    exit /b 1
)

REM Check if Go bin is already in PATH
echo %PATH% | findstr /C:"%WAILS_PATH%" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Wails CLI installed successfully
    echo [INFO] Go bin directory already in PATH
    echo.
    goto :install_frontend
)

REM Add Go bin to PATH permanently (for current user)
echo [INFO] Adding Go bin directory to PATH...
reg add "HKCU\Environment" /v Path /t REG_EXPAND_SZ /d "%PATH%;%WAILS_PATH%" /f >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Go bin directory added to PATH
    echo [INFO] You may need to restart your terminal for changes to take effect
) else (
    echo [WARNING] Could not add Go bin to PATH automatically
    echo [INFO] You can add it manually: Add "%WAILS_PATH%" to your PATH
)
echo [OK] Wails CLI installed successfully
echo.

:install_frontend
echo ============================================
echo Installing Frontend Dependencies
echo ============================================
echo.

REM Check if Node.js is available
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Node.js not found. Skipping frontend dependencies.
    echo          Install Node.js from https://nodejs.org/ and run: npm install
    goto :install_go_deps
)

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

:install_go_deps
echo ============================================
echo Installing Go Dependencies
echo ============================================
echo.

REM Check if go.mod exists
if not exist "go.mod" (
    echo [WARNING] go.mod not found. Skipping Go dependencies.
    goto :verify_installation
)

echo Running go mod download...
go mod download
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to download Go dependencies
    pause
    exit /b 1
)
echo [OK] Go dependencies downloaded successfully
echo.

:verify_installation
echo ============================================
echo Verifying Installation
echo ============================================
echo.

REM Verify Go
where go >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=3" %%i in ('go version') do set GO_VERSION=%%i
    echo [OK] Go: %GO_VERSION%
) else (
    echo [WARNING] Go not found
)

REM Verify Wails
where wails >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('wails version') do set WAILS_VERSION=%%i
    echo [OK] Wails: %WAILS_VERSION%
) else (
    echo [WARNING] Wails not found (restart terminal after PATH changes)
)

REM Check if MSYS2 exists before verifying its tools
if exist "%MSYS2_PATH%\usr\bin\bash.exe" (
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
)

echo.
echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo ============================================
echo Summary of PATH configuration:
echo ============================================
echo.
if defined MSYS2_BIN (
    echo   - MSYS2 tools:              %MSYS2_BIN%
)
if exist "%USERPROFILE%\go\bin\wails.exe" (
    echo   - Go bin (wails):           %USERPROFILE%\go\bin
)
if defined NPM_GLOBAL_BIN (
    if exist "%NPM_GLOBAL_BIN%" (
        echo   - npm global packages:       %NPM_GLOBAL_BIN%
    )
)
echo.
echo ============================================
echo You can now build the project:
echo ============================================
echo.
echo   - Build Wails app:          wails build
echo   - Run Wails dev mode:       wails dev
if exist "visor-c" (
    echo   - Build C viewer:           .\visor-c\build.bat
    echo   - Build portable version:   .\visor-c\build-portable.bat
    echo   - Build installer version:  .\visor-c\build-installer.bat
)
echo.
echo ============================================
echo IMPORTANT: Restart Required
echo ============================================
echo.
echo Please close all terminal windows and open a new terminal
echo for PATH changes to take effect before running commands.
echo.
echo ============================================
echo.
echo Note: For building the installer version, you need to install NSIS
echo       from https://nsis.sourceforge.io/Download
echo.
echo ============================================
echo.

pause
