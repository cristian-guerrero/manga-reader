@echo off
setlocal enabledelayedexpansion

REM Download dependencies for visor-c WITHOUT MSYS2 using curl

echo ============================================
echo  Downloading Dependencies
echo ============================================
echo.

REM Create directories
if not exist "deps" mkdir deps

REM Check if ZIPs already exist
if exist "deps\raylib-4.5.0.zip" (
    echo Raylib ZIP already exists. Skipping download.
    set SKIP_RAYLIB=1
) else (
    set SKIP_RAYLIB=0
)

if exist "deps\vips-8.18.0-all.zip" (
    echo libvips ZIP already exists. Skipping download.
    set SKIP_VIPS=1
) else (
    set SKIP_VIPS=0
)

echo.

REM Download Raylib if needed
if %SKIP_RAYLIB% equ 0 (
    echo Downloading Raylib 5.5.0...
    set RAYLIB_URL=https://sourceforge.net/projects/raylib.mirror/files/4.5.0/raylib-4.5.0_win64_mingw-w64.zip/download
    set RAYLIB_ZIP=deps\raylib-4.5.0.zip
    curl -L -o "!RAYLIB_ZIP!" "!RAYLIB_URL!"
    
    if not exist "!RAYLIB_ZIP!" (
        echo ERROR: Failed to download Raylib
        exit /b 1
    )
    echo Raylib downloaded successfully.
    echo.
)

REM Download libvips if needed
if %SKIP_VIPS% equ 0 (
    echo Downloading libvips 8.18.0...
    set VIPS_URL=https://github.com/libvips/build-win64-mxe/releases/download/v8.18.0/vips-dev-w64-all-8.18.0.zip
    set VIPS_ZIP=deps\vips-8.18.0-all.zip
    curl -L -o "!VIPS_ZIP!" "!VIPS_URL!"
    
    if not exist "!VIPS_ZIP!" (
        echo ERROR: Failed to download libvips
        exit /b 1
    )
    echo libvips downloaded successfully.
    echo.
)

echo.
echo ============================================
echo  Extraction
echo ============================================
echo.

REM Extract Raylib
if exist "deps\raylib-4.5.0.zip" (
    echo Extracting Raylib...
    if exist "deps\raylib\include\raylib.h" (
        echo Raylib already extracted. Skipping.
    ) else (
        if not exist "deps\raylib" mkdir deps\raylib
        powershell -NoProfile -Command "Expand-Archive -Path 'deps\raylib-4.5.0.zip' -DestinationPath 'deps\raylib-temp' -Force"
        
        REM Move contents from nested folder to raylib
        for /d %%D in (deps\raylib-temp\*) do (
            if exist "%%D\include\raylib.h" (
                xcopy "%%D\*" "deps\raylib\" /E /I /Y >nul
            )
        )
        
        rmdir /s /q "deps\raylib-temp" 2>nul
        
        if not exist "deps\raylib\include\raylib.h" (
            echo ERROR: Raylib extraction failed
            exit /b 1
        )
        echo Raylib extracted successfully.
    )
    echo.
)

REM Extract libvips
if exist "deps\vips-8.18.0-all.zip" (
    echo Extracting libvips...
    if exist "deps\vips\include\vips\vips.h" (
        echo libvips already extracted. Skipping.
    ) else (
        if not exist "deps\vips" mkdir deps\vips
        powershell -NoProfile -Command "Expand-Archive -Path 'deps\vips-8.18.0-all.zip' -DestinationPath 'deps\vips-temp' -Force"
        
        REM Move contents from nested folder to vips
        for /d %%D in (deps\vips-temp\*) do (
            if exist "%%D\include\vips\vips.h" (
                xcopy "%%D\*" "deps\vips\" /E /I /Y >nul
                goto vips_done
            )
        )
        
        REM If no nested folder found, assume flat structure
        if exist "deps\vips-temp\include\vips\vips.h" (
            xcopy "deps\vips-temp\*" "deps\vips\" /E /I /Y >nul
            goto vips_done
        )
        
        :vips_done
        rmdir /s /q "deps\vips-temp" 2>nul
        
        if not exist "deps\vips\include\vips\vips.h" (
            echo ERROR: libvips extraction failed
            exit /b 1
        )
        echo libvips extracted successfully.
    )
    echo.
)

echo ============================================
echo  Dependencies Ready!
echo ============================================
echo.
echo Raylib: deps\raylib\
echo libvips: deps\vips\
echo.
exit /b 0