@echo off
setlocal enabledelayedexpansion

REM ============================================
REM Visor-C - Build Portable Completo
REM ============================================
REM Llama a build-all-auto-without-msys2.bat
REM para compilar, luego crea el ZIP portable
REM ============================================

echo ============================================
echo  Visor-C - Build Portable Completo
echo ============================================
echo.

REM Configuration
set APP_NAME=MangaViewer
set APP_VERSION=1.0.0
set PORTABLE_DIR=build\portable
set ZIP_FILE=build\%APP_NAME%-%APP_VERSION%-portable.zip

REM ============================================
REM STEP 1: Compilar la aplicación
REM ============================================
echo Step 1: Compilando aplicación...
echo.

call build-all-auto-without-msys2.bat
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to compile
    exit /b 1
)

echo.
echo [OK] Compilation complete.
echo.

REM ============================================
REM STEP 2: Preparar directorio portable
REM ============================================
echo Step 2: Preparando directorio portable...
echo.

if exist "%PORTABLE_DIR%" (
    echo   - Removing old portable directory...
    rmdir /s /q "%PORTABLE_DIR%"
)

mkdir "%PORTABLE_DIR%"
mkdir "%PORTABLE_DIR%\lib"

echo [OK] Portable directory prepared.

REM ============================================
REM STEP 3: Copiar ejecutable
REM ============================================
echo.
echo Step 3: Copiando ejecutable...
echo.

copy /Y "build\viewer.exe" "%PORTABLE_DIR%\%APP_NAME%.exe" >nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to copy executable
    exit /b 1
)

echo [OK] Executable copied.

REM ============================================
REM STEP 4: Copiar dependencias DLL
REM ============================================
echo.
echo Step 4: Copiando dependencias DLL...
echo.

echo   - Copying raylib DLLs...
for %%f in (deps\raylib\lib\*.dll) do (
    if exist "%%f" (
        copy /Y "%%f" "%PORTABLE_DIR%\" >nul 2>&1
        echo     Copied: %%~nxf
    )
)

echo   - Copying libvips DLLs...
for %%f in (deps\vips\bin\*.dll) do (
    if exist "%%f" (
        copy /Y "%%f" "%PORTABLE_DIR%\" >nul 2>&1
        echo     Copied: %%~nxf
    )
)

echo [OK] DLL dependencies copied.

REM ============================================
REM STEP 5: Copiar plugins vips
REM ============================================
echo.
echo Step 5: Copiando plugins vips...
echo.

if exist "deps\vips\lib\vips-modules-8.18" (
    mkdir "%PORTABLE_DIR%\lib\vips-modules-8.18" 2>nul
    xcopy "deps\vips\lib\vips-modules-8.18\*.dll" "%PORTABLE_DIR%\lib\vips-modules-8.18\" /E /I /Y >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo   - Vips plugins copied (vips-modules-8.18)
    )
) else (
    echo   - No vips plugins found (optional)
)

echo [OK] Plugin setup complete.

REM ============================================
REM STEP 6: Crear documentación y lanzador
REM ============================================
echo.
echo Step 6: Creando documentación y lanzador...
echo.

REM Create README
(
echo Manga Viewer - Portable Build
echo ==============================
echo.
echo Esta es una versión portable de Manga Viewer que puede ejecutarse en cualquier PC
echo sin requerir instalación de dependencias.
echo.
echo Uso:
echo -----
echo Simplemente ejecute MangaViewer.exe para iniciar la aplicación.
echo.
echo También puede arrastrar y soltar una carpeta con imágenes sobre el ejecutable.
echo.
echo Formatos Soportados:
echo --------------------
echo PNG, JPG, AVIF, WebP, HEIC, HEIF, JXL, TIFF, BMP y más.
echo.
echo Configuración:
echo ---------------
echo Los ajustes se guardan en: %%APPDATA%%\.manga-visor\config.ini
echo.
echo Requisitos:
echo -----------
echo - Windows 7 o posterior
echo - No se requieren dependencias adicionales
echo.
echo Versión: %APP_VERSION%
echo.
) > "%PORTABLE_DIR%\README.txt"

REM Create batch launcher
(
echo @echo off
echo setlocal
echo set "VIPSHOME=%%~dp0lib"
echo start "" "%%~dp0%APP_NAME%.exe" %%*
) > "%PORTABLE_DIR%\%APP_NAME%.bat"

echo [OK] Documentation and launcher created.

REM ============================================
REM STEP 7: Crear ZIP
REM ============================================
echo.
echo Step 7: Creando archivo ZIP...
echo.

if exist "%ZIP_FILE%" del "%ZIP_FILE%"

powershell -NoProfile -Command "Compress-Archive -Path '%PORTABLE_DIR%\*' -DestinationPath '%ZIP_FILE%' -Force"

if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to create ZIP file. Portable directory is still available.
) else (
    echo [OK] ZIP file created: %ZIP_FILE%
)

REM ============================================
REM Resumen Final
REM ============================================
echo.
echo ============================================
echo  BUILD COMPLETO - LISTO PARA DISTRIBUIR
echo ============================================
echo.
echo ZIP Portable: %ZIP_FILE%
echo.
echo Archivos incluidos:
dir /b "%PORTABLE_DIR%"
echo.

