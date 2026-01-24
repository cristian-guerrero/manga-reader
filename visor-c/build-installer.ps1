# ============================================
#  Manga Viewer - NSIS Installer Build
# ============================================
# Creates a Windows installer using NSIS
# Requires: NSIS (https://nsis.sourceforge.io/)
# ============================================

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Manga Viewer - NSIS Installer Build" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$APP_NAME = "MangaViewer"
$APP_NAME_DISPLAY = "Manga Viewer"
$APP_VERSION = "1.0.0"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR
$INSTALLER_FILE = "build\$APP_NAME-$APP_VERSION-setup.exe"
$INSTALLER_SCRIPT = "build\installer.nsi"

# ============================================
# Find MSYS2 Installation
# ============================================
$MSYS2_PATH = ""

# Check common MSYS2 installation paths
$possiblePaths = @(
    "C:\msys64\mingw64\bin",
    "C:\msys64\ucrt64\bin",
    "C:\devtools\msys64\mingw64\bin",
    "D:\msys64\mingw64\bin",
    "E:\msys64\mingw64\bin"
)

foreach ($path in $possiblePaths) {
    if (Test-Path "$path\gcc.exe") {
        $MSYS2_PATH = $path
        Write-Host "Found MSYS2 at: $path" -ForegroundColor Green
        break
    }
}

if ([string]::IsNullOrEmpty($MSYS2_PATH)) {
    Write-Host "ERROR: MSYS2 not found. Please install MSYS2 or set the correct path." -ForegroundColor Red
    Write-Host "Common installation locations:"
    foreach ($path in $possiblePaths) {
        Write-Host "  - $path"
    }
    exit 1
}

# Add MSYS2 to PATH
$env:PATH = "$MSYS2_PATH;$env:PATH"

# Check for required tools
Write-Host "[1/5] Checking dependencies..." -ForegroundColor Yellow

# Check for makensis (NSIS)
$makensisPath = $null
$makensisPaths = @(
    "C:\Program Files (x86)\NSIS\makensis.exe",
    "C:\Program Files\NSIS\makensis.exe"
)

foreach ($path in $makensisPaths) {
    if (Test-Path $path) {
        Write-Host "[OK] makensis found at $path" -ForegroundColor Green
        $makensisPath = $path
        break
    }
}

if ([string]::IsNullOrEmpty($makensisPath)) {
    Write-Host "WARNING: makensis (NSIS) not found in standard locations." -ForegroundColor Yellow
    Write-Host "Please install NSIS from: https://nsis.sourceforge.io/Download"
    Write-Host "Continuing anyway (installer build may fail)..."
}

