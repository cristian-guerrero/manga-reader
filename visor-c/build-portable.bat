@echo off
REM ============================================
REM  Manga Viewer - Portable Build (Windows)
REM ============================================
REM Creates a portable Windows build that can run
REM on any PC without installed dependencies.
REM Generates a ZIP file with all required DLLs.
REM ============================================

setlocal enabledelayedexpansion

echo ============================================
echo  Manga Viewer - Portable Build
echo ============================================
echo.

REM Configuration
set APP_NAME=MangaViewer
set APP_VERSION=1.0.0
set PORTABLE_DIR=portable
set ZIP_FILE=build\%APP_NAME%-%APP_VERSION%-portable.zip

REM ============================================
REM Find MSYS2 Installation
REM ============================================
set MSYS2_PATH=

REM Check common MSYS2 installation paths
if exist "C:\msys64\mingw64\bin\gcc.exe" (
    set "MSYS2_PATH=C:\msys64\mingw64\bin"
    echo Found MSYS2 at: C:\msys64\mingw64\bin
) else if exist "C:\msys64\ucrt64\bin\gcc.exe" (
    set "MSYS2_PATH=C:\msys64\ucrt64\bin"
    echo Found MSYS2 at: C:\msys64\ucrt64\bin
) else if exist "C:\devtools\msys64\mingw64\bin\gcc.exe" (
    set "MSYS2_PATH=C:\devtools\msys64\mingw64\bin"
    echo Found MSYS2 at: C:\devtools\msys64\mingw64\bin
) else if exist "D:\msys64\mingw64\bin\gcc.exe" (
    set "MSYS2_PATH=D:\msys64\mingw64\bin"
    echo Found MSYS2 at: D:\msys64\mingw64\bin
) else if exist "E:\msys64\mingw64\bin\gcc.exe" (
    set "MSYS2_PATH=E:\msys64\mingw64\bin"
    echo Found MSYS2 at: E:\msys64\mingw64\bin
) else (
    echo ERROR: MSYS2 not found. Please install MSYS2 or set the correct path.
    echo Common installation locations:
    echo   - C:\msys64\mingw64\bin
    echo   - C:\msys64\ucrt64\bin
    echo   - C:\devtools\msys64\mingw64\bin
    echo   - D:\msys64\mingw64\bin
    echo   - E:\msys64\mingw64\bin
    exit /b 1
)

REM Add MSYS2 to PATH
set PATH=%MSYS2_PATH%;%PATH%

REM Check for required tools
echo [1/7] Checking dependencies...

REM Check for gcc
if exist "%MSYS2_PATH%\gcc.exe" (
    echo [OK] gcc found at %MSYS2_PATH%\gcc.exe
) else (
    echo ERROR: gcc not found at %MSYS2_PATH%\gcc.exe
    exit /b 1
)

REM Check for pkg-config
if exist "%MSYS2_PATH%\pkg-config.exe" (
    echo [OK] pkg-config found at %MSYS2_PATH%\pkg-config.exe
) else (
    echo ERROR: pkg-config not found at %MSYS2_PATH%\pkg-config.exe
    exit /b 1
)

REM Check for PowerShell (needed for zip)
if exist "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" (
    echo [OK] PowerShell found
) else (
    echo ERROR: PowerShell not found. Required for creating ZIP file.
    exit /b 1
)

echo [OK] All required tools found.

REM ============================================
REM Step 1: Compile the application
REM ============================================
echo.
echo [2/7] Compiling application...

REM Kill any running instances
taskkill /IM viewer_debug.exe /F >nul 2>&1
taskkill /IM viewer.exe /F >nul 2>&1

REM Create build directory
if not exist "build" mkdir build

REM Include paths
set INCLUDES=-I./include -I./src

REM Get VIPS flags
for /f "delims=" %%i in ('pkg-config --cflags vips') do set VIPS_CFLAGS=%%i
for /f "delims=" %%i in ('pkg-config --libs vips') do set VIPS_LIBS=%%i

REM Compile source files
echo   - Compiling loader.c...
gcc -c src/loader.c -o build/loader.o %VIPS_CFLAGS% %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile loader.c
    exit /b 1
)

echo   - Compiling platform.c...
gcc -c src/platform.c -o build/platform.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile platform.c
    exit /b 1
)

