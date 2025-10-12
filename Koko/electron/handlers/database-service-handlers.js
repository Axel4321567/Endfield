/**
 * 🗄️ Database IPC Handlers
 * Gestiona la comunicación IPC para operaciones de base de datos
 */

import { ipcMain } from 'electron';
import DatabaseService from '../services/database-service.js';

/**
 * Registra los handlers IPC para operaciones de base de datos
 */
export function registerDatabaseServiceHandlers() {
  console.log('📡 [DatabaseService] Registrando handlers IPC...');

  // Test de conexión
  ipcMain.handle('db:test-connection', async () => {
    try {
      const isConnected = await DatabaseService.testConnection();
      return { success: isConnected };
    } catch (error) {
      console.error('❌ [IPC] Error en test de conexión:', error);
      return { success: false, error: error.message };
    }
  });

  // Obtener información de la base de datos
  ipcMain.handle('db:get-info', async () => {
    try {
      const info = await DatabaseService.getDatabaseInfo();
      return { success: true, data: info };
    } catch (error) {
      console.error('❌ [IPC] Error obteniendo info de BD:', error);
      return { success: false, error: error.message };
    }
  });

  // Ejecutar query
  ipcMain.handle('db:query', async (event, query, params = []) => {
    try {
      const result = await DatabaseService.executeQuery(query, params);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ [IPC] Error ejecutando query:', error);
      return { success: false, error: error.message };
    }
  });

  // Ejecutar transacción
  ipcMain.handle('db:transaction', async (event, queries) => {
    try {
      const result = await DatabaseService.executeTransaction(async (connection) => {
        const results = [];
        for (const { query, params } of queries) {
          const [rows] = await connection.execute(query, params || []);
          results.push(rows);
        }
        return results;
      });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ [IPC] Error ejecutando transacción:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('✅ [DatabaseService] Handlers IPC registrados');
}

export default {
  registerDatabaseServiceHandlers
};
