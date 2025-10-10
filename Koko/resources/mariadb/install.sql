-- Configuración inicial de MariaDB para Koko Browser
-- Este script se ejecuta automáticamente durante la instalación

-- Crear la base de datos principal
CREATE DATABASE IF NOT EXISTS kokodb;
USE kokodb;

-- Crear tabla de configuraciones de la aplicación
CREATE TABLE IF NOT EXISTS app_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Crear tabla de logs de la aplicación
CREATE TABLE IF NOT EXISTS app_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    log_level ENUM('INFO', 'WARNING', 'ERROR', 'DEBUG') DEFAULT 'INFO',
    message TEXT NOT NULL,
    component VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de sesiones de usuario
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_agent TEXT,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Crear tabla de bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    url TEXT NOT NULL,
    favicon_url TEXT,
    folder VARCHAR(255) DEFAULT 'default',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Crear tabla de historial de navegación
CREATE TABLE IF NOT EXISTS browsing_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    url TEXT NOT NULL,
    title VARCHAR(500),
    visit_count INT DEFAULT 1,
    last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuraciones iniciales
INSERT IGNORE INTO app_config (config_key, config_value) VALUES
('app_version', '1.1.1'),
('database_version', '1.0.0'),
('mariadb_installed', 'true'),
('first_run', 'true'),
('theme', 'dark'),
('language', 'es');

-- Crear usuario específico para Koko Browser (opcional, por seguridad)
-- CREATE USER IF NOT EXISTS 'koko_user'@'localhost' IDENTIFIED BY 'koko_password';
-- GRANT ALL PRIVILEGES ON kokodb.* TO 'koko_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Log de instalación exitosa
INSERT INTO app_logs (log_level, message, component) VALUES
('INFO', 'Database initialized successfully', 'installer');