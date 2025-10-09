# Script simple para generar el instalador de Koko Browser
Write-Host "Iniciando construccion del instalador Koko Browser" -ForegroundColor Blue

# Verificar package.json
if (-not (Test-Path "package.json")) {
    Write-Host "Error: No se encontro package.json" -ForegroundColor Red
    exit 1
}

# Crear directorio de salida
if (-not (Test-Path "dist-electron")) {
    New-Item -ItemType Directory -Path "dist-electron" -Force | Out-Null
}

Write-Host "Construyendo aplicacion web..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Aplicacion web construida exitosamente" -ForegroundColor Green
    
    Write-Host "Creando instalador..." -ForegroundColor Yellow
    npm run electron-pack
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Instalador creado exitosamente!" -ForegroundColor Green
        Write-Host "Archivos del instalador en: dist-electron/" -ForegroundColor Cyan
        
        if (Test-Path "dist-electron") {
            Get-ChildItem -Path "dist-electron" -Name | ForEach-Object {
                Write-Host "  - $_" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "Error al crear el instalador" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Error al construir la aplicacion web" -ForegroundColor Red
    exit 1
}