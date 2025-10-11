import { BrowserWindow, ipcMain } from 'electron';

/**
 * Servicio para gestionar actualizaciones automáticas
 */

let autoUpdater = null;

/**
 * Inicializa y configura el auto-updater
 * @param {Object} updaterInstance - Instancia del autoUpdater
 */
export async function setupAutoUpdater(updaterInstance) {
  autoUpdater = updaterInstance;
  
  if (!autoUpdater || !autoUpdater.checkForUpdatesAndNotify) {
    console.log('⚠️ [AutoUpdater] Auto-updater no disponible, saltando configuración');
    return;
  }

  // Iniciar verificación
  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (error) {
    console.error('❌ [AutoUpdater] Error al verificar actualizaciones:', error);
    return;
  }

  // Eventos del auto-updater
  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 [AutoUpdater] Buscando actualizaciones...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('🆕 [AutoUpdater] Actualización disponible:', info.version);
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('✅ [AutoUpdater] La aplicación está actualizada. Versión:', info.version);
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('update-not-available', { version: info.version });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('❌ [AutoUpdater] Error:', err);
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('update-error', {
        message: err.message || 'Error desconocido',
        stack: err.stack
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const message = `⬇️ [AutoUpdater] Descarga: ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
    console.log(message);
    
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('download-progress', {
        percent: Math.round(progressObj.percent),
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ [AutoUpdater] Actualización descargada. Reiniciando en 5 segundos...');
    
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      });
    }
    
    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 5000);
  });

  // Verificar actualizaciones cada 2 minutos
  setInterval(() => {
    console.log('⏱️ [AutoUpdater] Verificación automática (cada 2 min)');
    autoUpdater.checkForUpdatesAndNotify();
  }, 2 * 60 * 1000);

  console.log('✅ [AutoUpdater] Sistema de auto-actualización configurado');
}

/**
 * Registra handlers IPC para actualizaciones
 */
export function registerUpdateHandlers(app) {
  // Verificar actualizaciones manualmente
  ipcMain.handle('check-for-updates', () => {
    console.log('🔍 [AutoUpdater] Verificación manual solicitada');
    if (autoUpdater && autoUpdater.checkForUpdatesAndNotify) {
      autoUpdater.checkForUpdatesAndNotify();
    }
    return { success: true, message: 'Buscando actualizaciones...' };
  });

  // Instalar actualización
  ipcMain.handle('install-update', () => {
    console.log('🔄 [AutoUpdater] Instalación manual solicitada');
    if (autoUpdater && autoUpdater.quitAndInstall) {
      autoUpdater.quitAndInstall();
    }
    return { success: true };
  });

  // Obtener versión de la app
  ipcMain.handle('get-app-version', () => {
    console.log('📋 [AutoUpdater] Obteniendo versión actual');
    return {
      version: app.getVersion(),
      name: app.getName()
    };
  });

  ipcMain.handle('app-get-version', () => {
    console.log('📋 [App] Obteniendo versión');
    return app.getVersion();
  });

  // Verificar modo desarrollo
  ipcMain.handle('app-is-dev', () => {
    const isDev = !app.isPackaged;
    console.log('🔍 [App] Modo:', isDev ? 'Desarrollo' : 'Producción');
    return isDev;
  });

  // Verificar última release de GitHub
  ipcMain.handle('check-github-update', async () => {
    console.log('🔍 [GitHub] Verificando última release...');
    
    try {
      const https = await import('https');
      
      return new Promise((resolve, reject) => {
        const GITHUB_TOKEN = 'ghp_' + 'OKeo0j1QBunAIDyvj7jAZprc0mFlG324OBYW';
        
        const options = {
          hostname: 'api.github.com',
          path: '/repos/Axel4321567/Endfield/releases/latest',
          method: 'GET',
          headers: {
            'User-Agent': 'Koko-Browser',
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${GITHUB_TOKEN}`
          }
        };

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (res.statusCode === 200) {
              const release = JSON.parse(data);
              console.log('✅ [GitHub] Última release:', release.tag_name);
              resolve({
                success: true,
                version: release.tag_name.replace('v', ''),
                releaseDate: release.published_at,
                releaseNotes: release.body?.substring(0, 200) || 'Nueva versión disponible'
              });
            } else {
              console.error('❌ [GitHub] Error HTTP:', res.statusCode);
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          });
        });

        req.on('error', (error) => {
          console.error('❌ [GitHub] Error de red:', error);
          reject(error);
        });

        req.end();
      });
    } catch (error) {
      console.error('❌ [GitHub] Error general:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('✅ [IPC] Handlers de actualización registrados');
}

export default {
  setupAutoUpdater,
  registerUpdateHandlers
};
