@echo off
REM ============================================
REM  Manga Viewer - NSIS Installer Build
REM ============================================
REM Creates a Windows installer using NSIS
REM Requires: NSIS (https://nsis.sourceforge.io/)
REM ============================================

setlocal enabledelayedexpansion

echo ============================================
echo  Manga Viewer - NSIS Installer Build
echo ============================================
echo.

REM Configuration
set APP_NAME=MangaViewer
set APP_NAME_DISPLAY="Manga Viewer"
set APP_VERSION=1.0.0
set INSTALLER_FILE=build\%APP_NAME%-%APP_VERSION%-setup.exe
set INSTALLER_SCRIPT=build\installer.nsi

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
echo [1/5] Checking dependencies...

REM Check for makensis (NSIS) - check in Program Files
if exist "C:\Program Files ^(x86^)\NSIS\makensis.exe" (
    echo [OK] makensis found at C:\Program Files ^(x86^)\NSIS\makensis.exe
) else if exist "C:\Program Files\NSIS\makensis.exe" (
    echo [OK] makensis found at C:\Program Files\NSIS\makensis.exe
) else (
    echo WARNING: makensis (NSIS) not found in standard locations.
    echo Please install NSIS from: https://nsis.sourceforge.io/Download
    echo Continuing anyway (installer build may fail)...
)

REM Check for gcc
if exist "%MSYS2_PATH%\gcc.exe" (
    echo [OK] gcc found at %MSYS2_PATH%\gcc.exe
) else (
    echo ERROR: gcc not found at %MSYS2_PATH%\gcc.exe
    exit /b 1
)

echo [OK] Dependency check complete.

REM ============================================
REM Step 1: Build the application
REM ============================================
echo.
echo [2/5] Building application...

call build.bat
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Application build failed
    exit /b 1
)

echo [OK] Application built successfully.

REM ============================================
REM Step 2: Prepare installer directory
REM ============================================
echo.
echo [3/5] Preparing installer files...

set INSTALL_DIR=build\installer
if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%"
mkdir "%INSTALL_DIR%"

REM Copy executable
copy /Y "build\viewer.exe" "%INSTALL_DIR%\%APP_NAME%.exe" >nul

REM Copy required DLLs
mkdir "%INSTALL_DIR%\dll"

REM Copy vips DLLs
for %%f in (%MSYS2_PATH%\libvips-*.dll) do (
    if exist "%%f" copy /Y "%%f" "%INSTALL_DIR%\dll\" >nul
)

REM Copy raylib DLL
for %%f in (%MSYS2_PATH%\libraylib*.dll) do (
    if exist "%%f" copy /Y "%%f" "%INSTALL_DIR%\dll\" >nul
)

REM Copy common MinGW DLLs
for %%f in (libgcc_s_seh-1.dll libstdc++-6.dll libwinpthread-1.dll zlib1.dll libglib-2.0-0.dll libgobject-2.0-0.dll libgmodule-2.0-0.dll) do (
    if exist "%MSYS2_PATH%\%%f" copy /Y "%MSYS2_PATH%\%%f" "%INSTALL_DIR%\dll\" >nul
)

REM Copy image format DLLs
for %%f in (libjpeg*.dll libpng*.dll libtiff*.dll libwebp*.dll libheif*.dll libavif*.dll) do (
    if exist "%MSYS2_PATH%\%%f" copy /Y "%MSYS2_PATH%\%%f" "%INSTALL_DIR%\dll\" >nul
)

REM Copy vips plugins
if exist "%MSYS2_PATH%\..\lib\vips-modules-8.16" (
    mkdir "%INSTALL_DIR%\lib" 2>nul
    mkdir "%INSTALL_DIR%\lib\vips-modules-8.16" 2>nul
    xcopy /Y /Q "%MSYS2_PATH%\..\lib\vips-modules-8.16\*.dll" "%INSTALL_DIR%\lib\vips-modules-8.16\" >nul 2>&1
)

echo [OK] Installer files prepared.

REM ============================================
REM Step 3: Create NSIS script
REM ============================================
echo.
echo [4/5] Creating NSIS installer script...

