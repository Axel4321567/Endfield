# 🐘 Integración de phpMyAdmin en Koko Browser

## 📋 Resumen

phpMyAdmin ha sido integrado como un gestor de base de datos embebido que se muestra en la ventana de la aplicación en lugar de abrirse como aplicación externa.

## ⚙️ Arquitectura

### Backend (Electron)

1. **phpmyadmin-manager.js**
   - Gestiona el servidor PHP embebido
   - Configura phpMyAdmin automáticamente
   - Habilita extensiones PHP necesarias
   - Puerto dinámico (8888+)

2. **phpmyadmin-handlers.js**
   - Handlers IPC para comunicación con frontend
   - Maneja: start, stop, getStatus

3. **main.js**
   - Inicializa PhpMyAdminManager
   - Registra handlers IPC

4. **preload.js**
   - Expone API segura: `window.electronAPI.phpMyAdmin`

### Frontend (React + TypeScript)

1. **PhpMyAdmin.tsx**
   - Componente React principal
   - Controles de inicio/detención
   - Iframe embebido
   - Instrucciones de instalación

2. **PhpMyAdmin.css**
   - Estilos modernos con gradientes
   - Responsive design
   - Animaciones suaves

3. **MainContent.tsx**
   - Integra PhpMyAdmin en la vista "HeidiSQL"

## 📦 Instalación Manual Requerida

### 1. PHP Portable (Requerido)

**Descarga:**
- URL: https://windows.php.net/download/
- Versión: PHP 8.x (x64 Thread Safe)
- Formato: ZIP

**Instalación:**
```
c:\Users\TheYa\Documents\Git\Endfield\Koko\
└── resources\
    └── php\
        ├── php.exe
        ├── php.ini
        ├── ext\
        │   ├── php_mysqli.dll
        │   ├── php_mbstring.dll
        │   ├── php_openssl.dll
        │   └── php_curl.dll
        └── ... (otros archivos de PHP)
```

### 2. phpMyAdmin (Requerido)

**Descarga:**
- URL: https://www.phpmyadmin.net/downloads/
- Versión: Última estable
- Formato: ZIP

**Instalación:**
```
c:\Users\TheYa\Documents\Git\Endfield\Koko\
└── resources\
    └── phpmyadmin\
        ├── index.php
        ├── config.inc.php (se crea automáticamente)
        ├── libraries\
        ├── templates\
        └── ... (todos los archivos de phpMyAdmin)
```

## 🚀 Flujo de Uso

### 1. Primera Vez

1. Usuario navega a **Extras > HeidiSQL** en sidebar
2. Componente PhpMyAdmin se muestra
3. Si PHP/phpMyAdmin NO están instalados:
   - Muestra instrucciones de instalación
   - Links para descargar PHP y phpMyAdmin
   - Rutas de instalación claras

### 2. Después de Instalación

1. Usuario hace clic en **"Verificar Instalación"**
2. Sistema detecta archivos instalados
3. Muestra botón **"Iniciar phpMyAdmin"**

### 3. Uso Normal

1. Usuario hace clic en **"Iniciar phpMyAdmin"**
2. Backend:
   - Configura `php.ini` (habilita extensiones)
   - Crea `config.inc.php` (conexión a MariaDB)
   - Encuentra puerto disponible (8888+)
   - Inicia servidor PHP: `php.exe -S localhost:8888 -t phpmyadmin/`
3. Frontend:
   - Muestra iframe con URL: `http://localhost:8888`
   - phpMyAdmin se carga dentro de la aplicación
4. Usuario gestiona la base de datos directamente en la ventana

## 🔧 Configuración Automática

### php.ini

El sistema habilita automáticamente estas extensiones:
```ini
extension=mysqli
extension=mbstring
extension=openssl
extension=curl
```

### config.inc.php

Se genera automáticamente con:
```php
$cfg['Servers'][1]['auth_type'] = 'config';
$cfg['Servers'][1]['host'] = 'localhost';
$cfg['Servers'][1]['port'] = '3306';
$cfg['Servers'][1]['user'] = 'root';
$cfg['Servers'][1]['password'] = '';
$cfg['Servers'][1]['AllowNoPassword'] = true;
$cfg['DefaultLang'] = 'es';
```

## 🎨 UI/UX

### Header
- Título: "🐘 phpMyAdmin"
- Estado: "● Servidor Activo (Puerto 8888)" / "○ Servidor Detenido"
- Botones: "▶️ Iniciar phpMyAdmin" / "⏹️ Detener Servidor"

