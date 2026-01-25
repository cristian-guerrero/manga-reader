# Script de PowerShell para extraer ZIPs con manejo de carpetas intermedias

param(
    [Parameter(Mandatory=$true)]
    [string]$raylibZipPath = "deps\raylib-4.5.0.zip",
    [string]$vipsZipPath = "deps\vips-8.18.0-all.zip"
)

$ErrorActionPreference = "Stop"

function Extract-With-TempFolder {
    param(
        [Parameter(Mandatory=$true)]
        [string]$zipPath,
        [string]$targetDir,
        [string]$folderName
    )
    
    Write-Host "[$folderName] Extrayendo $zipPath..."
    
    # Crear carpeta temporal única en el directorio actual
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $tempFolder = Join-Path (Get-Location) "temp_$timestamp"
    
    try {
        # Extraer a carpeta temporal
        Expand-Archive -Path $zipPath -DestinationPath $tempFolder -Force
        
        # Encontrar la subcarpeta real (primer directorio dentro)
        $subFolder = Get-ChildItem -Path $tempFolder -Directory | Select-Object -First 1

        if ($subFolder) {
            # Crear directorio de destino si no existe
            if (-not (Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }

            # Copiar contenido de subcarpeta a destino (sin la subcarpeta adicional)
            Copy-Item -Path "$($subFolder.FullName)\*" -Destination $targetDir -Recurse -Force
            Write-Host "[$folderName] Copiado a $targetDir"
        } else {
            Write-Host "[$folderName] [ERROR] No se encontró subcarpeta en carpeta temporal"
            return $false
        }
        
        # Eliminar carpeta temporal
        Remove-Item -Path $tempFolder -Recurse -Force
        Write-Host "[$folderName] Carpeta temporal eliminada"
        return $true
        
    } catch {
        Write-Host "[$folderName] [ERROR] $($_.Exception.Message)"
        return $false
    }
}

# Main
Write-Host "============================================"
Write-Host "  Extracción de Dependencias"
Write-Host "============================================"
Write-Host ""

# Extraer Raylib
$result1 = Extract-With-TempFolder -zipPath $raylibZipPath -targetDir "deps\raylib" -folderName "Raylib"

if (-not $result1) {
    Write-Host ""
    Write-Host "[FATAL] Error extrayendo Raylib"
    exit 1
}

Write-Host ""

# Extraer libvips
$result2 = Extract-With-TempFolder -zipPath $vipsZipPath -targetDir "deps\vips" -folderName "libvips"

if (-not $result2) {
    Write-Host ""
    Write-Host "[FATAL] Error extrayendo libvips"
    exit 1
}

Write-Host ""

Write-Host "============================================"
Write-Host "  VERIFICACIÓN FINAL"
Write-Host "============================================"
Write-Host ""

# Verificar archivos críticos
$raylibHeader = "deps\raylib\include\raylib.h"
$vipsHeader = "deps\vips\include\vips\vips.h"

Write-Host "Verificando archivos:"

if (Test-Path $raylibHeader) {
    Write-Host "  [OK] Raylib header encontrado"
} else {
    Write-Host "  [ERROR] Raylib header NO encontrado"
}

if (Test-Path $vipsHeader) {
    Write-Host "  [OK] libvips header encontrado"
} else {
    Write-Host "  [ERROR] libvips header NO encontrado"
}

Write-Host ""

Write-Host "============================================"
Write-Host "  EXTRACCIÓN COMPLETADA"
Write-Host "============================================"
Write-Host ""
Write-Host "Proximo paso: Ejecutar build-without-msys2.bat"
Write-Host ""