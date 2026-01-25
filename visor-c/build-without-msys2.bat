@echo off
REM Build script for Windows WITHOUT MSYS2
REM Downloads precompiled libraries and builds visor-c
REM Requires: TDM-GCC or similar (already in PATH)

echo ============================================
echo  Manga Viewer - Build (NO MSYS2)
echo ============================================
echo.

REM Check for GCC
where gcc >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: gcc not found in PATH
    echo Please install TDM-GCC or MinGW-w64 and add to PATH
    exit /b 1
)

echo Found GCC:
gcc --version | findstr /C:"gcc"
echo.

REM Create directories
if not exist "build" mkdir build
if not exist "deps" mkdir deps
if not exist "deps\raylib" mkdir deps\raylib
if not exist "deps\vips" mkdir deps\vips

REM Check if dependencies already exist
set NEED_DEPS=0

if not exist "deps\raylib\include\raylib.h" (
    echo Raylib not found, need to download dependencies
    set NEED_DEPS=1
)

if not exist "deps\vips\include\vips\vips.h" (
    echo libvips not found, need to download dependencies
    set NEED_DEPS=1
)

if %NEED_DEPS% EQU 1 (
    echo.
    echo Dependencies not found. Please run download-deps-curl.bat first
    echo Then run this script again.
    exit /b 1
)

REM ============================================
REM Raylib check (precompiled for MinGW-w64)
REM ============================================
echo.
echo ============================================
echo Step 1: Checking Raylib...
echo ============================================

if exist "deps\raylib\include\raylib.h" (
    echo Raylib found at deps\raylib\
) else (
    echo ERROR: Raylib not found!
    echo Please run: download-deps-curl.bat
    exit /b 1
)

echo Raylib ready at deps\raylib\
echo.

REM libvips check (precompiled Windows binaries WITH ALL DEPENDENCIES)
REM ============================================
echo.
echo ============================================
echo Step 2: Checking libvips (WITH ALL DEPENDENCIES)...
echo ============================================

if exist "deps\vips\include\vips\vips.h" (
    echo libvips found at deps\vips\
) else (
    echo ERROR: libvips not found!
    echo Please run: download-deps-curl.bat
    exit /b 1
)

echo libvips ready at deps\vips\
echo.

REM ============================================
REM Build visor-c
REM ============================================
echo.
echo ============================================
echo Step 3: Building visor-c...
echo ============================================

REM Kill any running instances
taskkill /IM viewer_debug.exe /F >nul 2>&1
taskkill /IM viewer.exe /F >nul 2>&1

REM Setup paths (adjusted for extracted structure from download-deps-curl.bat)
set INCLUDES=-I./include -I./src -Ideps\raylib\include -Ideps\vips\include -Ideps\vips\include\glib-2.0 -Ideps\vips\lib\glib-2.0\include
set LIBDIRS=-Ldeps\raylib\lib -Ldeps\vips\lib
set LIBS=-lvips -lraylib -lglib-2.0 -lgobject-2.0 -lcairo -lgdi32 -lwinmm -lopengl32 -lpthread -lshell32

REM Compile loader.c (with libvips)
echo Compiling loader.c...
gcc -c src/loader.c -o build/loader.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile loader.c
    exit /b 1
)

REM Compile other source files
echo Compiling platform.c...
gcc -c src/platform.c -o build/platform.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile platform.c
    exit /b 1
)

echo Compiling folder.c...
gcc -c src/folder.c -o build/folder.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile folder.c
    exit /b 1
)

echo Compiling viewer.c...
gcc -c src/viewer.c -o build/viewer.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile viewer.c
    exit /b 1
)

echo Compiling input.c...
gcc -c src/input.c -o build/input.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile input.c
    exit /b 1
)

echo Compiling config.c...
gcc -c src/config.c -o build/config.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile config.c
    exit /b 1
)

echo Compiling main.c...
gcc -c src/main.c -o build/main.o %INCLUDES% -O2
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile main.c
    exit /b 1
)

REM Link
echo Linking...
set OBJECTS=build/main.o build/loader.o build/platform.o build/folder.o build/viewer.o build/input.o build/config.o

REM Debug build (with console)
gcc %OBJECTS% -o build/viewer_debug.exe %LIBDIRS% %LIBS%
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to link debug build
    exit /b 1
)

REM Release build (no console)
gcc %OBJECTS% -o build/viewer.exe %LIBDIRS% %LIBS% -mwindows
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to link release build
    exit /b 1
)

REM Cleanup object files
del build\*.o 2>nul

echo.
echo ============================================
echo  BUILD SUCCESSFUL!
echo ============================================
echo.
echo Copying required DLLs to build directory...

REM Copy Raylib DLL (might be named differently depending on the build)
if exist "deps\raylib\lib\raylib.dll" (
    copy deps\raylib\lib\raylib.dll build\ >nul 2>&1
    echo Copied: raylib.dll
) else if exist "deps\raylib\lib\libraylib.dll" (
    copy deps\raylib\lib\libraylib.dll build\ >nul 2>&1
    echo Copied: libraylib.dll
)

REM Copy libvips DLLs
if exist "deps\vips\bin\*.dll" (
    copy deps\vips\bin\*.dll build\ >nul 2>&1
    echo Copied: libvips DLLs
)

echo.
echo Executables:
echo   Debug:   build\viewer_debug.exe
echo   Release: build\viewer.exe
echo.
echo DLLs copied to build directory
echo.
echo You can now run: build\viewer.exe
echo ============================================