### Contenido
- **No instalado**: Instrucciones paso a paso con links
- **Instalado pero detenido**: Placeholder "🚀 Listo para Iniciar"
- **En ejecución**: Iframe con phpMyAdmin embebido

### Estilos
- Tema oscuro con gradientes
- Animaciones suaves en hover
- Colores:
  - Verde: Iniciar (#2ecc71)
  - Rojo: Detener (#e74c3c)
  - Azul: Verificar (#3498db)
  - Naranja: Títulos (#f39c12)

## 🔒 Seguridad

### Iframe Sandbox
```tsx
sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
```

### Puerto Local
- Solo accesible desde `localhost`
- No expuesto a la red
- Puerto dinámico para evitar conflictos

### Configuración Limitada
- Sin acceso a servidor arbitrario
- Conexión pre-configurada a MariaDB local
- Sin persistencia de sesión fuera de uso

## 📊 Estados del Servidor

```typescript
interface PhpMyAdminStatus {
  isRunning: boolean;           // Servidor activo
  phpInstalled: boolean;        // PHP instalado correctamente
  phpMyAdminInstalled: boolean; // phpMyAdmin instalado correctamente
  url: string | null;           // URL del servidor (si está activo)
  port: number | null;          // Puerto usado
  error?: string;               // Mensaje de error (si hay)
}
```

## 🔄 Ciclo de Vida

```
1. App inicia
   ↓
2. PhpMyAdminManager se crea (pero NO inicia servidor)
   ↓
3. Usuario navega a Extras > HeidiSQL
   ↓
4. PhpMyAdmin.tsx monta y verifica estado
   ↓
5. Usuario hace clic en "Iniciar phpMyAdmin"
   ↓
6. Backend inicia servidor PHP
   ↓
7. Frontend muestra iframe con phpMyAdmin
   ↓
8. Usuario gestiona base de datos
   ↓
9. Usuario hace clic en "Detener Servidor" (o cierra app)
   ↓
10. Backend mata proceso PHP
```

## 🎯 Ventajas vs HeidiSQL Externo

| Característica | HeidiSQL | phpMyAdmin Embebido |
|----------------|----------|---------------------|
| Integración | ❌ Ventana separada | ✅ Dentro de la app |
| Instalación | ✅ Portable incluido | ⚠️ Manual (PHP + phpMyAdmin) |
| Memoria | ~50MB | ~30MB |
| Interfaz | Nativa Windows | Web moderna |
| Multi-plataforma | ❌ Solo Windows | ✅ Funciona donde haya PHP |
| Actualización | Manual | Reemplazar archivos |

## 🐛 Troubleshooting

### Error: "PHP no está instalado"
1. Descargar PHP 8.x Thread Safe desde https://windows.php.net/download/
2. Extraer en `resources/php/`
3. Verificar que existe `resources/php/php.exe`

### Error: "phpMyAdmin no está instalado"
1. Descargar phpMyAdmin desde https://www.phpmyadmin.net/downloads/
2. Extraer en `resources/phpmyadmin/`
3. Verificar que existe `resources/phpmyadmin/index.php`

### Error: "Timeout: El servidor PHP no pudo iniciarse"
1. Verificar que el puerto 8888 está libre
2. Revisar logs de consola (F12)
3. Intentar con otro puerto (sistema lo hará automáticamente)

### phpMyAdmin no se carga en el iframe
1. Verificar en consola del navegador (F12)
2. Abrir manualmente `http://localhost:8888` en navegador externo
3. Revisar si hay errores de PHP en terminal

### Error: "mysqli extension is missing"
1. Verificar que `php.ini` existe en `resources/php/`
2. Sistema debería configurarlo automáticamente
3. Verificar que existe `resources/php/ext/php_mysqli.dll`

## 📝 Notas Técnicas

### Puerto Dinámico
El sistema busca puertos disponibles desde 8888 hasta 8988. Si el puerto 8888 está ocupado, probará 8889, 8890, etc.

### Servidor PHP Embebido
Usa el servidor web integrado de PHP (`php -S`), NO requiere Apache/nginx.

### Proceso en Background
El proceso PHP corre en modo `windowsHide: true` para no mostrar ventana de consola.

### Detención al Cerrar
Al cerrar la aplicación, el sistema automáticamente detiene el servidor PHP.

## 🔮 Futuras Mejoras

- [ ] Auto-descarga de PHP y phpMyAdmin
- [ ] Selector de versión de PHP
- [ ] Múltiples perfiles de conexión
- [ ] Temas personalizados para phpMyAdmin
- [ ] Logs integrados en la UI
- [ ] Backup/restore desde la interfaz
- [ ] Editor SQL con syntax highlighting
