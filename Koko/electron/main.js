import { app, BrowserWindow, session, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Permite cargar contenido externo en webview
      allowRunningInsecureContent: true,
      webviewTag: true, // Habilitar webview tags
      experimentalFeatures: true,
      enableRemoteModule: false,
      sandbox: false,
      partition: 'persist:main', // Usar sesión persistente
      nativeWindowOpen: true,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      enableWebSQL: false,
      disableHtmlFullscreenWindowResize: true
    },
    icon: path.join(__dirname, '../public/vite.svg'), // Icono de la app
    titleBarStyle: 'default',
    autoHideMenuBar: true // Oculta la barra de menú por defecto
  });

  // Cargar la app React de Vite
  const isDev = !app.isPackaged; // Detectar si es desarrollo o producción
  
  console.log('🔍 Modo:', isDev ? 'Desarrollo' : 'Producción');
  
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
    
    // DevTools se pueden abrir manualmente con Ctrl+Shift+I o F12
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Manejar navegación externa
  win.webContents.setWindowOpenHandler(({ url }) => {
    import('electron').then(({ shell }) => shell.openExternal(url));
    return { action: 'deny' };
  });
}

// Configurar sesión para permitir webview
app.whenReady().then(async () => {
  // Habilitar webview tags y configurar permisos
  const ses = session.defaultSession;
  
  // 🔓 Configuración más permisiva para webviews
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    
    // Agregar User-Agent estándar para evitar detección de bot
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    // Headers adicionales para Google y sitios problemáticos
    if (details.url.includes('google.com') || details.url.includes('youtube.com')) {
      headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
      headers['Accept-Language'] = 'en-US,en;q=0.5';
      headers['Accept-Encoding'] = 'gzip, deflate, br';
      headers['Upgrade-Insecure-Requests'] = '1';
      headers['Sec-Fetch-Dest'] = 'document';
      headers['Sec-Fetch-Mode'] = 'navigate';
      headers['Sec-Fetch-Site'] = 'none';
      headers['Cache-Control'] = 'max-age=0';
      
      // Eliminar headers que pueden causar problemas
      delete headers['X-Frame-Options'];
      delete headers['X-Requested-With'];
    }
    
    callback({ requestHeaders: headers });
  });

  // Interceptar todos los headers de respuesta
  ses.webRequest.onHeadersReceived((details, callback) => {
    console.log('🔧 Interceptando headers para:', details.url);
    
    // Filtrar headers problemáticos
    const filteredHeaders = {};
    
    Object.keys(details.responseHeaders || {}).forEach(key => {
      const lowerKey = key.toLowerCase();
      // Eliminar headers que bloquean embedding
      if (!lowerKey.includes('x-frame-options') &&
          !lowerKey.includes('content-security-policy') &&
          !lowerKey.includes('x-content-type-options') &&
          !lowerKey.includes('strict-transport-security') &&
          !lowerKey.includes('cross-origin') &&
          !lowerKey.includes('referrer-policy')) {
        filteredHeaders[key] = details.responseHeaders[key];
      }
    });
    
    // Configuración específica para Google y sitios problemáticos
    if (details.url.includes('google.com') || 
        details.url.includes('youtube.com') ||
        details.url.includes('googleapis.com') ||
        details.url.includes('gstatic.com')) {
      
      // Eliminar completamente headers restrictivos de Google
      delete filteredHeaders['X-Frame-Options'];
      delete filteredHeaders['x-frame-options'];
      delete filteredHeaders['Content-Security-Policy'];
      delete filteredHeaders['content-security-policy'];
      delete filteredHeaders['X-Content-Type-Options'];
      delete filteredHeaders['x-content-type-options'];
      
      // Agregar headers permisivos para Google
      filteredHeaders['X-Frame-Options'] = ['ALLOWALL'];
      filteredHeaders['Access-Control-Allow-Origin'] = ['*'];
      filteredHeaders['Access-Control-Allow-Methods'] = ['GET, POST, PUT, DELETE, OPTIONS'];
      filteredHeaders['Access-Control-Allow-Headers'] = ['*'];
      filteredHeaders['Access-Control-Allow-Credentials'] = ['true'];
      
      console.log('🔓 Headers Google modificados para:', details.url);
    }
    
    // Agregar headers permisivos para sitios externos (no localhost)
    if (!details.url.includes('localhost')) {
      if (!filteredHeaders['Access-Control-Allow-Origin']) {
        filteredHeaders['Access-Control-Allow-Origin'] = ['*'];
      }
      if (!filteredHeaders['Access-Control-Allow-Methods']) {
        filteredHeaders['Access-Control-Allow-Methods'] = ['GET, POST, PUT, DELETE, OPTIONS'];
      }
      if (!filteredHeaders['Access-Control-Allow-Headers']) {
        filteredHeaders['Access-Control-Allow-Headers'] = ['*'];
      }
    }
    
    console.log('✅ Headers filtrados:', Object.keys(filteredHeaders));
    callback({ responseHeaders: filteredHeaders });
  });

  // Permitir navegación a sitios externos en webviews
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('🔐 Permiso solicitado:', permission);
    // Permitir todas las solicitudes de permisos para webviews
    callback(true);
  });

  // Manejar errores de carga específicos (como ERR_BLOCKED_BY_RESPONSE)
  ses.webRequest.onBeforeRequest((details, callback) => {
    // Permitir todas las solicitudes, incluso las que normalmente serían bloqueadas
    console.log('📡 Solicitud interceptada:', details.url);
    callback({});
  });

  // Configuración adicional para bypass de protecciones
  ses.webRequest.onResponseStarted((details) => {
    if (details.statusCode >= 400) {
      console.log('⚠️ Error de respuesta:', details.statusCode, 'para', details.url);
    }
  });

  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Manejadores IPC para controlar la aplicación
ipcMain.handle('app-quit', () => {
  console.log('🛑 Cerrando aplicación por solicitud IPC...');
  app.quit();
});

ipcMain.handle('app-close-window', () => {
  console.log('🪟 Cerrando ventana por solicitud IPC...');
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.close();
  }
});

ipcMain.handle('app-minimize', () => {
  console.log('📦 Minimizando ventana por solicitud IPC...');
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.minimize();
  }
});

ipcMain.handle('app-get-status', () => {
  console.log('📊 Obteniendo estado de la aplicación...');
  return {
    isElectron: true,
    platform: process.platform,
    version: app.getVersion(),
    windows: BrowserWindow.getAllWindows().length
  };
});

// Configuración adicional para desarrollo
async function setupDevelopment() {
  if (process.env.NODE_ENV === 'development') {
    // Recargar automáticamente si hay cambios
    try {
      const electronReload = await import('electron-reload');
      electronReload.default(__dirname, {
        electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
        hardResetMethod: 'exit'
      });
    } catch (error) {
      console.log('electron-reload not available:', error.message);
    }
  }
}

// Inicializar desarrollo
setupDevelopment();