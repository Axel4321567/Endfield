# PHP Component

## 📋 Descripción
Componente de gestión del servidor PHP embebido. Permite instalar, iniciar, detener y configurar PHP para servir phpMyAdmin y otras aplicaciones PHP locales.

## 📁 Ubicación
```
components/PHP/
├── PHP.tsx (o integrado en Database)
└── PHP.css
```

## 🔧 Funcionalidades

### 1. Gestión de PHP
- Instalar PHP portable
- Iniciar servidor PHP (puerto 8000 por defecto)
- Detener servidor
- Verificar estado
- Desinstalar

### 2. Configuración
- Puerto configurable
- Document root configurable
- php.ini personalizable
- Extensiones habilitadas

### 3. Monitoreo
- Estado del servidor (running/stopped)
- Puerto en uso
- Logs del servidor
- Diagnósticos

## 🎣 Hook usePhp

```typescript
const php = usePhp();
```

### Propiedades
- `status`: Estado actual del servidor
- `loading`: Operación en curso
- `error`: Error si existe
- `install()`: Instalar PHP
- `uninstall()`: Desinstalar PHP
- `start()`: Iniciar servidor
- `stop()`: Detener servidor
- `loadStatus()`: Actualizar estado

## 📊 Estados

```typescript
interface PhpStatus {
  installed: boolean;
  running: boolean;
  port: number;
  version: string;
  pid?: number;
}
```

## ⚙️ Configuración por Defecto

- **Puerto:** 8000
- **Document Root:** `resources/phpmyadmin`
- **PHP Version:** 8.x portable
- **Extensiones:** mysqli, mbstring, opcache

## 🔗 Integración

### Con phpMyAdmin
PHP sirve phpMyAdmin en `http://localhost:8000`

### Con MariaDB
PHP se conecta a MariaDB en puerto 3306

## 💡 Backend

### Rutas
- `resources/php/` - PHP portable
- `resources/phpmyadmin/` - phpMyAdmin

### Scripts
- `electron/automation/php-manager.js` - Gestión de PHP
- `electron/services/php-service.js` - Servicio backend

## 🚀 Flujo de Instalación

```
1. Descargar PHP portable
2. Extraer en resources/php/
3. Configurar php.ini
4. Verificar extensiones
5. Test de instalación
```

## 🔧 Comandos

### Iniciar
```powershell
php -S localhost:8000 -t resources/phpmyadmin
```

### Detener
Kill proceso por PID

## 📝 Logs
- Logs de PHP en consola Electron
- Errores en archivo php_errors.log
- Logging integrado con LogsContext
