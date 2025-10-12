import { ipcMain, BrowserWindow } from 'electron';
import { saveDiscordToken, readDiscordToken, deleteDiscordToken } from '../services/auth/discord-token-service.js';

/**
 * Handlers IPC específicos para Discord
 */

export function registerDiscordHandlers() {
  // Recargar Discord
  ipcMain.handle('discord-reload', () => {
    console.log('🔄 [Discord] Recargando Discord webview');
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('discord-reload-request');
      return { success: true };
    }
    return { success: false, error: 'No main window found' };
  });

  // Obtener estado de Discord
  ipcMain.handle('discord-status', () => {
    console.log('📊 [Discord] Obteniendo estado de Discord');
    return {
      connected: true,
      user: null,
      guilds: 0
    };
  });

  // Configurar ajustes de Discord
  ipcMain.handle('discord-set-settings', (_, settings) => {
    console.log('⚙️ [Discord] Configurando ajustes:', settings);
    return { success: true };
  });

  // Obtener configuración de Discord
  ipcMain.handle('discord-get-settings', () => {
    console.log('📋 [Discord] Obteniendo configuración actual');
    return {
      theme: 'dark',
      notifications: true,
      autoStart: false
    };
  });

  // Inyectar CSS personalizado
  ipcMain.handle('discord-inject-css', (_, css) => {
    console.log('🎨 [Discord] Inyectando CSS personalizado');
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('discord-inject-css', css);
      return { success: true };
    }
    return { success: false, error: 'No main window found' };
  });

  // 🔐 Guardar token de Discord
  ipcMain.handle('discord-save-token', (_, token) => {
    console.log('💾 [Discord] Guardando token');
    return saveDiscordToken(token);
  });

  // 🔑 Recuperar token de Discord
  ipcMain.handle('discord-get-token', () => {
    console.log('🔑 [Discord] Recuperando token');
    return readDiscordToken();
  });

  // 🗑️ Eliminar token de Discord
  ipcMain.handle('discord-delete-token', () => {
    console.log('🗑️ [Discord] Eliminando token');
    return deleteDiscordToken();
  });

  // Optimizar Discord
  ipcMain.handle('discord-optimize', () => {
    console.log('🚀 [Discord] Optimizando Discord para mejor rendimiento');
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('discord-optimize-request');
      return { success: true };
    }
    return { success: false, error: 'No main window found' };
  });

  console.log('✅ [IPC] Handlers de Discord registrados');
}

export default {
  registerDiscordHandlers
};
