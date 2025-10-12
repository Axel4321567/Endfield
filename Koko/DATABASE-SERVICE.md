# 🗄️ Database Service - Guía de Uso

Servicio para interactuar con la base de datos MariaDB 'koko' desde la aplicación Electron.

## 📦 Instalación

La dependencia `mysql2` ya está instalada y el servicio está configurado automáticamente.

## 🚀 Uso desde el Frontend

### Test de Conexión

```typescript
const result = await window.electronAPI.db.testConnection();
if (result.success) {
  console.log('✅ Conexión exitosa');
} else {
  console.error('❌ Error de conexión:', result.error);
}
```

### Obtener Información de la Base de Datos

```typescript
const result = await window.electronAPI.db.getInfo();
if (result.success) {
  console.log('Versión:', result.data.version);
  console.log('Tablas:', result.data.tables);
  console.log('Total de tablas:', result.data.tableCount);
}
```

### Ejecutar Consultas SQL

```typescript
// SELECT
const users = await window.electronAPI.db.query(
  'SELECT * FROM users WHERE active = ?',
  [true]
);

// INSERT
const insertResult = await window.electronAPI.db.query(
  'INSERT INTO users (name, email) VALUES (?, ?)',
  ['John Doe', 'john@example.com']
);

// UPDATE
const updateResult = await window.electronAPI.db.query(
  'UPDATE users SET email = ? WHERE id = ?',
  ['newemail@example.com', 1]
);

// DELETE
const deleteResult = await window.electronAPI.db.query(
  'DELETE FROM users WHERE id = ?',
  [1]
);
```

### Ejecutar Transacciones

```typescript
const result = await window.electronAPI.db.transaction([
  {
    query: 'INSERT INTO users (name, email) VALUES (?, ?)',
    params: ['User 1', 'user1@example.com']
  },
  {
    query: 'INSERT INTO users (name, email) VALUES (?, ?)',
    params: ['User 2', 'user2@example.com']
  },
  {
    query: 'UPDATE config SET last_update = NOW()'
  }
]);

if (result.success) {
  console.log('✅ Transacción completada');
} else {
  console.error('❌ Transacción fallida:', result.error);
}
```

## 🔧 Uso desde el Backend (Electron Main)

```javascript
import DatabaseService from './services/database-service.js';

// Ejecutar query simple
const users = await DatabaseService.executeQuery('SELECT * FROM users');

// Ejecutar transacción
const result = await DatabaseService.executeTransaction(async (connection) => {
  await connection.execute('INSERT INTO users (name) VALUES (?)', ['User 1']);
  await connection.execute('UPDATE config SET total_users = total_users + 1');
  return { userId: connection.insertId };
});

// Test de conexión
const isConnected = await DatabaseService.testConnection();

// Obtener información
const info = await DatabaseService.getDatabaseInfo();
```

## 📋 Ejemplos de Esquemas

### Crear Tabla de Usuarios

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Crear Tabla de Configuración

```sql
CREATE TABLE config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key_name VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Crear Tabla de Logs

```sql
CREATE TABLE logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  level ENUM('info', 'warn', 'error') DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔒 Seguridad

- ✅ Siempre usa **consultas preparadas** (parametrizadas) para prevenir SQL injection
- ✅ El servicio usa un **pool de conexiones** para mejor rendimiento
- ✅ Las transacciones tienen **rollback automático** en caso de error
- ✅ La conexión usa **localhost** y no está expuesta a la red

## ⚙️ Configuración

La configuración se encuentra en `electron/services/database-service.js`:

```javascript
const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'koko',
  connectionLimit: 10
};
```

## 📊 Funcionalidades

- ✅ Pool de conexiones reutilizables
- ✅ Consultas parametrizadas
- ✅ Soporte de transacciones
- ✅ Auto-rollback en errores
- ✅ Logging detallado
- ✅ Test de conexión
- ✅ Información de base de datos

## 🚀 Estado

El servicio está completamente funcional y listo para usar. La base de datos `koko` ya está creada y lista para recibir tablas y datos.
