/**
 * PHP IPC Handlers
 * Manejadores de eventos IPC para gestión de PHP
 */

import { ipcMain } from 'electron';
import phpManager from '../automation/php-manager.js';

/**
 * Registrar todos los manejadores de PHP
 */
export function registerPhpHandlers() {
  console.log('📋 [PHP Handlers] Registrando handlers de PHP...');

  /**
   * Handler: php-status
   * Obtiene el estado actual de PHP
   */
  ipcMain.handle('php-status', async () => {
    try {
      console.log('📊 [PHP] Obteniendo estado de PHP...');
      const info = await phpManager.getPhpInfo();
      
      console.log('📥 [PHP] Resultado:', info);
      
      return {
        success: true,
        ...info
      };
    } catch (error) {
      console.error('❌ [PHP] Error al obtener estado:', error);
      return {
        success: false,
        installed: false,
        version: 'Error',
        path: null,
        error: error.message
      };
    }
  });

  /**
   * Handler: php-install
   * Instala PHP portable
   */
  ipcMain.handle('php-install', async (event) => {
    try {
      console.log('🔧 [PHP] Iniciando instalación de PHP...');
      
      // Configurar callback de progreso
      phpManager.setProgressCallback((progress) => {
        event.sender.send('php-install-progress', progress);
      });
      
      const result = await phpManager.install();
      
      console.log('✅ [PHP] Instalación completada:', result);
      return result;
    } catch (error) {
      console.error('❌ [PHP] Error en instalación:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  /**
   * Handler: php-uninstall
   * Desinstala PHP
   */
  ipcMain.handle('php-uninstall', async () => {
    try {
      console.log('🗑️ [PHP] Iniciando desinstalación de PHP...');
      const result = await phpManager.uninstall();
      
      console.log('✅ [PHP] Desinstalación completada:', result);
      return result;
    } catch (error) {
      console.error('❌ [PHP] Error en desinstalación:', error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  console.log('✅ [PHP Handlers] Handlers de PHP registrados correctamente');
}
