#!/bin/bash
# 🚀 Script para iniciar Google Search Proxy Service
# Linux/Mac Shell Script

echo ""
echo "========================================="
echo " Google Search Proxy Service"
echo " Puerto: 8001"
echo "========================================="
echo ""

# Verificar si Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 no está instalado"
    echo "Por favor instala Python 3.8+ desde https://python.org"
    exit 1
fi

# Verificar si las dependencias están instaladas
if ! python3 -c "import fastapi" &> /dev/null; then
    echo "[INSTALANDO] Instalando dependencias..."
    pip3 install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "[ERROR] Falló la instalación de dependencias"
        exit 1
    fi
    echo "[OK] Dependencias instaladas"
    echo ""
fi

# Iniciar el servicio
echo "[INICIANDO] Google Search Proxy..."
echo "[INFO] Servidor en http://localhost:8001"
echo "[INFO] Docs en http://localhost:8001/docs"
echo "[INFO] Presiona Ctrl+C para detener"
echo ""

python3 main.py
