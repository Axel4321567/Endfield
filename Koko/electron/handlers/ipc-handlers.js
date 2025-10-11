import { ipcMain, app, BrowserWindow } from 'electron';

/**
 * Handlers IPC para operaciones generales de la aplicación
 */

export function registerAppHandlers() {
  // Cerrar aplicación
  ipcMain.handle('app-quit', () => {
    console.log('🛑 Cerrando aplicación por solicitud IPC...');
    app.quit();
  });

  // Cerrar ventana
  ipcMain.handle('app-close-window', () => {
    console.log('🪟 Cerrando ventana por solicitud IPC...');
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.close();
    }
  });

  // Minimizar ventana
  ipcMain.handle('app-minimize', () => {
    console.log('📦 Minimizando ventana por solicitud IPC...');
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.minimize();
    }
  });

  // Obtener estado de la aplicación
  ipcMain.handle('app-get-status', () => {
    console.log('📊 Obteniendo estado de la aplicación...');
    return {
      isElectron: true,
      platform: process.platform,
      version: app.getVersion(),
      windows: BrowserWindow.getAllWindows().length
    };
  });

  // Abrir DevTools
  ipcMain.handle('utils-show-devtools', () => {
    console.log('🔧 Abriendo herramientas de desarrollador...');
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.openDevTools();
      return { success: true };
    }
    return { success: false, error: 'No hay ventana activa' };
  });

  // Navegación en webview
  ipcMain.handle('webview-navigate', (_, url) => {
    console.log('🌐 [Koko] Navegación simple en webview:', url);
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('navigate-to-url', url);
      return { success: true, url };
    }
    return { success: false, error: 'No main window found' };
  });

  // Abrir pestaña en navegador
  ipcMain.handle('open-browser-tab', (_, url) => {
    console.log('🎯 [Koko] Abriendo pestaña para:', url);
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('navigate-in-webview', url);
      return { success: true, method: 'internal-webview', url };
    }
    return { success: false, error: 'No main window found' };
  });

  // Abrir página externa
  ipcMain.handle('open-external-page', (_, url) => {
    console.log('🌐 [Koko] Abriendo página externa:', url);
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('open-external', url);
      return { success: true, url };
    }
    return { success: false, error: 'No main window found' };
  });

  // Crear nueva pestaña
  ipcMain.handle('create-new-tab', (_, url, title) => {
    console.log('🆕 [Koko] Creando nueva pestaña:', title, url);
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('create-new-tab', url, title);
      return { success: true, url, title };
    }
    return { success: false, error: 'No main window found' };
  });

  console.log('✅ [IPC] Handlers de aplicación registrados');
}

export default {
  registerAppHandlers
};
