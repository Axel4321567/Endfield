# Database Component

## 📋 Descripción
Componente de gestión de base de datos que integra MariaDB, PHP, phpMyAdmin, SearchProxy y Chromium para proporcionar una interfaz completa de administración de base de datos.

## 📁 Estructura de Archivos

```
Database/
├── DatabaseManager.tsx    # Componente principal de gestión
├── DatabaseManager.css    # Estilos del gestor
├── PhpMyAdmin.tsx         # Componente de phpMyAdmin embebido
├── PhpMyAdmin.css         # Estilos de phpMyAdmin
├── Terminal.tsx           # Terminal integrada para logs
└── Terminal.css           # Estilos de terminal
```

## 🔧 Funcionalidades Principales

### 1. Gestión de MariaDB
- Instalar/desinstalar MariaDB
- Iniciar/detener servicio
- Verificar estado en tiempo real
- Diagnósticos automáticos

### 2. Gestión de PHP
- Instalar/desinstalar PHP
- Iniciar/detener servidor PHP
- Verificar configuración
- Estado del servidor

### 3. Gestión de phpMyAdmin
- Instalar/desinstalar phpMyAdmin
- Iniciar/detener servicio
- Acceso embebido a interfaz web
- Verificación de dependencias

### 4. Servicios Auxiliares
- **SearchProxy**: Proxy para búsquedas
- **Chromium**: Navegador embebido para phpMyAdmin

### 5. Diagnósticos
- Verificación de puertos
- Estado de servicios
- Problemas de configuración
- Sugerencias de solución

## 🎣 Hooks Utilizados

### useMariaDB
```typescript
const mariadb = useMariaDB();
```
Gestiona MariaDB:
- `status`: Estado del servicio
- `loading`: Estado de carga
- `error`: Errores
- `install()`, `uninstall()`, `start()`, `stop()`
- `loadStatus()`: Actualizar estado
- `diagnostics`: Diagnósticos del sistema

### usePhp
```typescript
const php = usePhp();
```
Gestiona PHP:
- `status`: Estado del servidor PHP
- `install()`, `uninstall()`, `start()`, `stop()`
- `loadStatus()`: Actualizar estado

### usePhpMyAdmin
```typescript
const phpMyAdmin = usePhpMyAdmin();
```
Gestiona phpMyAdmin:
- `status`: Estado del servicio
- `install()`, `uninstall()`, `start()`, `stop()`
- `loadStatus()`: Actualizar estado
- `url`: URL de acceso

### useSearchProxy
```typescript
const searchProxy = useSearchProxy();
```
Gestiona proxy de búsquedas:
- `status`: Estado del proxy
- `loadStatus()`: Actualizar estado

### useChromium
```typescript
const chromium = useChromium();
```
Gestiona navegador Chromium:
- `status`: Estado del navegador
- `loadStatus()`: Actualizar estado

### useLogger
```typescript
const { addLog } = useLogger();
```
Sistema de logging centralizado.

## 📊 Flujo de Funcionamiento

```
┌─────────────────────┐
│ DatabaseManager     │
│ Component Mount     │
└──────────┬──────────┘
           │
           ├─► Inicializar todos los hooks
           │   ├─► useMariaDB
           │   ├─► usePhp
           │   ├─► usePhpMyAdmin
           │   ├─► useSearchProxy
           │   └─► useChromium
           │
           ├─► Cargar estados iniciales
           │   └─► loadStatus() en cada servicio
           │
           ├─► Auto-refresh (opcional, cada 10s)
           │   └─► Actualizar todos los estados
           │
           └─► Renderizar UI
               ├─► Botones de control MariaDB
               ├─► Botones de control PHP
               ├─► Botones de control phpMyAdmin
               ├─► Panel de diagnósticos
               └─► Estados del sistema
```

## 🎨 Estados de UI

### Estados Locales
- `autoRefresh`: Actualización automática cada 10s
- `showDiagnostics`: Mostrar panel de diagnósticos
- `showSystemState`: Mostrar estado del sistema MariaDB
- `showPhpState`: Mostrar estado de PHP
- `showPhpMyAdminState`: Mostrar estado de phpMyAdmin

### Estados de Servicios
Cada hook proporciona:
- `status`: Estado actual del servicio
- `loading`: Operación en curso
- `error`: Error si existe

## 🔍 Panel de Diagnósticos

Verifica automáticamente:
- ✅ Instalación de MariaDB
- ✅ Estado del servicio
- ✅ Disponibilidad de puertos
- ✅ Configuración correcta
- ✅ Dependencias

Tipos de issues:
- 🔐 **admin**: Problemas de permisos
- ⚙️ **config**: Configuración incorrecta
- 🔌 **port**: Puerto ocupado/inaccesible
- ❌ **error**: Error general

## 🎯 Props

```typescript
interface DatabaseManagerProps {
  className?: string;
  onNavigate?: (option: string) => void;
}
```

## 💡 Características Especiales

### 1. Auto-refresh
Actualización automática cada 10 segundos de todos los estados cuando está activado.

### 2. Diagnósticos Inteligentes
Sistema que detecta problemas comunes y sugiere soluciones.

### 3. Gestión Unificada
Un solo componente gestiona múltiples servicios relacionados.

### 4. Estados Persistentes
Los hooks mantienen el estado incluso al cambiar de vista.

### 5. Feedback Visual
Indicadores de color para cada estado:
- 🟢 Verde: Running
- 🔴 Rojo: Stopped
- 🟡 Amarillo: Installing
- ⚪ Gris: Unknown

## 🔗 Servicios Backend

### DatabaseService
```typescript
import { databaseService } from '../../services/DatabaseService';
```
Servicio principal que se comunica con Electron para:
- Instalar/desinstalar MariaDB
- Controlar servicios
- Obtener diagnósticos
- Verificar estados

## 📝 Logs

Todas las operaciones generan logs categorizados:
- **database**: Operaciones de base de datos
- **info**: Información general
- **error**: Errores críticos
- **success**: Operaciones exitosas

## ⚙️ Configuración

Los hooks manejan la configuración de cada servicio:
- Puertos
- Rutas de instalación
- Credenciales
- Variables de entorno
