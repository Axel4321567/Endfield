/**
 * 🗄️ Database Service - Koko Browser
 * Servicio para interactuar con la base de datos MariaDB 'koko'
 */

import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuración de conexión a la base de datos
 */
const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'koko',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

/**
 * Pool de conexiones a la base de datos
 */
let pool = null;

/**
 * Inicializa el pool de conexiones
 */
export function initializePool() {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
    console.log('✅ [DatabaseService] Pool de conexiones inicializado');
  }
  return pool;
}

/**
 * Obtiene una conexión del pool
 */
export async function getConnection() {
  if (!pool) {
    initializePool();
  }
  
  try {
    const connection = await pool.getConnection();
    console.log('🔗 [DatabaseService] Conexión obtenida del pool');
    return connection;
  } catch (error) {
    console.error('❌ [DatabaseService] Error obteniendo conexión:', error);
    throw error;
  }
}

/**
 * Ejecuta una consulta SQL
 * @param {string} query - Consulta SQL
 * @param {Array} params - Parámetros de la consulta
 * @returns {Promise<Array>} - Resultado de la consulta
 */
export async function executeQuery(query, params = []) {
  const connection = await getConnection();
  
  try {
    console.log('📊 [DatabaseService] Ejecutando query:', query);
    const [rows] = await connection.execute(query, params);
    return rows;
  } catch (error) {
    console.error('❌ [DatabaseService] Error ejecutando query:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Ejecuta múltiples consultas en una transacción
 * @param {Function} callback - Función que recibe la conexión y ejecuta las queries
 * @returns {Promise<any>} - Resultado de la transacción
 */
export async function executeTransaction(callback) {
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();
    console.log('🔄 [DatabaseService] Transacción iniciada');
    
    const result = await callback(connection);
    
    await connection.commit();
    console.log('✅ [DatabaseService] Transacción completada');
    
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('❌ [DatabaseService] Transacción revertida:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Verifica la conexión a la base de datos
 * @returns {Promise<boolean>} - True si la conexión es exitosa
 */
export async function testConnection() {
  try {
    const connection = await getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ [DatabaseService] Conexión a la base de datos exitosa');
    return true;
  } catch (error) {
    console.error('❌ [DatabaseService] Error de conexión:', error);
    return false;
  }
}

/**
 * Cierra el pool de conexiones
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔒 [DatabaseService] Pool de conexiones cerrado');
  }
}

/**
 * Obtiene información sobre el estado de la base de datos
 */
export async function getDatabaseInfo() {
  try {
    const connection = await getConnection();
    
    // Obtener tablas
    const [tables] = await connection.query(
      "SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'koko'"
    );
    
    // Obtener versión de MariaDB
    const [version] = await connection.query("SELECT VERSION() as version");
    
    connection.release();
    
    return {
      version: version[0].version,
      tables: tables,
      tableCount: tables.length
    };
  } catch (error) {
    console.error('❌ [DatabaseService] Error obteniendo info de BD:', error);
    throw error;
  }
}

// Exportar configuración (solo lectura)
export const config = { ...DB_CONFIG };

export default {
  initializePool,
  getConnection,
  executeQuery,
  executeTransaction,
  testConnection,
  closePool,
  getDatabaseInfo,
  config
};
