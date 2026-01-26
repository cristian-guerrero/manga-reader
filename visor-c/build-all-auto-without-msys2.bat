@echo off
REM Build automático de visor-c - descarga dependencias y compila sin interacción

echo ============================================
echo  Visor-C - Build Automático Completo
echo ============================================
echo.

REM ============================================
REM Step 1: Descargar dependencias
REM ============================================
echo Step 1: Descargando dependencias...
echo.

call download-deps-curl.bat
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Fallo al descargar dependencias
    exit /b 1
)

echo.
echo ============================================
echo  Step 2: Compilando visor-c
echo ============================================
echo.

call build-without-msys2.bat
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Fallo al compilar visor-c
    exit /b 1
)

echo.
echo ============================================
echo  BUILD COMPLETADO EXITOSAMENTE
echo ============================================
echo.
echo Ejecutables creados:
echo   build\viewer.exe (Release)
echo   build\viewer_debug.exe (Debug)
echo.
echo Puedes ejecutar: build\viewer.exe
echo ============================================