echo   - Compiling folder.c...
gcc -c src/folder.c -o build/folder.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile folder.c
    exit /b 1
)

echo   - Compiling viewer.c...
gcc -c src/viewer.c -o build/viewer.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile viewer.c
    exit /b 1
)

echo   - Compiling input.c...
gcc -c src/input.c -o build/input.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile input.c
    exit /b 1
)

echo   - Compiling config.c...
gcc -c src/config.c -o build/config.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile config.c
    exit /b 1
)

echo   - Compiling main.c...
gcc -c src/main.c -o build/main.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile main.c
    exit /b 1
)

REM Link release build (no console)
echo   - Linking...
set OBJECTS=build/main.o build/loader.o build/platform.o build/folder.o build/viewer.o build/input.o build/config.o
set LIBS=%VIPS_LIBS% -lraylib -lgdi32 -lwinmm -lopengl32 -lpthread -lshell32 -mwindows -static-libgcc -static-libstdc++

gcc %OBJECTS% -o build/viewer.exe %LIBS%
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to link
    exit /b 1
)

echo [OK] Application compiled successfully.

REM ============================================
REM Step 2: Clean portable directory
REM ============================================
echo.
echo [3/7] Preparing portable directory...

if exist "%PORTABLE_DIR%" (
    echo   - Removing old portable directory...
    rmdir /s /q "%PORTABLE_DIR%"
)

mkdir "%PORTABLE_DIR%"
mkdir "%PORTABLE_DIR%\dll"

echo [OK] Portable directory prepared.

REM ============================================
REM Step 3: Copy executable
REM ============================================
echo.
echo [4/7] Copying executable...

copy /Y "build\viewer.exe" "%PORTABLE_DIR%\%APP_NAME%.exe" >nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to copy executable
    exit /b 1
)

echo [OK] Executable copied.

REM ============================================
REM Step 4: Find and copy DLL dependencies
REM ============================================
echo.
echo [5/7] Copying DLL dependencies...

REM Create a temporary script to find dependencies using objdump
echo Finding dependencies using objdump...

REM List of DLLs to copy (common MinGW dependencies)
set DLLS_TO_COPY=

REM Use objdump to find dependencies
for /f "delims=" %%i in ('objdump -p build\viewer.exe ^| findstr /i "DLL Name:"') do (
    set "line=%%i"
    set "line=!line:~10!"
    set "line=!line: =!"

    REM Check if this is a non-system DLL
    echo   - Found dependency: !line!

    REM Try to find the DLL in MSYS2
    if exist "%MSYS2_PATH%\!line!" (
        copy /Y "%MSYS2_PATH%\!line!" "%PORTABLE_DIR%\dll\" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo     Copied: !line!
        )
    )
)

REM Also copy specific vips and raylib DLLs that might not be listed
echo.
echo   - Copying libvips DLLs...
for %%f in (%MSYS2_PATH%\..\..\mingw64\bin\libvips-*.dll) do (
    if exist "%%f" (
        copy /Y "%%f" "%PORTABLE_DIR%\dll\" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo     Copied: %%~nxf
        )
    )
)

echo   - Copying raylib DLL...
for %%f in (%MSYS2_PATH%\..\..\mingw64\bin\libraylib*.dll) do (
    if exist "%%f" (
        copy /Y "%%f" "%PORTABLE_DIR%\dll\" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo     Copied: %%~nxf
        )
    )
)

echo   - Copying common MinGW DLLs...
for %%f in (libgcc_s_seh-1.dll libstdc++-6.dll libwinpthread-1.dll zlib1.dll libglib-2.0-0.dll libgobject-2.0-0.dll libgmodule-2.0-0.dll) do (
    if exist "%MSYS2_PATH%\%%f" (
        copy /Y "%MSYS2_PATH%\%%f" "%PORTABLE_DIR%\dll\" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo     Copied: %%f
        )
    )
)

echo   - Copying image format DLLs...
for %%f in (libjpeg*.dll libpng*.dll libtiff*.dll libwebp*.dll libheif*.dll libavif*.dll) do (
    if exist "%MSYS2_PATH%\%%f" (
        copy /Y "%MSYS2_PATH%\%%f" "%PORTABLE_DIR%\dll\" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo     Copied: %%f
        )
    )
)

echo [OK] DLL dependencies copied.

