import { app } from 'electron';
import path from 'path';

/**
 * Utilidades para cargar módulos de forma segura en aplicaciones empaquetadas
 */

/**
 * Inicializa autoUpdater de forma segura
 * @returns {Promise<Object>} - Objeto autoUpdater o mock
 */
export async function initializeAutoUpdater() {
  try {
    const updaterModule = await import('electron-updater');
    const autoUpdater = updaterModule.autoUpdater;
    console.log('✅ [AutoUpdater] Módulo cargado exitosamente');
    return autoUpdater;
  } catch (error) {
    console.warn('⚠️ [AutoUpdater] No disponible en esta versión:', error.message);
    // Crear un mock para evitar errores
    return {
      checkForUpdatesAndNotify: () => console.log('AutoUpdater mock - no operation'),
      on: () => {},
      quitAndInstall: () => {}
    };
  }
}

/**
 * Inicializa DatabaseManager de forma segura
 * @returns {Promise<Class>} - Clase DatabaseManager o mock
 */
export async function initializeDatabaseManager() {
  try {
    // Intentar diferentes rutas para aplicaciones empaquetadas vs desarrollo
    const isDev = !app.isPackaged;
    let dbManagerPath;
    
    if (isDev) {
      dbManagerPath = './automation/database-manager.js';
    } else {
      // En aplicaciones empaquetadas, buscar en resources
      dbManagerPath = path.join(process.resourcesPath, 'automation', 'database-manager.js');
    }
    
    console.log('🔍 [DatabaseManager] Intentando cargar desde:', dbManagerPath);
    
    const dbManagerModule = await import(dbManagerPath);
    const DatabaseManager = dbManagerModule.default || dbManagerModule.DatabaseManager;
    console.log('✅ [DatabaseManager] Módulo cargado exitosamente');
    return DatabaseManager;
  } catch (error) {
    console.warn('⚠️ [DatabaseManager] No se pudo cargar:', error.message);
    // Crear un mock para evitar errores
    return class {
      constructor() {
        console.log('DatabaseManager mock creado');
      }
    };
  }
}

export default {
  initializeAutoUpdater,
  initializeDatabaseManager
};
