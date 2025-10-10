# 🗄️ Instalación y Configuración de Base de Datos

Esta guía te ayudará a configurar e instalar el sistema de base de datos integrado en Koko Browser, que incluye MariaDB y HeidiSQL para gestión visual.

## 📋 Requisitos

- **Sistema Operativo:** Windows 10/11 (64-bit)
- **Memoria RAM:** Mínimo 4GB (Recomendado 8GB)
- **Espacio en Disco:** Mínimo 2GB libres
- **Permisos:** Administrador para instalación de servicios

## 🚀 Instalación Automática

Koko Browser incluye un sistema automatizado para instalar y configurar MariaDB:

### 1. Acceder al Panel de Base de Datos

1. Abre Koko Browser
2. En el sidebar izquierdo, haz clic en el ícono **🗄️ Database**
3. Se abrirá el panel de gestión de base de datos

### 2. Instalación de MariaDB

1. Si MariaDB no está instalado, verás el botón **"📦 Instalar MariaDB"**
2. Haz clic en el botón y espera a que complete la instalación
3. El proceso incluye:
   - Descarga de MariaDB Server
   - Instalación como servicio de Windows
   - Configuración automática de puerto 3306
   - Creación de la base de datos "KokoDB"
   - Configuración de usuario root

### 3. Control del Servicio

Una vez instalado, puedes controlar el servicio:

- **▶️ Iniciar Servicio:** Inicia MariaDB
- **⏹️ Detener Servicio:** Detiene MariaDB
- **🔄 Actualizar Estado:** Refresca el estado actual

### 4. Abrir HeidiSQL

- Haz clic en **"🖥️ Abrir HeidiSQL"** para lanzar la interfaz visual
- Se abre automáticamente con la conexión preconfigurada a KokoDB

## ⚙️ Configuración Manual

Si prefieres configurar manualmente o hay problemas con la instalación automática:

### Configuración de MariaDB

```sql
-- Conectar como root
mysql -u root -p

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS KokoDB;

-- Crear usuario para la aplicación
CREATE USER 'koko_user'@'localhost' IDENTIFIED BY 'koko_password';
GRANT ALL PRIVILEGES ON KokoDB.* TO 'koko_user'@'localhost';
FLUSH PRIVILEGES;

-- Usar la base de datos
USE KokoDB;
```

### Configuración de HeidiSQL

1. **Host:** localhost
2. **Puerto:** 3306
3. **Usuario:** root (o koko_user)
4. **Contraseña:** (configurada durante instalación)
5. **Base de datos:** KokoDB

## 📁 Estructura de Archivos

```
Koko/
├── resources/
│   ├── mariadb/
│   │   ├── config.ini          # Configuración MariaDB
│   │   ├── install.sql         # Script inicial BD
│   │   └── README.md           # Documentación MariaDB
│   └── heidisql/
│       ├── KokoDB.heidi        # Conexión preconfigurada
│       └── README.md           # Documentación HeidiSQL
└── electron/
    └── automation/
        └── database-manager.js  # Gestión automática
```

## 🔧 Servicios de Windows

### Verificar Estado del Servicio

```powershell
# PowerShell como Administrador
Get-Service -Name "MariaDB"
```

### Iniciar/Detener Manualmente

```powershell
# Iniciar servicio
Start-Service -Name "MariaDB"

# Detener servicio
Stop-Service -Name "MariaDB"

# Reiniciar servicio
Restart-Service -Name "MariaDB"
```

### Configurar Inicio Automático

```powershell
# Configurar inicio automático
Set-Service -Name "MariaDB" -StartupType Automatic
```

## 🌐 Conexión a la Base de Datos

### Información de Conexión

| Parámetro | Valor |
|-----------|-------|
| **Host** | localhost |
| **Puerto** | 3306 |
| **Base de Datos** | KokoDB |
| **Usuario** | root |
| **Contraseña** | [configurada durante instalación] |

### String de Conexión

```
Server=localhost;Port=3306;Database=KokoDB;Uid=root;Pwd=[password];
```

## 🐛 Solución de Problemas

### Error: Puerto 3306 en Uso

```powershell
# Verificar qué proceso usa el puerto
netstat -ano | findstr :3306

# Detener proceso si es necesario
taskkill /PID [PID_NUMBER] /F
```

### Error: Permisos Insuficientes

1. Ejecuta Koko Browser como **Administrador**
2. Verifica que el usuario tenga permisos para instalar servicios
3. Desactiva temporalmente el antivirus si bloquea la instalación

### Error: Servicio No Inicia

```powershell
# Verificar logs de eventos
Get-EventLog -LogName Application -Source "MariaDB"

# Verificar configuración del servicio
sc query MariaDB
```

### Reinstalación Limpia

1. Detener el servicio MariaDB
2. Desinstalar el servicio:
   ```powershell
   sc delete MariaDB
   ```
3. Eliminar archivos de datos en `C:\ProgramData\MariaDB`
4. Reinstalar desde Koko Browser

## 📊 Monitoreo y Mantenimiento

### Verificar Estado desde Koko Browser

- El panel muestra estado en tiempo real
- Actualización automática cada 10 segundos
- Indicadores visuales de estado (🟢 🟠 🔴)

### Información Mostrada

- **Estado:** Running/Stopped/Error
- **Versión:** Versión de MariaDB instalada
- **Tiempo Activo:** Tiempo desde último inicio
- **Conexión:** Host, Puerto, Base de Datos

### Optimización de Rendimiento

```sql
-- Verificar estado de la base de datos
SHOW STATUS;

-- Optimizar tablas
OPTIMIZE TABLE [tabla_name];

-- Verificar tamaño de la base de datos
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'KokoDB'
GROUP BY table_schema;
```

## 🔒 Seguridad

### Recomendaciones

1. **Cambiar contraseña por defecto** del usuario root
2. **Crear usuarios específicos** para diferentes aplicaciones
3. **Limitar conexiones** solo a localhost si no se necesita acceso remoto
4. **Realizar backups regulares** de la base de datos

### Backup de la Base de Datos

```powershell
# Crear backup
mysqldump -u root -p KokoDB > backup_KokoDB.sql

# Restaurar backup
mysql -u root -p KokoDB < backup_KokoDB.sql
```

## 📞 Soporte

Si encuentras problemas durante la instalación o configuración:

1. **Consulta los logs** en el panel de base de datos de Koko Browser
2. **Verifica los requisitos** del sistema
3. **Ejecuta como administrador** si hay problemas de permisos
4. **Consulta la documentación** de MariaDB oficial para problemas específicos

## 📝 Notas Adicionales

- **Firewall:** Windows Defender puede solicitar permisos para MariaDB
- **Antivirus:** Algunos antivirus pueden marcar los archivos como sospechosos
- **Actualizaciones:** Las actualizaciones de MariaDB se manejan de forma independiente
- **Compatibilidad:** Compatible con herramientas estándar MySQL/MariaDB

---

✅ **¡Instalación completada!** Tu base de datos MariaDB está lista para usar con Koko Browser.