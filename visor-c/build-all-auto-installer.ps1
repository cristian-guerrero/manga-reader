# ============================================
#  Manga Viewer - Build Automático Installer
# ============================================
# Reutiliza build-all-auto-without-msys2.bat
# para compilar, luego crea el installer
# ============================================

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Manga Viewer - Build Automático Installer" -ForegroundColor Cyan
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

# Find makensis (NSIS)
Write-Host "[1/4] Checking for NSIS..." -ForegroundColor Yellow

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
    Write-Host "ERROR: makensis (NSIS) not found." -ForegroundColor Red
    Write-Host "Please install NSIS from: https://nsis.sourceforge.io/Download"
    exit 1
}

# ============================================
# Step 1: Compilar aplicación
# ============================================
Write-Host ""
Write-Host "[2/4] Compiling application..." -ForegroundColor Yellow

Push-Location $SCRIPT_DIR
& ".\build-all-auto-without-msys2.bat"
$buildExitCode = $LASTEXITCODE
Pop-Location

if ($buildExitCode -ne 0) {
    Write-Host "ERROR: Application build failed" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Application compiled successfully." -ForegroundColor Green

# ============================================
# Step 2: Preparar archivos del installer
# ============================================
Write-Host ""
Write-Host "[3/4] Preparing installer files..." -ForegroundColor Yellow

$INSTALL_DIR = Join-Path $SCRIPT_DIR "build\installer"
if (Test-Path $INSTALL_DIR) {
    Remove-Item -Path $INSTALL_DIR -Recurse -Force
}
New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null

# Copiar ejecutable
Copy-Item -Path (Join-Path $SCRIPT_DIR "build\viewer.exe") -Destination "$INSTALL_DIR\$APP_NAME.exe" -Force

# Buscar DLLs de vips en diferentes ubicaciones
Write-Host "  Looking for vips DLLs..." -ForegroundColor Gray
$vipsDllPaths = @(
    "deps\vips\bin\*.dll",
    "deps\vips\lib\*.dll",
    "deps\vips\lib64\*.dll"
)

$vipsDllsFound = $false
foreach ($path in $vipsDllPaths) {
    $dlls = Get-ChildItem -Path $path -ErrorAction SilentlyContinue
    if ($dlls) {
        foreach ($dll in $dlls) {
            Copy-Item -Path $dll.FullName -Destination "$INSTALL_DIR\" -Force
            Write-Host "    Copied: $($dll.Name)" -ForegroundColor Green
        }
        $vipsDllsFound = $true
        break
    }
}

if (-not $vipsDllsFound) {
    Write-Host "    WARNING: No vips DLLs found" -ForegroundColor Yellow
}

# Buscar DLLs de raylib en diferentes ubicaciones
Write-Host "  Looking for raylib DLLs..." -ForegroundColor Gray
$raylibDllPaths = @(
    "deps\raylib\lib\*.dll",
    "deps\raylib\bin\*.dll"
)

$raylibDllsFound = $false
foreach ($path in $raylibDllPaths) {
    $dlls = Get-ChildItem -Path $path -ErrorAction SilentlyContinue
    if ($dlls) {
        foreach ($dll in $dlls) {
            Copy-Item -Path $dll.FullName -Destination "$INSTALL_DIR\" -Force
            Write-Host "    Copied: $($dll.Name)" -ForegroundColor Green
        }
        $raylibDllsFound = $true
        break
    }
}

if (-not $raylibDllsFound) {
    Write-Host "    WARNING: No raylib DLLs found" -ForegroundColor Yellow
}

# Verificar que los DLLs se copiaron
$copiedDlls = Get-ChildItem -Path "$INSTALL_DIR\*.dll" -ErrorAction SilentlyContinue
if ($copiedDlls) {
    Write-Host "  Total DLLs in installer directory: $($copiedDlls.Count)" -ForegroundColor Green
} else {
    Write-Host "  WARNING: No DLLs copied to installer directory" -ForegroundColor Yellow
}

# Copiar plugins vips
$vipsModulesPath = "deps\vips\lib\vips-modules-8.18"
if (Test-Path $vipsModulesPath) {
    New-Item -ItemType Directory -Path "$INSTALL_DIR\lib\vips-modules-8.18" -Force | Out-Null
    Copy-Item -Path "$vipsModulesPath\*.dll" -Destination "$INSTALL_DIR\lib\vips-modules-8.18\" -Force
    Write-Host "  [OK] Vips plugins copied" -ForegroundColor Green
}

Write-Host "[OK] Installer files prepared." -ForegroundColor Green

# ============================================
# Step 3: Crear NSIS script y build installer
# ============================================
Write-Host ""
Write-Host "[4/4] Creating NSIS installer script and building..." -ForegroundColor Yellow

$nsisScript = @"
; Manga Viewer Installer Script
; Generated automatically by build-all-auto-installer.ps1

!define APP_NAME "$APP_NAME"
!define APP_NAME_DISPLAY "$APP_NAME_DISPLAY"
!define APP_VERSION "$APP_VERSION"
!define COMPANY_NAME "MangaViewer"
!define INSTALL_DIR "`$PROGRAMFILES\`${APP_NAME}"

; Modern UI
!include "MUI2.nsh"

; General
Name "`${APP_NAME_DISPLAY}"
OutFile "$SCRIPT_DIR\build\$APP_NAME-$APP_VERSION-setup.exe"
InstallDir "`${INSTALL_DIR}"
RequestExecutionLevel admin

; Interface Settings
!define MUI_ABORTWARNING

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

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
  
  ; Copy executable and DLLs to same directory
  File "installer\`${APP_NAME}.exe"
  File "installer\*.dll"
  
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
  Delete "`$INSTDIR\*.dll"
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
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    Write-Host "Installer size: $fileSizeMB MB"
}

Write-Host ""
Write-Host "To distribute:"
Write-Host "  - Send the installer to users"
Write-Host "  - Users run the installer to install the application"
Write-Host ""
