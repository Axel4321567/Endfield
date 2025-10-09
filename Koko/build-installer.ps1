# Script para generar el instalador de Koko Browser
# PowerShell script for building Koko Browser installer

Write-Host "🚀 Iniciando proceso de construcción del instalador Koko Browser" -ForegroundColor Blue

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encontró package.json. Asegúrate de estar en el directorio correcto." -ForegroundColor Red
    exit 1
}

# Función para ejecutar comandos con manejo de errores
function Invoke-BuildStep {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "`n🔄 $Description..." -ForegroundColor Blue
    
    try {
        Invoke-Expression $Command
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $Description completado" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Error en: $Description (Exit Code: $LASTEXITCODE)" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Error en: $Description" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $false
    }
}

# Crear directorio de distribución si no existe
if (-not (Test-Path "dist-electron")) {
    New-Item -ItemType Directory -Path "dist-electron" -Force | Out-Null
}

# Proceso de construcción
$success = $true

# Paso 1: Construir aplicación web
if (-not (Invoke-BuildStep "npm run build" "Construyendo aplicación web con Vite")) {
    $success = $false
}

# Paso 2: Crear instalador
if ($success -and -not (Invoke-BuildStep "npm run electron-pack" "Creando instalador con Electron Builder")) {
    $success = $false
}

if ($success) {
    Write-Host "`n🎉 ¡Instalador creado exitosamente!" -ForegroundColor Green
    Write-Host "📦 Los archivos del instalador están en la carpeta: dist-electron/" -ForegroundColor Yellow
    Write-Host "📋 Archivos generados:" -ForegroundColor Blue
    
    try {
        $files = Get-ChildItem -Path "dist-electron" -Name
        foreach ($file in $files) {
            Write-Host "   - $file" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "   - Revisa la carpeta dist-electron/ para ver los archivos generados" -ForegroundColor Yellow
    }
    
    Write-Host "`n📝 Tipos de instalador generados:" -ForegroundColor Cyan
    Write-Host "   - NSIS Installer (.exe): Instalador tradicional de Windows" -ForegroundColor White
    Write-Host "   - Portable (.exe): Versión portable que no requiere instalación" -ForegroundColor White
} else {
    Write-Host "`n❌ Error al crear el instalador" -ForegroundColor Red
    exit 1
}