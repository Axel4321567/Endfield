/**
 * 🔐 Password Manager Service
 * Servicio para gestionar contraseñas, usuarios y tokens de forma segura
 */

import DatabaseService from './database-service.js';
import crypto from 'crypto';

/**
 * Algoritmo de encriptación
 */
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = crypto.randomBytes(32); // En producción, esto debería venir de un lugar seguro
const IV_LENGTH = 16;

/**
 * Encripta un texto
 */
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Desencripta un texto
 */
function decrypt(encryptedText) {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Inicializa las tablas necesarias para el gestor de contraseñas
 */
export async function initializePasswordTables() {
  try {
    console.log('🔧 [PasswordManager] Creando tablas...');
    
    // Tabla principal de credenciales
    await DatabaseService.executeQuery(`
      CREATE TABLE IF NOT EXISTS credentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        url VARCHAR(500) NOT NULL,
        domain VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        password_encrypted TEXT NOT NULL,
        email VARCHAR(255),
        notes TEXT,
        favicon_url VARCHAR(500),
        times_used INT DEFAULT 0,
        last_used TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_domain (domain),
        INDEX idx_username (username),
        INDEX idx_url (url(255))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // Tabla de tokens de autenticación
    await DatabaseService.executeQuery(`
      CREATE TABLE IF NOT EXISTS auth_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        service_url VARCHAR(500),
        token_type ENUM('oauth', 'api_key', 'bearer', 'session', 'other') DEFAULT 'other',
        token_encrypted TEXT NOT NULL,
        refresh_token_encrypted TEXT,
        expires_at TIMESTAMP NULL,
        scope TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        times_used INT DEFAULT 0,
        last_used TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_service (service_name),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // Tabla de campos personalizados
    await DatabaseService.executeQuery(`
      CREATE TABLE IF NOT EXISTS form_fields (
        id INT AUTO_INCREMENT PRIMARY KEY,
        credential_id INT NOT NULL,
        field_name VARCHAR(255) NOT NULL,
        field_value_encrypted TEXT NOT NULL,
        field_type ENUM('text', 'password', 'email', 'number', 'tel', 'url', 'other') DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE,
        INDEX idx_credential (credential_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('✅ [PasswordManager] Tablas creadas exitosamente');
    return { success: true };
    
  } catch (error) {
    console.error('❌ [PasswordManager] Error creando tablas:', error);
    throw error;
  }
}

/**
 * Guarda una nueva credencial
 */
export async function saveCredential(data) {
  try {
    const { url, domain, username, password, email = null, notes = null, faviconUrl = null } = data;
    
    const passwordEncrypted = encrypt(password);
    
    const result = await DatabaseService.executeQuery(
      `INSERT INTO credentials (url, domain, username, password_encrypted, email, notes, favicon_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [url, domain, username, passwordEncrypted, email, notes, faviconUrl]
    );
    
    console.log('✅ [PasswordManager] Credencial guardada:', result.insertId);
    return { success: true, id: result.insertId };
    
  } catch (error) {
    console.error('❌ [PasswordManager] Error guardando credencial:', error);
    throw error;
  }
}

/**
 * Busca credenciales por dominio
 */
export async function findCredentialsByDomain(domain) {
  try {
    const results = await DatabaseService.executeQuery(
      `SELECT id, url, domain, username, password_encrypted, email, notes, 
              favicon_url, times_used, last_used, created_at
       FROM credentials
       WHERE domain = ?
       ORDER BY times_used DESC, last_used DESC`,
      [domain]
    );
    
    const credentials = results.map(cred => ({
      ...cred,
      password: decrypt(cred.password_encrypted),
      password_encrypted: undefined
    }));
    
    return { success: true, credentials };
    
  } catch (error) {
    console.error('❌ [PasswordManager] Error buscando credenciales:', error);
    throw error;
  }
}

/**
 * Busca credenciales por URL
 */
export async function findCredentialsByUrl(url) {
  try {
    const results = await DatabaseService.executeQuery(
      `SELECT id, url, domain, username, password_encrypted, email, notes,
              favicon_url, times_used, last_used, created_at
       FROM credentials
       WHERE url LIKE ?
       ORDER BY times_used DESC, last_used DESC`,
      [`%${url}%`]
    );
    
    const credentials = results.map(cred => ({
      ...cred,
      password: decrypt(cred.password_encrypted),
      password_encrypted: undefined
    }));
    
    return { success: true, credentials };
    
  } catch (error) {
    console.error('❌ [PasswordManager] Error buscando credenciales:', error);
    throw error;
  }
}

/**
 * Actualiza una credencial
 */
export async function updateCredential(id, data) {
  try {
    const updates = [];
    const values = [];
    
    if (data.username !== undefined) {
      updates.push('username = ?');
      values.push(data.username);
    }
    
    if (data.password !== undefined) {
      const passwordEncrypted = encrypt(data.password);
      updates.push('password_encrypted = ?');
      values.push(passwordEncrypted);
    }
    
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes);
    }
    
    if (updates.length === 0) {
      return { success: true, message: 'No hay cambios' };
    }
    
    values.push(id);
    
    await DatabaseService.executeQuery(
      `UPDATE credentials SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    console.log('✅ [PasswordManager] Credencial actualizada:', id);
    return { success: true };
    
  } catch (error) {
    console.error('❌ [PasswordManager] Error actualizando credencial:', error);
    throw error;
  }
}

/**
 * Marca una credencial como usada
 */
export async function markCredentialUsed(id) {
  try {
    await DatabaseService.executeQuery(
      `UPDATE credentials 
       SET times_used = times_used + 1, last_used = NOW()
       WHERE id = ?`,
      [id]
    );
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ [PasswordManager] Error marcando credencial:', error);
    throw error;
  }
}

/**
 * Elimina una credencial
 */
export async function deleteCredential(id) {
  try {
    await DatabaseService.executeQuery(
      `DELETE FROM credentials WHERE id = ?`,
      [id]
    );
    
    console.log('✅ [PasswordManager] Credencial eliminada:', id);
    return { success: true };
    
  } catch (error) {
    console.error('❌ [PasswordManager] Error eliminando credencial:', error);
    throw error;
  }
}

/**
 * Obtiene todas las credenciales
 */
export async function getAllCredentials() {
  try {
    const results = await DatabaseService.executeQuery(
      `SELECT id, url, domain, username, password_encrypted, email, notes,
              favicon_url, times_used, last_used, created_at
       FROM credentials
       ORDER BY times_used DESC, last_used DESC`
    );
    
    const credentials = results.map(cred => ({
      ...cred,
      password: decrypt(cred.password_encrypted),
      password_encrypted: undefined
    }));
    
    return { success: true, credentials };
    
  } catch (error) {
    console.error('❌ [PasswordManager] Error obteniendo credenciales:', error);
    throw error;
  }
}

/**
 * Guarda un token de autenticación
 */
export async function saveAuthToken(data) {
  try {
    const {
      serviceName,
      serviceUrl = null,
      tokenType = 'other',
      token,
      refreshToken = null,
      expiresAt = null,
      scope = null,
      notes = null
    } = data;
    
    const tokenEncrypted = encrypt(token);
    const refreshTokenEncrypted = refreshToken ? encrypt(refreshToken) : null;
    
    const result = await DatabaseService.executeQuery(
      `INSERT INTO auth_tokens 
       (service_name, service_url, token_type, token_encrypted, refresh_token_encrypted, 
        expires_at, scope, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [serviceName, serviceUrl, tokenType, tokenEncrypted, refreshTokenEncrypted, 
       expiresAt, scope, notes]
    );
    
    console.log('✅ [PasswordManager] Token guardado:', result.insertId);
    return { success: true, id: result.insertId };
    
  } catch (error) {
    console.error('❌ [PasswordManager] Error guardando token:', error);
    throw error;
  }
}

/**
 * Obtiene tokens por servicio
 */
export async function getTokensByService(serviceName) {
  try {
    const results = await DatabaseService.executeQuery(
      `SELECT id, service_name, service_url, token_type, token_encrypted,
              refresh_token_encrypted, expires_at, scope, notes, is_active,
              times_used, last_used, created_at
       FROM auth_tokens
       WHERE service_name = ? AND is_active = TRUE
       ORDER BY created_at DESC`,
      [serviceName]
    );
    
    const tokens = results.map(token => ({
      ...token,
      token: decrypt(token.token_encrypted),
      refreshToken: token.refresh_token_encrypted ? decrypt(token.refresh_token_encrypted) : null,
      token_encrypted: undefined,
      refresh_token_encrypted: undefined
    }));
    
    return { success: true, tokens };
    
  } catch (error) {
    console.error('❌ [PasswordManager] Error obteniendo tokens:', error);
    throw error;
  }
}

export default {
  initializePasswordTables,
  saveCredential,
  findCredentialsByDomain,
  findCredentialsByUrl,
  updateCredential,
  markCredentialUsed,
  deleteCredential,
  getAllCredentials,
  saveAuthToken,
  getTokensByService,
  encrypt,
  decrypt
};