(
; Manga Viewer Installer Script
; Generated automatically by build-installer.bat

!define APP_NAME "%APP_NAME%"
!define APP_NAME_DISPLAY "%APP_NAME_DISPLAY%"
!define APP_VERSION "%APP_VERSION%"
!define COMPANY_NAME "MangaViewer"
!define INSTALL_DIR "$PROGRAMFILES\${APP_NAME}"

; Modern UI
!include "MUI2.nsh"

; General
Name "${APP_NAME_DISPLAY}"
OutFile "%INSTALLER_FILE%"
InstallDir "${INSTALL_DIR}"
RequestExecutionLevel admin

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "build\appicon.ico"
!define MUI_UNICON "build\appicon.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Spanish"

; Installer Sections
Section "Main Application" SecMain
  SectionIn RO
  
  SetOutPath "$INSTDIR"
  
  ; Copy executable
  File "build\installer\${APP_NAME}.exe"
  
  ; Copy DLLs
  File /r "build\installer\dll"
  
  ; Copy vips plugins
  File /r "build\installer\lib"
  
  ; Create start menu shortcut
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME_DISPLAY}.lnk" "$INSTDIR\${APP_NAME}.exe"
  
  ; Create desktop shortcut
  CreateShortcut "$DESKTOP\${APP_NAME_DISPLAY}.lnk" "$INSTDIR\${APP_NAME}.exe"
  
  ; Write registry keys
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME_DISPLAY}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${COMPANY_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoRepair" 1
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Section "Start Menu Shortcut" SecShortcut
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME_DISPLAY}.lnk" "$INSTDIR\${APP_NAME}.exe"
SectionEnd

Section "Desktop Shortcut" SecDesktop
  CreateShortcut "$DESKTOP\${APP_NAME_DISPLAY}.lnk" "$INSTDIR\${APP_NAME}.exe"
SectionEnd

; Uninstaller Section
Section "Uninstall"
  ; Remove files
  Delete "$INSTDIR\${APP_NAME}.exe"
  RMDir /r "$INSTDIR\dll"
  RMDir /r "$INSTDIR\lib"
  Delete "$INSTDIR\uninstall.exe"
  
  ; Remove shortcuts
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME_DISPLAY}.lnk"
  RMDir "$SMPROGRAMS\${APP_NAME}"
  Delete "$DESKTOP\${APP_NAME_DISPLAY}.lnk"
  
  ; Remove registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
  
  ; Remove install directory if empty
  RMDir "$INSTDIR"
SectionEnd

; Section Descriptions
LangString DESC_SecMain ${LANG_ENGLISH} "Install the main application files"
LangString DESC_SecMain ${LANG_SPANISH} "Instalar los archivos principales de la aplicación"

LangString DESC_SecShortcut ${LANG_ENGLISH} "Create a shortcut in the Start Menu"
LangString DESC_SecShortcut ${LANG_SPANISH} "Crear un acceso directo en el menú de inicio"

LangString DESC_SecDesktop ${LANG_ENGLISH} "Create a shortcut on the Desktop"
LangString DESC_SecDesktop ${LANG_SPANISH} "Crear un acceso directo en el escritorio"

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} $(DESC_SecMain)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecShortcut} $(DESC_SecShortcut)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} $(DESC_SecDesktop)
!insertmacro MUI_FUNCTION_DESCRIPTION_END
) > "%INSTALLER_SCRIPT%"

echo [OK] NSIS script created.

REM ============================================
REM Step 4: Build installer
REM ============================================
echo.
echo [5/5] Building installer...

makensis "%INSTALLER_SCRIPT%"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Installer build failed
    exit /b 1
)

echo [OK] Installer built successfully.

REM ============================================
REM Summary
REM ============================================
echo.
echo ============================================
echo  INSTALLER BUILD COMPLETE
echo ============================================
echo.
echo Installer: %INSTALLER_FILE%
echo.

REM Get file size
for /f "tokens=3" %%a in ('dir "%INSTALLER_FILE%" ^| find "%INSTALLER_FILE%"') do echo Installer size: %%a bytes

echo.
echo To distribute:
echo   - Send the installer to users
echo   - Users run the installer to install the application
echo.
echo Installation location: %INSTALL_DIR%
echo.

endlocal
