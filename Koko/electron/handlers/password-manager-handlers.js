/**
 * 🔐 Password Manager IPC Handlers
 * Gestiona la comunicación IPC para el gestor de contraseñas
 */

import { ipcMain } from 'electron';
import PasswordManagerService from '../services/auth/password-manager-service.js';

/**
 * Registra los handlers IPC para el gestor de contraseñas
 */
export function registerPasswordManagerHandlers() {
  console.log('📡 [PasswordManager] Registrando handlers IPC...');

  // Inicializar tablas
  ipcMain.handle('password-manager:init', async () => {
    try {
      await PasswordManagerService.initializePasswordTables();
      return { success: true };
    } catch (error) {
      console.error('❌ [IPC] Error inicializando tablas:', error);
      return { success: false, error: error.message };
    }
  });

  // Guardar credencial
  ipcMain.handle('password-manager:save-credential', async (event, data) => {
    try {
      const result = await PasswordManagerService.saveCredential(data);
      return result;
    } catch (error) {
      console.error('❌ [IPC] Error guardando credencial:', error);
      return { success: false, error: error.message };
    }
  });

  // Buscar por dominio
  ipcMain.handle('password-manager:find-by-domain', async (event, domain) => {
    try {
      const result = await PasswordManagerService.findCredentialsByDomain(domain);
      return result;
    } catch (error) {
      console.error('❌ [IPC] Error buscando por dominio:', error);
      return { success: false, error: error.message };
    }
  });

  // Buscar por URL
  ipcMain.handle('password-manager:find-by-url', async (event, url) => {
    try {
      const result = await PasswordManagerService.findCredentialsByUrl(url);
      return result;
    } catch (error) {
      console.error('❌ [IPC] Error buscando por URL:', error);
      return { success: false, error: error.message };
    }
  });

  // Actualizar credencial
  ipcMain.handle('password-manager:update-credential', async (event, id, data) => {
    try {
      const result = await PasswordManagerService.updateCredential(id, data);
      return result;
    } catch (error) {
      console.error('❌ [IPC] Error actualizando credencial:', error);
      return { success: false, error: error.message };
    }
  });

  // Marcar como usado
  ipcMain.handle('password-manager:mark-used', async (event, id) => {
    try {
      const result = await PasswordManagerService.markCredentialUsed(id);
      return result;
    } catch (error) {
      console.error('❌ [IPC] Error marcando credencial:', error);
      return { success: false, error: error.message };
    }
  });

  // Eliminar credencial
  ipcMain.handle('password-manager:delete-credential', async (event, id) => {
    try {
      const result = await PasswordManagerService.deleteCredential(id);
      return result;
    } catch (error) {
      console.error('❌ [IPC] Error eliminando credencial:', error);
      return { success: false, error: error.message };
    }
  });

  // Obtener todas las credenciales
  ipcMain.handle('password-manager:get-all', async () => {
    try {
      const result = await PasswordManagerService.getAllCredentials();
      return result;
    } catch (error) {
      console.error('❌ [IPC] Error obteniendo credenciales:', error);
      return { success: false, error: error.message };
    }
  });

  // Guardar token de autenticación
  ipcMain.handle('password-manager:save-token', async (event, data) => {
    try {
      const result = await PasswordManagerService.saveAuthToken(data);
      return result;
    } catch (error) {
      console.error('❌ [IPC] Error guardando token:', error);
      return { success: false, error: error.message };
    }
  });

  // Obtener tokens por servicio
  ipcMain.handle('password-manager:get-tokens', async (event, serviceName) => {
    try {
      const result = await PasswordManagerService.getTokensByService(serviceName);
      return result;
    } catch (error) {
      console.error('❌ [IPC] Error obteniendo tokens:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('✅ [PasswordManager] Handlers IPC registrados');
}

export default {
  registerPasswordManagerHandlers
};
