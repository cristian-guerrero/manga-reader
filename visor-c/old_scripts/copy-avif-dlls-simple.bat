@echo off
REM ============================================
REM Simple AVIF DLLs Copy Script
REM ============================================
REM This script copies AVIF-related DLLs from MSYS2
REM to the portable directory without complex detection logic.
REM ============================================

echo ============================================
echo Copying AVIF DLLs to Portable Directory
echo ============================================
echo.

REM Set paths
set MSYS2_PATH=C:\msys64\mingw64\bin
set PORTABLE_DIR=portable
set PORTABLE_DLL_DIR=%PORTABLE_DIR%\dll

REM Check if MSYS2 exists
if not exist "%MSYS2_PATH%" (
    echo [X] ERROR: MSYS2 not found at %MSYS2_PATH%
    echo     Please install MSYS2 from https://www.msys2.org/
    pause
    exit /b 1
)

REM Create portable/dll directory if it doesn't exist
if not exist "%PORTABLE_DLL_DIR%" (
    echo Creating directory: %PORTABLE_DLL_DIR%
    mkdir "%PORTABLE_DLL_DIR%"
)

echo.
echo Copying AVIF-related DLLs...
echo.

REM List of DLLs to copy (with version numbers)
set DLLS_TO_COPY=
set DLLS_TO_COPY=%DLLS_TO_COPY% libavif-16.dll
set DLLS_TO_COPY=%DLLS_TO_COPY% libaom.dll
set DLLS_TO_COPY=%DLLS_TO_COPY% libdav1d-7.dll
set DLLS_TO_COPY=%DLLS_TO_COPY% libde265-0.dll
set DLLS_TO_COPY=%DLLS_TO_COPY% libx265-215.dll
set DLLS_TO_COPY=%DLLS_TO_COPY% libheif.dll

set COPIED=0
set MISSING=0

for %%f in (%DLLS_TO_COPY%) do (
    if exist "%MSYS2_PATH%\%%f" (
        copy /Y "%MSYS2_PATH%\%%f" "%PORTABLE_DLL_DIR%\" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo [OK] Copied: %%f
            set /a COPIED+=1
        ) else (
            echo [X] Failed to copy: %%f
        )
    ) else (
        echo [!] Not found: %%f
        set /a MISSING+=1
    )
)

echo.
echo ============================================
echo Summary
echo ============================================
echo.
echo Copied: %COPIED% DLL(s)
echo Missing: %MISSING% DLL(s)
echo.

if %COPIED% GTR 0 (
    echo [OK] AVIF DLLs copied successfully!
    echo.
    echo The portable build should now support AVIF format.
) else (
    echo [!] No AVIF DLLs were copied.
    echo.
    echo Please run windows-install.bat to install all dependencies first.
)

echo.
pause
