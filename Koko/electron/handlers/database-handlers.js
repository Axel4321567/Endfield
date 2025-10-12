import { ipcMain } from 'electron';

/**
 * Handlers IPC para gestión de base de datos MariaDB
 */

let databaseManager = null;
let DatabaseManager = null;
let lastKnownStatus = null; // Cache del último estado conocido

/**
 * Asegura que DatabaseManager esté inicializado
 */
async function ensureDatabaseManager() {
  if (!databaseManager) {
    if (!DatabaseManager) {
      const { initializeDatabaseManager } = await import('../utils/module-loader.js');
      DatabaseManager = await initializeDatabaseManager();
    }
    databaseManager = new DatabaseManager();
  }
  return databaseManager;
}

/**
 * Registra handlers IPC para operaciones de base de datos
 */
export function registerDatabaseHandlers() {
  // Instalar MariaDB
  ipcMain.handle('database-install', async (event) => {
    try {
      console.log('🔧 [Database] Iniciando instalación de MariaDB...');
      const manager = await ensureDatabaseManager();
      
      // Configurar callback de progreso si el método existe
      const progressHandler = (progressData) => {
        event.sender.send('database-download-progress', progressData);
      };
      
      if (typeof manager.setProgressCallback === 'function') {
        manager.setProgressCallback(progressHandler);
      }
      
      const result = await manager.install();
      console.log('✅ [Database] Instalación completada:', result);
      
      // Limpiar cache después de instalar
      lastKnownStatus = null;
      
      return result;
    } catch (error) {
      console.error('❌ [Database] Error en instalación:', error);
      return { success: false, error: error.message };
    }
  });

  // Desinstalar MariaDB
  ipcMain.handle('database-uninstall', async () => {
    try {
      console.log('🗑️ [Database] Iniciando desinstalación de MariaDB...');
      const manager = await ensureDatabaseManager();
      const result = await manager.uninstall();
      console.log('✅ [Database] Desinstalación completada:', result);
      
      // Limpiar cache después de desinstalar
      lastKnownStatus = null;
      
      return result;
    } catch (error) {
      console.error('❌ [Database] Error al desinstalar:', error);
      return { success: false, error: error.message };
    }
  });

  // Iniciar servicio MariaDB
  ipcMain.handle('database-start', async (event) => {
    const logToRenderer = (message) => {
      console.log(message);
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.executeJavaScript(`console.log('${message.replace(/'/g, "\\'")}');`);
      }
    };
    
    try {
      logToRenderer('▶️ [Main] === INICIANDO database-start handler ===');
      logToRenderer('▶️ [Main] Obteniendo DatabaseManager...');
      
      const manager = await ensureDatabaseManager();
      logToRenderer('✅ [Main] DatabaseManager obtenido, llamando startMariaDB()...');
      
      const result = await manager.startMariaDB();
      logToRenderer('📥 [Main] === RESPUESTA DE startMariaDB ===');
      logToRenderer('📥 [Main] Resultado: ' + JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      const errorMsg = '❌ [Main] Error al iniciar servicio: ' + error.message;
      logToRenderer(errorMsg);
      return { success: false, error: error.message };
    }
  });

  // Detener servicio MariaDB
  ipcMain.handle('database-stop', async () => {
    try {
      console.log('⏹️ [Database] Deteniendo servicio MariaDB...');
      const manager = await ensureDatabaseManager();
      const result = await manager.stopMariaDB();
      console.log('✅ [Database] Servicio detenido:', result);
      return result;
    } catch (error) {
      console.error('❌ [Database] Error al detener servicio:', error);
      return { success: false, error: error.message };
    }
  });

  // Obtener estado del servicio
  ipcMain.handle('database-status', async (event) => {
    const logToRenderer = (message) => {
      console.log(message);
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.executeJavaScript(`console.log('${message.replace(/'/g, "\\'")}');`);
      }
    };
    
    try {
      logToRenderer('📊 [Main] === INICIANDO database-status handler ===');
      logToRenderer('📊 [Main] Obteniendo estado del servicio...');
      
      const manager = await ensureDatabaseManager();
      logToRenderer('✅ [Main] DatabaseManager obtenido');
      
      const result = await manager.getMariaDBStatus();
      logToRenderer('📥 [Main] === RESPUESTA DE DatabaseManager ===');
      logToRenderer('📥 [Main] Resultado raw: ' + JSON.stringify(result, null, 2));
      
      // Guardar en cache para database-info
      lastKnownStatus = result;
      
      // Adaptar formato para frontend
      const adaptedResult = {
        success: true,
        status: result.state === 'running' ? 'running' : 
                result.state === 'stopped' ? 'stopped' :
                result.state === 'paused' ? 'stopped' :
                result.state === 'not-installed' ? 'error' : 'unknown',
        installed: result.isInstalled,
        serviceName: result.serviceName,
        isRunning: result.isRunning,
        version: result.version || 'No detectada',
        error: result.state === 'not-installed' ? 'MariaDB no está instalado' : undefined
      };
      
      logToRenderer('🔄 [Main] === ESTADO ADAPTADO PARA FRONTEND ===');
      logToRenderer('🔄 [Main] Estado final: ' + JSON.stringify(adaptedResult, null, 2));
      logToRenderer('📤 [Main] Enviando respuesta al renderer...');
      
      return adaptedResult;
    } catch (error) {
      const errorMessage = '❌ [Main] Error al obtener estado: ' + error.message;
      console.error(errorMessage);
      
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.executeJavaScript(`console.error('${errorMessage.replace(/'/g, "\\'")}');`);
      }
      
      const errorResult = { 
        success: false, 
        error: error.message, 
        status: 'unknown',
        installed: false,
        version: 'Error'
      };
      
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.executeJavaScript(`console.log('📤 [Main] Enviando error: ${JSON.stringify(errorResult).replace(/'/g, "\\'")}');`);
      }
      
      return errorResult;
    }
  });

  // Obtener información completa (usa el estado cacheado)
  ipcMain.handle('database-info', async () => {
    try {
      console.log('ℹ️ [Database] Obteniendo información completa (desde cache)...');
      
      // Retornar info estática + estado del cache
      return {
        success: true,
        status: lastKnownStatus?.state || 'unknown',
        installed: lastKnownStatus?.isInstalled || false,
        version: lastKnownStatus?.version || 'N/A',
        port: 3306,
        host: 'localhost',
        database: 'KokoDB',
        uptime: null
      };
    } catch (error) {
      console.error('❌ [Database] Error al obtener información:', error);
      return { 
        success: false, 
        error: error.message,
        status: 'error',
        installed: false,
        version: 'N/A',
        port: 3306,
        host: 'localhost',
        database: 'KokoDB'
      };
    }
  });

  // Ejecutar diagnósticos
  ipcMain.handle('database-diagnostics', async () => {
    try {
      console.log('🔍 [Database] Ejecutando diagnósticos...');
      const manager = await ensureDatabaseManager();
      const result = await manager.runDiagnostics();
      console.log('✅ [Database] Diagnósticos completados:', result);
      return result;
    } catch (error) {
      console.error('❌ [Database] Error en diagnósticos:', error);
      return { 
        success: false, 
        error: error.message,
        issues: [{ 
          type: 'general', 
          message: 'Error ejecutando diagnósticos', 
          solution: 'Reintentar como administrador' 
        }]
      };
    }
  });

  console.log('✅ [IPC] Handlers de base de datos registrados');
}

export default {
  registerDatabaseHandlers
};
