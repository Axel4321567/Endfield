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
      webviewTag: true // Habilitar webview tags
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
    
    // Abrir DevTools en desarrollo
    win.webContents.openDevTools();
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
  // Habilitar webview tags
  const ses = session.defaultSession;
  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' *']
      }
    });
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