REM ============================================
REM Step 5: Copy vips plugins (if they exist)
REM ============================================
echo.
echo [6/7] Copying vips plugins...

if exist "%MSYS2_PATH%\..\..\mingw64\lib\vips-modules-8.16" (
    mkdir "%PORTABLE_DIR%\lib" 2>nul
    mkdir "%PORTABLE_DIR%\lib\vips-modules-8.16" 2>nul
    xcopy /Y /Q "%MSYS2_PATH%\..\..\mingw64\lib\vips-modules-8.16\*.dll" "%PORTABLE_DIR%\lib\vips-modules-8.16\" >nul 2>&1
    echo   - Vips plugins copied
) else if exist "%MSYS2_PATH%\..\..\ucrt64\lib\vips-modules-8.16" (
    mkdir "%PORTABLE_DIR%\lib" 2>nul
    mkdir "%PORTABLE_DIR%\lib\vips-modules-8.16" 2>nul
    xcopy /Y /Q "%MSYS2_PATH%\..\..\ucrt64\lib\vips-modules-8.16\*.dll" "%PORTABLE_DIR%\lib\vips-modules-8.16\" >nul 2>&1
    echo   - Vips plugins copied
) else (
    echo   - No vips plugins found (optional)
)

echo [OK] Vips plugins handled.

REM ============================================
REM Step 6: Create README and launcher script
REM ============================================
echo.
echo [7/7] Creating documentation and launcher...

REM Create README
(
echo Manga Viewer - Portable Build
echo ==============================
echo.
echo This is a portable version of Manga Viewer that can run on any Windows PC
echo without requiring installation of dependencies.
echo.
echo Usage:
echo ------
echo Simply run MangaViewer.exe to start the application.
echo.
echo You can also drag and drop a folder with images onto the executable.
echo.
echo Supported Formats:
echo ------------------
echo PNG, JPG, AVIF, WebP, HEIC, HEIF, JXL, TIFF, BMP and more.
echo.
echo Configuration:
echo ---------------
echo Settings are saved in: %%APPDATA%%\.manga-visor\config.ini
echo.
echo Requirements:
echo -------------
echo - Windows 7 or later
echo - No additional dependencies required
echo.
echo Version: %APP_VERSION%
echo.
) > "%PORTABLE_DIR%\README.txt"

REM Create a batch launcher that sets PATH to dll folder
(
echo @echo off
echo REM Manga Viewer Launcher
echo REM Sets PATH to include DLL directory
echo.
echo setlocal
echo set "PATH=%%~dp0dll;%%PATH%%"
echo set "VIPSHOME=%%~dp0lib"
echo.
echo start "" "%%~dp0%APP_NAME%.exe" %%*
) > "%PORTABLE_DIR%\%APP_NAME%.bat"

echo [OK] Documentation and launcher created.

REM ============================================
REM Step 7: Create ZIP file
REM ============================================
echo.
echo Creating ZIP package...

if exist "%ZIP_FILE%" del "%ZIP_FILE%"

REM Use PowerShell to create ZIP
powershell -Command "Compress-Archive -Path '%PORTABLE_DIR%\*' -DestinationPath '%ZIP_FILE%' -Force"

if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to create ZIP file. Portable directory is still available.
) else (
    echo [OK] ZIP file created: %ZIP_FILE%
)

REM ============================================
REM Summary
REM ============================================
echo.
echo ============================================
echo  PORTABLE BUILD COMPLETE
echo ============================================
echo.
echo Portable directory: %PORTABLE_DIR%\
echo ZIP package: %ZIP_FILE%
echo.
echo Contents:
dir /b "%PORTABLE_DIR%"
echo.
echo DLL files:
dir /b "%PORTABLE_DIR%\dll" 2>nul
echo.
echo To distribute:
echo   - Send the ZIP file to users
echo   - Users extract and run MangaViewer.exe or MangaViewer.bat
echo.
echo Size information:
for /f "tokens=3" %%a in ('dir "%ZIP_FILE%" ^| find "%ZIP_FILE%"') do echo ZIP file size: %%a bytes
for /f %%s in ('dir /s "%PORTABLE_DIR%" ^| find "File(s)"') do echo Total uncompressed: %%s
echo.

REM Cleanup object files
del build\*.o 2>nul

endlocal
