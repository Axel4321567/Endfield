import { app, BrowserWindow, session } from 'electron';
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
      sandbox: false
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
    
    // Agregar User-Agent estándar
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
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
    
    // Agregar headers permisivos específicamente para sitios externos
    if (!details.url.includes('localhost')) {
      filteredHeaders['Access-Control-Allow-Origin'] = ['*'];
      filteredHeaders['Access-Control-Allow-Methods'] = ['GET, POST, PUT, DELETE, OPTIONS'];
      filteredHeaders['Access-Control-Allow-Headers'] = ['*'];
      filteredHeaders['X-Frame-Options'] = ['ALLOWALL'];
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