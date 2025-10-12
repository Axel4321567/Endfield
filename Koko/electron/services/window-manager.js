import { BrowserWindow, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Servicio para gestionar ventanas de Electron
 */

/**
 * Crea la ventana principal de la aplicación
 * @returns {Promise<BrowserWindow>} - Ventana principal
 */
export async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../../src-tauri/icons/Icon.ico'),
    webPreferences: {
      preload: app.isPackaged 
        ? path.join(process.resourcesPath, 'app.asar', 'electron', 'preload.js')
        : path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: true,
      experimentalFeatures: true,
      enableRemoteModule: false,
      sandbox: false,
      partition: 'persist:koko-main',
      nativeWindowOpen: true,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      enableWebSQL: false,
      disableHtmlFullscreenWindowResize: true,
      enableBlinkFeatures: 'PictureInPictureAPI,BackgroundVideoPlayback,MediaSession',
      disableBlinkFeatures: '',
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false,
      offscreen: false
    },
    titleBarStyle: 'default',
    autoHideMenuBar: true
  });

  // Cargar la app React de Vite
  const isDev = !app.isPackaged;
  
  console.log('🔍 Modo:', isDev ? 'Desarrollo' : 'Producción');
  console.log('🔍 __dirname:', __dirname);
  console.log('🔍 app.getAppPath():', app.getAppPath());
  
  if (isDev) {
    // Intentar diferentes puertos para desarrollo
    const possiblePorts = [5173, 5174, 5175, 5176];
    let loaded = false;
    
    for (const port of possiblePorts) {
      try {
        await win.loadURL(`http://localhost:${port}`);
        console.log(`✅ Conectado a Vite en puerto ${port}`);
        loaded = true;
        break;
      } catch (error) {
        console.log(`❌ Puerto ${port} no disponible:`, error.message);
      }
    }
    
    if (!loaded) {
      console.error('❌ No se pudo conectar a ningún puerto de Vite');
    }
  } else {
    // En producción, buscar el archivo index.html en diferentes ubicaciones posibles
    const possiblePaths = [
      path.join(__dirname, '../../dist/index.html'),
      path.join(__dirname, '../dist/index.html'),
      path.join(app.getAppPath(), 'dist/index.html'),
      path.join(process.resourcesPath, 'dist/index.html')
    ];
    
    let loaded = false;
    for (const htmlPath of possiblePaths) {
      try {
        console.log('🔍 Intentando cargar:', htmlPath);
        await win.loadFile(htmlPath);
        console.log('✅ Archivo cargado exitosamente:', htmlPath);
        loaded = true;
        break;
      } catch (error) {
        console.log('❌ No se pudo cargar:', htmlPath, error.message);
      }
    }
    
    if (!loaded) {
      console.error('❌ No se pudo cargar ningún archivo HTML');
      win.loadURL('data:text/html,<html><body><h1>Error: No se pudo cargar la aplicación</h1><p>Por favor, contacta al soporte técnico.</p></body></html>');
    }
  }

  // Interceptar respuestas para modificar cabeceras de seguridad
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    // Permitir que localhost se cargue en iframes
    if (details.url.includes('localhost')) {
      const responseHeaders = { ...details.responseHeaders };
      
      // Eliminar cabeceras que bloquean iframe
      delete responseHeaders['x-frame-options'];
      delete responseHeaders['X-Frame-Options'];
      delete responseHeaders['content-security-policy'];
      delete responseHeaders['Content-Security-Policy'];
      
      callback({ responseHeaders });
    } else {
      callback({ responseHeaders: details.responseHeaders });
    }
  });

  // Manejar navegación externa - crear nueva pestaña en lugar de ventana externa
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log('🆕 [Koko] Solicitando nueva pestaña para:', url);
    win.webContents.send('create-new-tab', url, 'Nueva Pestaña');
    return { action: 'deny' };
  });

  // Configurar atajos de teclado para DevTools
  win.webContents.on('before-input-event', (event, input) => {
    // F12
    if (input.key === 'F12' && input.type === 'keyDown') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
    
    // Ctrl+Shift+I o Cmd+Shift+I
    if (input.key === 'I' && input.shift && (input.control || input.meta) && input.type === 'keyDown') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
    
    // Ctrl+Shift+C (inspector de elementos)
    if (input.key === 'C' && input.shift && (input.control || input.meta) && input.type === 'keyDown') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  return win;
}

export default {
  createWindow
};
