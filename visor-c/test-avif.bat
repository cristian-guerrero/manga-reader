@echo off
setlocal enabledelayedexpansion

echo Testing AVIF DLL copy...
echo.

set MSYS2_PATH=C:\msys64\mingw64\bin
set PORTABLE_DIR=portable

echo MSYS2_PATH: %MSYS2_PATH%
echo PORTABLE_DIR: %PORTABLE_DIR%
echo.

echo Checking if AVIF DLLs exist...
if exist "%MSYS2_PATH%\libavif*.dll" (
    echo [OK] libavif*.dll found
) else (
    echo [FAIL] libavif*.dll NOT found
)

if exist "%MSYS2_PATH%\libaom*.dll" (
    echo [OK] libaom*.dll found
) else (
    echo [FAIL] libaom*.dll NOT found
)

if exist "%MSYS2_PATH%\libdav1d*.dll" (
    echo [OK] libdav1d*.dll found
) else (
    echo [FAIL] libdav1d*.dll NOT found
)

echo.
echo Testing wildcard expansion in loop...
for %%f in (libavif*.dll libaom*.dll libdav1d*.dll) do (
    echo Pattern: %%f
    if exist "%MSYS2_PATH%\%%f" (
        echo   File exists: %%f
    ) else (
        echo   File NOT found: %%f
    )
)

echo.
echo Testing individual file copy...
if exist "%MSYS2_PATH%\libavif-16.dll" (
    copy /Y "%MSYS2_PATH%\libavif-16.dll" "%PORTABLE_DIR%\dll\libavif-16.dll"
    if !ERRORLEVEL! EQU 0 (
        echo [OK] Copied libavif-16.dll
    ) else (
        echo [FAIL] Failed to copy libavif-16.dll
    )
) else (
    echo [FAIL] libavif-16.dll not found in source
)

endlocal
