/**
 * 🐘 phpMyAdmin IPC Handlers
 * Gestiona la comunicación entre el frontend y phpMyAdmin
 */

import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

let phpMyAdminManager = null;

/**
 * Inicializa el manager de phpMyAdmin
 */
export function initializePhpMyAdminManager(manager) {
  phpMyAdminManager = manager;
  console.log('✅ PhpMyAdminManager inicializado');
}

/**
 * Registra los handlers IPC para phpMyAdmin
 */
export function registerPhpMyAdminHandlers() {
  console.log('📡 Registrando handlers de phpMyAdmin...');

  // Iniciar servidor phpMyAdmin
  ipcMain.handle('phpmyadmin:start', async () => {
    try {
      console.log('🚀 [IPC] Iniciando phpMyAdmin...');
      
      if (!phpMyAdminManager) {
        throw new Error('PhpMyAdminManager no está inicializado');
      }

      const result = await phpMyAdminManager.start();
      console.log('✅ [IPC] phpMyAdmin iniciado:', result);
      return result;
    } catch (error) {
      console.error('❌ [IPC] Error iniciando phpMyAdmin:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Detener servidor phpMyAdmin
  ipcMain.handle('phpmyadmin:stop', async () => {
    try {
      console.log('🛑 [IPC] Deteniendo phpMyAdmin...');
      
      if (!phpMyAdminManager) {
        throw new Error('PhpMyAdminManager no está inicializado');
      }

      const result = await phpMyAdminManager.stop();
      console.log('✅ [IPC] phpMyAdmin detenido');
      return result;
    } catch (error) {
      console.error('❌ [IPC] Error deteniendo phpMyAdmin:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Obtener estado del servidor
  ipcMain.handle('phpmyadmin:status', async () => {
    try {
      if (!phpMyAdminManager) {
        return {
          isRunning: false,
          phpInstalled: false,
          phpMyAdminInstalled: false,
          url: null,
          port: null
        };
      }

      return phpMyAdminManager.getStatus();
    } catch (error) {
      console.error('❌ [IPC] Error obteniendo estado:', error);
      return {
        isRunning: false,
        error: error.message
      };
    }
  });

  // Handler para obtener estado de instalación de phpMyAdmin
  ipcMain.handle('phpmyadmin-status', async () => {
    try {
      console.log('📊 [IPC] Obteniendo estado de phpMyAdmin...');
      
      if (!phpMyAdminManager) {
        return {
          installed: false,
          version: null,
          path: null,
          configPath: null
        };
      }

      const phpMyAdminInstalled = phpMyAdminManager.isPhpMyAdminInstalled();
      
      let version = null;
      if (phpMyAdminInstalled) {
        // Detectar versión desde archivo RELEASE-DATE-X.Y.Z
        const phpMyAdminPath = phpMyAdminManager.phpMyAdminPath;
        
        try {
          const files = fs.readdirSync(phpMyAdminPath);
          const releaseFile = files.find(f => f.startsWith('RELEASE-DATE-'));
          if (releaseFile) {
            version = releaseFile.replace('RELEASE-DATE-', '');
          }
        } catch (err) {
          console.error('Error detectando versión:', err);
        }
      }
      
      const result = {
        installed: phpMyAdminInstalled,
        version: version,
        path: phpMyAdminInstalled ? phpMyAdminManager.phpMyAdminPath : null,
        configPath: phpMyAdminInstalled ? path.join(phpMyAdminManager.phpMyAdminPath, 'config.inc.php') : null
      };
      
      console.log('✅ [IPC] Estado phpMyAdmin:', result);
      return result;
    } catch (error) {
      console.error('❌ [IPC] Error obteniendo estado:', error);
      return {
        installed: false,
        error: error.message
      };
    }
  });

  // Handler para instalar phpMyAdmin
  ipcMain.handle('phpmyadmin-install', async (event) => {
    try {
      console.log('📥 [IPC] Instalando phpMyAdmin...');
      
      if (!phpMyAdminManager) {
        throw new Error('PhpMyAdminManager no está inicializado');
      }

      // Callback para progreso
      const progressCallback = (progress) => {
        event.sender.send('phpmyadmin-install-progress', progress);
      };

      const result = await phpMyAdminManager.install(progressCallback);
      return result;

    } catch (error) {
      console.error('❌ [IPC] Error instalando phpMyAdmin:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  // Handler para desinstalar phpMyAdmin
  ipcMain.handle('phpmyadmin-uninstall', async () => {
    try {
      console.log('🗑️ [IPC] Desinstalando phpMyAdmin...');
      
      if (!phpMyAdminManager) {
        throw new Error('PhpMyAdminManager no está inicializado');
      }

      const result = await phpMyAdminManager.uninstall();
      return result;

    } catch (error) {
      console.error('❌ [IPC] Error desinstalando phpMyAdmin:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  console.log('✅ Handlers de phpMyAdmin registrados');
}