# Check for gcc
if (Test-Path "$MSYS2_PATH\gcc.exe") {
    Write-Host "[OK] gcc found at $MSYS2_PATH\gcc.exe" -ForegroundColor Green
} else {
    Write-Host "ERROR: gcc not found at $MSYS2_PATH\gcc.exe" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Dependency check complete." -ForegroundColor Green

# ============================================
# Step 1: Build the application
# ============================================
Write-Host ""
Write-Host "[2/5] Building application..." -ForegroundColor Yellow

Push-Location $SCRIPT_DIR
& ".\build.bat"
$buildExitCode = $LASTEXITCODE
Pop-Location

if ($buildExitCode -ne 0) {
    Write-Host "ERROR: Application build failed" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Application built successfully." -ForegroundColor Green

# ============================================
# Step 2: Prepare installer directory
# ============================================
Write-Host ""
Write-Host "[3/5] Preparing installer files..." -ForegroundColor Yellow

$INSTALL_DIR = Join-Path $SCRIPT_DIR "build\installer"
if (Test-Path $INSTALL_DIR) {
    Remove-Item -Path $INSTALL_DIR -Recurse -Force
}
New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null

# Copy executable
Copy-Item -Path (Join-Path $SCRIPT_DIR "build\viewer.exe") -Destination "$INSTALL_DIR\$APP_NAME.exe" -Force

# Copy required DLLs
New-Item -ItemType Directory -Path "$INSTALL_DIR\dll" -Force | Out-Null

# Copy vips DLLs
$vipsDlls = Get-ChildItem -Path "$MSYS2_PATH\libvips-*.dll" -ErrorAction SilentlyContinue
foreach ($dll in $vipsDlls) {
    Copy-Item -Path $dll.FullName -Destination "$INSTALL_DIR\dll\" -Force
}

# Copy raylib DLL
$raylibDlls = Get-ChildItem -Path "$MSYS2_PATH\libraylib*.dll" -ErrorAction SilentlyContinue
foreach ($dll in $raylibDlls) {
    Copy-Item -Path $dll.FullName -Destination "$INSTALL_DIR\dll\" -Force
}

# Copy common MinGW DLLs
$commonDlls = @(
    "libgcc_s_seh-1.dll",
    "libstdc++-6.dll",
    "libwinpthread-1.dll",
    "zlib1.dll",
    "libglib-2.0-0.dll",
    "libgobject-2.0-0.dll",
    "libgmodule-2.0-0.dll"
)

foreach ($dll in $commonDlls) {
    $dllPath = "$MSYS2_PATH\$dll"
    if (Test-Path $dllPath) {
        Copy-Item -Path $dllPath -Destination "$INSTALL_DIR\dll\" -Force
    }
}

# Copy image format DLLs
$imageDllPatterns = @(
    "libjpeg*.dll",
    "libpng*.dll",
    "libtiff*.dll",
    "libwebp*.dll",
    "libheif*.dll",
    "libavif*.dll"
)

foreach ($pattern in $imageDllPatterns) {
    $dlls = Get-ChildItem -Path "$MSYS2_PATH\$pattern" -ErrorAction SilentlyContinue
    foreach ($dll in $dlls) {
        Copy-Item -Path $dll.FullName -Destination "$INSTALL_DIR\dll\" -Force
    }
}

# Copy vips plugins
$vipsModulesPath = "$MSYS2_PATH\..\lib\vips-modules-8.16"
if (Test-Path $vipsModulesPath) {
    New-Item -ItemType Directory -Path "$INSTALL_DIR\lib" -Force | Out-Null
    New-Item -ItemType Directory -Path "$INSTALL_DIR\lib\vips-modules-8.16" -Force | Out-Null
    Copy-Item -Path "$vipsModulesPath\*.dll" -Destination "$INSTALL_DIR\lib\vips-modules-8.16\" -Force
}

Write-Host "[OK] Installer files prepared." -ForegroundColor Green

# ============================================
# Step 3: Create NSIS script
# ============================================
Write-Host ""
Write-Host "[4/5] Creating NSIS installer script..." -ForegroundColor Yellow

$nsisScript = @"
; Manga Viewer Installer Script
; Generated automatically by build-installer.ps1

!define APP_NAME "$APP_NAME"
!define APP_NAME_DISPLAY "$APP_NAME_DISPLAY"
!define APP_VERSION "$APP_VERSION"
!define COMPANY_NAME "MangaViewer"
!define INSTALL_DIR "`$PROGRAMFILES\`${APP_NAME}"

; Modern UI
!include "MUI2.nsh"

; General
Name "`${APP_NAME_DISPLAY}"
OutFile "$SCRIPT_DIR\$APP_NAME-$APP_VERSION-setup.exe"
InstallDir "`${INSTALL_DIR}"
RequestExecutionLevel admin

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "$PROJECT_ROOT\build\appicon.ico"
!define MUI_UNICON "$PROJECT_ROOT\build\appicon.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "$PROJECT_ROOT\LICENSE"
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
  
  SetOutPath "`$INSTDIR"
  
  ; Copy executable
  File "installer\`${APP_NAME}.exe"
  
  ; Copy DLLs
  File /r "installer\dll"
  
  ; Copy vips plugins (optional)
  File /nonfatal /r "installer\lib"
  
  ; Create start menu shortcut
  CreateDirectory "`$SMPROGRAMS\`${APP_NAME}"
  CreateShortcut "`$SMPROGRAMS\`${APP_NAME}\`${APP_NAME_DISPLAY}.lnk" "`$INSTDIR\`${APP_NAME}.exe"
  
  ; Create desktop shortcut
  CreateShortcut "`$DESKTOP\`${APP_NAME_DISPLAY}.lnk" "`$INSTDIR\`${APP_NAME}.exe"
  
  ; Write registry keys
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\`${APP_NAME}" "DisplayName" "`${APP_NAME_DISPLAY}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\`${APP_NAME}" "DisplayVersion" "`${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\`${APP_NAME}" "Publisher" "`${COMPANY_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\`${APP_NAME}" "UninstallString" "`$INSTDIR\uninstall.exe"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\`${APP_NAME}" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\`${APP_NAME}" "NoRepair" 1
  
  ; Create uninstaller
  WriteUninstaller "`$INSTDIR\uninstall.exe"
SectionEnd

Section "Start Menu Shortcut" SecShortcut
  CreateDirectory "`$SMPROGRAMS\`${APP_NAME}"
  CreateShortcut "`$SMPROGRAMS\`${APP_NAME}\`${APP_NAME_DISPLAY}.lnk" "`$INSTDIR\`${APP_NAME}.exe"
SectionEnd

Section "Desktop Shortcut" SecDesktop
  CreateShortcut "`$DESKTOP\`${APP_NAME_DISPLAY}.lnk" "`$INSTDIR\`${APP_NAME}.exe"
SectionEnd

; Uninstaller Section
Section "Uninstall"
  ; Remove files
  Delete "`$INSTDIR\`${APP_NAME}.exe"
  RMDir /r "`$INSTDIR\dll"
  RMDir /r "`$INSTDIR\lib"
  Delete "`$INSTDIR\uninstall.exe"
  
  ; Remove shortcuts
  Delete "`$SMPROGRAMS\`${APP_NAME}\`${APP_NAME_DISPLAY}.lnk"
  RMDir "`$SMPROGRAMS\`${APP_NAME}"
  Delete "`$DESKTOP\`${APP_NAME_DISPLAY}.lnk"
  
  ; Remove registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\`${APP_NAME}"
  
  ; Remove install directory if empty
  RMDir "`$INSTDIR"
SectionEnd

; Section Descriptions
LangString DESC_SecMain `${LANG_ENGLISH} "Install the main application files"
LangString DESC_SecMain `${LANG_SPANISH} "Instalar los archivos principales de la aplicación"

LangString DESC_SecShortcut `${LANG_ENGLISH} "Create a shortcut in the Start Menu"
LangString DESC_SecShortcut `${LANG_SPANISH} "Crear un acceso directo en el menú de inicio"

LangString DESC_SecDesktop `${LANG_ENGLISH} "Create a shortcut on the Desktop"
LangString DESC_SecDesktop `${LANG_SPANISH} "Crear un acceso directo en el escritorio"

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT `${SecMain} `$(DESC_SecMain)
  !insertmacro MUI_DESCRIPTION_TEXT `${SecShortcut} `$(DESC_SecShortcut)
  !insertmacro MUI_DESCRIPTION_TEXT `${SecDesktop} `$(DESC_SecDesktop)
!insertmacro MUI_FUNCTION_DESCRIPTION_END
"@

$nsisScript | Out-File -FilePath (Join-Path $SCRIPT_DIR $INSTALLER_SCRIPT) -Encoding UTF8

Write-Host "[OK] NSIS script created." -ForegroundColor Green

# ============================================
# Step 4: Build installer
# ============================================
Write-Host ""
Write-Host "[5/5] Building installer..." -ForegroundColor Yellow

if ([string]::IsNullOrEmpty($makensisPath)) {
    Write-Host "ERROR: makensis not found. Cannot build installer." -ForegroundColor Red
    Write-Host "Please install NSIS from: https://nsis.sourceforge.io/Download"
    exit 1
}

Push-Location $SCRIPT_DIR
& $makensisPath $INSTALLER_SCRIPT
$makensisExitCode = $LASTEXITCODE
Pop-Location

if ($makensisExitCode -ne 0) {
    Write-Host "ERROR: Installer build failed" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Installer built successfully." -ForegroundColor Green

# ============================================
# Summary
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " INSTALLER BUILD COMPLETE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$installerPath = Join-Path $SCRIPT_DIR $INSTALLER_FILE
Write-Host "Installer: $installerPath"
Write-Host ""

# Get file size
if (Test-Path $installerPath) {
    $fileSize = (Get-Item $installerPath).Length
    Write-Host "Installer size: $fileSize bytes"
}

Write-Host ""
Write-Host "To distribute:"
Write-Host "  - Send the installer to users"
Write-Host "  - Users run the installer to install the application"
Write-Host ""
Write-Host "Installation location: $INSTALL_DIR"
Write-Host ""
