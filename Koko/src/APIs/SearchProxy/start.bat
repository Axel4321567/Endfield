@echo off
REM 🚀 Script para iniciar Google Search Proxy Service
REM Windows Batch Script

echo.
echo =========================================
echo  Google Search Proxy Service
echo  Puerto: 8001
echo =========================================
echo.

REM Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no esta instalado o no esta en PATH
    echo Por favor instala Python 3.8+ desde https://python.org
    pause
    exit /b 1
)

REM Verificar si las dependencias están instaladas
pip show fastapi >nul 2>&1
if %errorlevel% neq 0 (
    echo [INSTALANDO] Instalando dependencias...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo la instalacion de dependencias
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas
    echo.
)

REM Iniciar el servicio
echo [INICIANDO] Google Search Proxy...
echo [INFO] Servidor en http://localhost:8001
echo [INFO] Docs en http://localhost:8001/docs
echo [INFO] Presiona Ctrl+C para detener
echo.

python main.py

pause
