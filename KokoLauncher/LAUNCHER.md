# Documentación del Koko Launcher

## Descripción

Koko Launcher es el sistema de gestión de actualizaciones independiente para Koko Browser. Proporciona una interfaz moderna y segura para verificar, descargar e instalar actualizaciones del navegador y sus dependencias.

## Características Principales

### 🚀 Gestión de Actualizaciones
- Verificación automática de nuevas versiones
- Descarga segura con validación de integridad (SHA256)
- Instalación automática con backup de seguridad
- Soporte para múltiples canales (stable, beta, dev)

### 🛡️ Seguridad
- Validación de checksums antes de la instalación
- Verificación de firmas digitales
- Respaldo automático antes de actualizar
- Rollback en caso de errores

### 🎨 Interfaz Moderna
- Diseño glassmorphism con Tailwind CSS
- Animaciones fluidas con Framer Motion
- Barra de progreso en tiempo real
- Sistema de logs integrado

### 🔧 Gestión de Dependencias
- Soporte para MariaDB (base de datos local)
- Soporte para HeidiSQL (interfaz gráfica de DB)
- Detección automática de rutas de instalación
- Actualización independiente de componentes

## Arquitectura

```
KokoLauncher/
├── src/                    # Código fuente React + TypeScript
│   ├── components/         # Componentes UI
│   ├── services/          # Lógica de negocio
│   ├── utils/             # Utilidades
│   └── types/             # Definiciones TypeScript
├── electron/              # Proceso principal Electron
│   ├── main.js           # Proceso principal
│   ├── preload.js        # Bridge seguro
│   └── updater/          # Lógica de actualización
└── resources/            # Recursos y configuración
    ├── config/           # Archivos de configuración
    └── icons/            # Iconos de la aplicación
```

## Tecnologías

- **Frontend**: React + TypeScript + TailwindCSS + Framer Motion
- **Backend**: Electron + Node.js
- **Build**: Vite + electron-builder
- **UI**: Lucide React (iconos) + Glassmorphism design

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:
   ```bash
   npm install
   ```

## Desarrollo

```bash
# Modo desarrollo
npm run dev

# Build para producción
npm run build

# Crear distribución
npm run dist

# Solo Windows
npm run dist:win
```

## Configuración

### Archivo `update.json`
Contiene la configuración principal del launcher:
- Versión actual
- Canal de actualización
- URLs de actualización
- Configuración de dependencias

### Archivo `channels.json`
Define los canales de actualización disponibles:
- stable: Versión estable
- beta: Versión beta con nuevas características
- dev: Versión de desarrollo

## API del Launcher

### Servicios Principales

#### VersionService
- `checkForUpdates()`: Verifica actualizaciones disponibles
- `getCurrentVersion()`: Obtiene versión actual
- `getLatestVersion()`: Obtiene última versión disponible

#### UpdateService
- `downloadUpdate()`: Descarga actualización
- `installUpdate()`: Instala actualización
- `updateBrowser()`: Proceso completo de actualización

#### LaunchService
- `launchBrowser()`: Inicia Koko Browser
- `launchMariaDB()`: Inicia MariaDB
- `launchHeidiSQL()`: Inicia HeidiSQL

#### IntegrityService
- `validateFileIntegrity()`: Valida integridad de archivos
- `calculateFileHash()`: Calcula hash SHA256

## Seguridad

### Validación de Archivos
- Verificación SHA256 obligatoria
- Validación de estructura PE para ejecutables
- Verificación de firmas digitales (opcional)

### Comunicación Segura
- Context isolation habilitado
- Node integration deshabilitado
- Preload script para API segura

## Distribución

El launcher se distribuye como:
1. **Standalone**: Ejecutable independiente
2. **Integrado**: Parte del instalador principal de Koko

### Construcción del Instalador

```bash
# Generar ejecutable
npm run dist

# Publicar release
npm run publish
```

## Logs

El sistema genera logs detallados en:
- `resources/launcher/logs/launcher.log`
- Viewer integrado en la interfaz
- Niveles: info, warn, error

## Troubleshooting

### Problemas Comunes

1. **No encuentra Koko Browser**
   - Verificar rutas en `update.json`
   - Comprobar instalación de Koko Browser

2. **Error de conectividad**
   - Verificar conexión a internet
   - Comprobar URLs de actualización

3. **Fallo en validación**
   - Verificar integridad del archivo descargado
   - Revisar logs para detalles

### Logs de Debug

Habilitar logs detallados:
```bash
# Modo desarrollo con logs
NODE_ENV=development npm run dev
```

## Roadmap

### v1.1
- [ ] Soporte para actualizaciones delta
- [ ] Programación de actualizaciones
- [ ] Temas personalizables

### v1.2
- [ ] Soporte para plugins
- [ ] API REST para administración remota
- [ ] Métricas de uso

## Contribución

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit cambios (`git commit -am 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crear Pull Request

## Licencia

MIT License - ver archivo LICENSE para detalles.

---

**Koko Launcher** - Parte del ecosistema Koko Browser  
© 2024 Koko Browser Team