# 🚀 Guía de Construcción del Instalador - Koko Browser

## 📋 Requisitos Previos

- Node.js (versión 18 o superior)
- npm o yarn
- Windows 10/11 (para generar instaladores de Windows)

## 🛠️ Proceso de Construcción

### Opción 1: Script Automatizado (Recomendado)

```powershell
npm run installer
```

Este comando ejecutará el script PowerShell que:
1. Construye la aplicación web con Vite
2. Crea el instalador con Electron Builder
3. Muestra un resumen de los archivos generados

### Opción 2: Comandos Manuales

```bash
# 1. Construir la aplicación web
npm run build

# 2. Crear el instalador
npm run electron-pack
```

### Opción 3: Scripts Específicos

```bash
# Solo crear el instalador NSIS para Windows x64
npm run make

# Crear distribución completa
npm run dist

# Crear solo el paquete (sin instalador)
npm run pack
```

## 📦 Tipos de Instalador Generados

### 1. NSIS Installer (`.exe`)
- **Archivo**: `Koko Browser Setup X.X.X.exe`
- **Descripción**: Instalador tradicional de Windows
- **Características**:
  - Instalación en Program Files
  - Accesos directos en escritorio y menú inicio
  - Desinstalador incluido
  - Proceso de instalación guiado

### 2. Portable (`.exe`)
- **Archivo**: `KokoBrowser-Portable-X.X.X.exe`
- **Descripción**: Versión portable sin instalación
- **Características**:
  - No requiere instalación
  - Se puede ejecutar desde cualquier ubicación
  - Ideal para USB o uso temporal
  - No crea entradas en el registro

## 📁 Estructura de Salida

```
dist-electron/
├── Koko Browser Setup 1.0.0.exe          # Instalador NSIS
├── KokoBrowser-Portable-1.0.0.exe        # Versión portable
├── win-unpacked/                          # Archivos descomprimidos
│   ├── Koko Browser.exe                   # Ejecutable principal
│   ├── resources/                         # Recursos de la aplicación
│   └── ...
└── builder-debug.yml                      # Log de construcción
```

## 🔧 Configuración Avanzada

### Personalizar el Instalador

Edita la sección `build` en `package.json`:

```json
{
  "build": {
    "appId": "com.koko.browser",
    "productName": "Koko Browser",
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "Koko Browser"
    }
  }
}
```

### Variables de Entorno

```bash
# Cambiar directorio de salida
export BUILD_OUTPUT_DIR=custom-dist

# Habilitar modo debug
export DEBUG=electron-builder
```

## 🐛 Solución de Problemas

### Error: "Module not found"
```bash
npm install
npm run build
npm run electron-pack
```

### Error: "Permission denied"
```powershell
# Ejecutar PowerShell como administrador
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
npm run installer
```

### Error: "NSIS not found"
```bash
# Instalar electron-builder globalmente
npm install -g electron-builder
```

### Archivos de salida vacíos
1. Verificar que `npm run build` se ejecute correctamente
2. Comprobar que la carpeta `dist/` existe y contiene archivos
3. Revisar los logs en `dist-electron/builder-debug.yml`

## 📋 Checklist de Construcción

- [ ] Dependencias instaladas (`npm install`)
- [ ] Aplicación web construida (`npm run build`)
- [ ] Electron Builder configurado
- [ ] Iconos presentes en `src-tauri/icons/`
- [ ] Permisos de PowerShell configurados
- [ ] Espacio en disco suficiente (mínimo 1GB)

## 🎯 Comandos Útiles

```bash
# Verificar configuración
npm run electron-builder -- --help

# Construcción solo para desarrollo (más rápido)
npm run pack

# Construcción con logs detallados
DEBUG=electron-builder npm run electron-pack

# Limpiar caché de construcción
npx electron-builder install-app-deps
```

## 📝 Notas Importantes

1. **Primera construcción**: Puede tardar más tiempo debido a la descarga de dependencias de Electron
2. **Tamaño del instalador**: Aproximadamente 150-200MB debido a la inclusión de Chromium
3. **Firma de código**: Para distribución pública, considera firmar el ejecutable
4. **Antivirus**: Algunos antivirus pueden marcar falsos positivos en ejecutables sin firmar

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs en `dist-electron/builder-debug.yml`
2. Verifica que todas las dependencias estén instaladas
3. Asegúrate de tener permisos de escritura en el directorio
4. Consulta la documentación de [Electron Builder](https://www.electron.build/)

---

**¡Listo para distribuir tu aplicación Koko Browser! 🎉**