import { app, BrowserWindow, session, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar cache de Electron para evitar errores de permisos
const userData = app.getPath('userData');
const cacheDir = path.join(userData, 'cache');

// Configurar directorio de cache antes de que la app esté lista
app.setPath('userData', userData);
app.setPath('cache', cacheDir);

// Configuración adicional para compatibilidad con Google
app.commandLine.appendSwitch('--disable-http-cache');
app.commandLine.appendSwitch('--disable-gpu-process-crash-limit');
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

// Configuraciones adicionales para reducir errores de base de datos
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-extensions');
app.commandLine.appendSwitch('--disable-default-apps');
app.commandLine.appendSwitch('--disable-sync');
app.commandLine.appendSwitch('--disable-background-networking');
app.commandLine.appendSwitch('--disable-component-update');

// Configuraciones específicas para bases de datos
app.commandLine.appendSwitch('--disable-databases');
app.commandLine.appendSwitch('--disable-local-storage');
app.commandLine.appendSwitch('--disable-session-storage');
app.commandLine.appendSwitch('--enable-logging');
app.commandLine.appendSwitch('--log-level', '3'); // Solo errores críticos

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: app.isPackaged 
        ? path.join(process.resourcesPath, 'app.asar', 'electron', 'preload.js')
        : path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // Habilitar seguridad web para compatibilidad con Google
      allowRunningInsecureContent: false,
      webviewTag: true, // Habilitar webview tags
      experimentalFeatures: true,
      enableRemoteModule: false,
      sandbox: false,
      partition: 'persist:koko-main', // Usar sesión persistente específica
      nativeWindowOpen: true,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      enableWebSQL: false,
      disableHtmlFullscreenWindowResize: true,
      // Configuraciones específicas para YouTube y media
      enableBlinkFeatures: 'PictureInPictureAPI,BackgroundVideoPlayback,MediaSession',
      disableBlinkFeatures: '',
      autoplayPolicy: 'no-user-gesture-required',
      // Configuraciones adicionales para evitar errores de cache
      backgroundThrottling: false,
      offscreen: false
    },
    icon: path.join(__dirname, '../public/vite.svg'), // Icono de la app
    titleBarStyle: 'default',
    autoHideMenuBar: true // Oculta la barra de menú por defecto
  });

  // Cargar la app React de Vite
  const isDev = !app.isPackaged; // Detectar si es desarrollo o producción
  
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
    
    // DevTools se pueden abrir manualmente con Ctrl+Shift+I o F12
    // win.webContents.openDevTools();
  } else {
    // En producción, buscar el archivo index.html en diferentes ubicaciones posibles
    const possiblePaths = [
      path.join(__dirname, '../dist/index.html'),
      path.join(__dirname, 'dist/index.html'),
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
      // Como fallback, crear una página básica
      win.loadURL('data:text/html,<html><body><h1>Error: No se pudo cargar la aplicación</h1><p>Por favor, contacta al soporte técnico.</p></body></html>');
    }
    
    // DevTools deshabilitadas en producción
    // win.webContents.openDevTools();
  }

  // Manejar navegación externa - crear nueva pestaña en lugar de ventana externa
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log('🆕 [Koko] Solicitando nueva pestaña para:', url);
    
    // Enviar solicitud para crear nueva pestaña en lugar de abrir externamente
    win.webContents.send('create-new-tab', url, 'Nueva Pestaña');
    
    return { action: 'deny' };
  });
}

// Configurar sesión para permitir webview y funcionalidades avanzadas de YouTube
app.whenReady().then(async () => {
  // Configurar cache y sesión para evitar errores de permisos
  const ses = session.defaultSession;
  
  try {
    // Configurar cache de manera más específica y controlada
    await ses.clearCache();
    await ses.clearStorageData({
      storages: ['cookies', 'filesystem', 'shadercache', 'websql'],
      quotas: ['temporary', 'persistent', 'syncable']
    });
    
    console.log('🧹 Cache limpiado para evitar errores de permisos');
  } catch (error) {
    console.warn('⚠️ No se pudo limpiar completamente el cache:', error.message);
  }
  
  // Habilitar webview tags y configurar permisos

  // Configurar argumentos de Chromium para YouTube
  app.commandLine.appendSwitch('enable-features', 'PictureInPictureAPI,MediaSession,BackgroundVideoPlayback');
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  app.commandLine.appendSwitch('enable-blink-features', 'PictureInPictureAPI');
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  
  console.log('🎥 Funcionalidades multimedia habilitadas para YouTube');
  
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
    // Evitar interceptar recursos innecesarios para prevenir loops
    if (details.url.includes('localhost') || 
        details.url.includes('chrome-extension://') ||
        details.url.includes('devtools://') ||
        details.resourceType === 'image' ||
        details.resourceType === 'stylesheet' ||
        details.resourceType === 'font' ||
        details.resourceType === 'media') {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }
    
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
      
      // Headers específicos para funcionalidades de YouTube
      filteredHeaders['Feature-Policy'] = ['picture-in-picture *; autoplay *; fullscreen *; microphone *; camera *'];
      filteredHeaders['Permissions-Policy'] = ['picture-in-picture=*, autoplay=*, fullscreen=*, microphone=*, camera=*'];
      
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

  // Permitir navegación a sitios externos en webviews y configurar permisos específicos
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('🔐 Permiso solicitado:', permission);
    
    // Lista de permisos específicos para YouTube y funcionalidades multimedia
    const allowedPermissions = [
      'media',
      'mediaKeySystem',
      'geolocation',
      'notifications',
      'fullscreen',
      'pointerLock',
      'openExternal',
      'serial',
      'camera',
      'microphone',
      'background-sync',
      'ambient-light-sensor',
      'accelerometer',
      'gyroscope',
      'magnetometer',
      'clipboard-read',
      'clipboard-write',
      'display-capture',
      'midi',
      'midiSysex'
    ];
    
    // Permitir todos los permisos para mejor funcionalidad
    callback(true);
    
    console.log(`✅ Permiso "${permission}" otorgado`);
  });

  // Configurar permisos específicos para Picture-in-Picture y media
  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    console.log('🔍 Verificando permiso:', permission, 'para:', requestingOrigin);
    
    // Permitir automáticamente para YouTube y Google
    if (requestingOrigin.includes('youtube.com') || 
        requestingOrigin.includes('google.com') ||
        requestingOrigin.includes('googleapis.com')) {
      console.log('🎯 Permiso automático para YouTube/Google:', permission);
      return true;
    }
    
    // Permitir por defecto todos los permisos multimedia
    return true;
  });

  // Configurar manejador para ventanas nuevas (Picture-in-Picture)
  ses.setDisplayMediaRequestHandler((request, callback) => {
    console.log('🖥️ Solicitud de captura de pantalla para Picture-in-Picture');
    // Permitir captura de pantalla para Picture-in-Picture
    callback({ video: { mandatory: { chromeMediaSource: 'desktop' } } });
  });

  // Manejar errores de carga específicos (como ERR_BLOCKED_BY_RESPONSE)
  ses.webRequest.onBeforeRequest((details, callback) => {
    // Evitar interceptar recursos innecesarios
    if (details.url.includes('localhost') || 
        details.url.includes('chrome-extension://') ||
        details.url.includes('devtools://')) {
      callback({});
      return;
    }
    
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

  // Configurar cache inteligente para evitar recargas innecesarias
  ses.webRequest.onBeforeRedirect((details) => {
    console.log('🔄 Redirección detectada de:', details.url, 'a:', details.redirectURL);
    
    // Evitar loops de redirección infinitos
    if (details.url === details.redirectURL) {
      console.log('⚠️ Loop de redirección evitado');
      return;
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

// 🧠 Sistema de navegación inteligente - Maneja ERR_ABORTED automáticamente - DESHABILITADO
/* ipcMain.handle('open-browser-tab', (_, url) => {
  console.log('🎯 [Koko] Analizando navegación para:', url);
  
  // Dominios que tienden a fallar con ERR_ABORTED en webview
  const problematicDomains = [
    'google.com',
    'youtube.com', 
    'gmail.com',
    'accounts.google.com',
    'myaccount.google.com',
    'drive.google.com',
    'docs.google.com',
    'sheets.google.com',
    'slides.google.com',
    'photos.google.com',
    'play.google.com',
    'maps.google.com',
    'translate.google.com',
    'calendar.google.com',
    'meet.google.com',
    'chat.google.com'
  ];
  
  // Verificar si la URL contiene algún dominio problemático
  const isProblematic = problematicDomains.some(domain => url.includes(domain));
  
  if (isProblematic) {
    console.log('⚠️ [Koko] Dominio problemático detectado, abriendo en ventana externa:', url);
    
    // Crear nueva ventana independiente para sitios problemáticos
    const newWin = new BrowserWindow({
      width: 1200,
      height: 800,
      parent: BrowserWindow.getFocusedWindow(),
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: true,
        // Configuraciones específicas para Google/YouTube
        enableBlinkFeatures: 'PictureInPictureAPI,BackgroundVideoPlayback,MediaSession',
        autoplayPolicy: 'no-user-gesture-required'
      },
      icon: path.join(__dirname, '../public/vite.svg'),
      title: 'Koko Browser - ' + url,
      show: true
    });
    
    // Cargar la URL en la nueva ventana
    newWin.loadURL(url);
    
    // Manejar navegación externa en la nueva ventana
    newWin.webContents.setWindowOpenHandler(({ url: newUrl }) => {
      import('electron').then(({ shell }) => shell.openExternal(newUrl));
      return { action: 'deny' };
    });
    
    // Log de confirmación
    console.log('✅ [Koko] Ventana externa creada exitosamente para:', url);
    
    return { success: true, method: 'external-window', url };
  } else {
    console.log('✅ [Koko] URL compatible con webview, navegando internamente:', url);
    
    // Para URLs compatibles, enviar al webview principal
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('navigate-in-webview', url);
    }
    
    return { success: true, method: 'internal-webview', url };
  }
});
*/

console.log('✅ [Koko] Manejador de navegación inteligente DESHABILITADO');

console.log('✅ [Koko] Manejador de páginas externas DESHABILITADO (Prompt Maestro)');

// � Manejador simple para navegación en webview (reemplazo simplificado)
ipcMain.handle('webview-navigate', (_, url) => {
  console.log('🌐 [Koko] Navegación simple en webview:', url);
  
  // Simplemente enviar al webview principal para navegación interna
  const mainWin = BrowserWindow.getFocusedWindow();
  if (mainWin) {
    mainWin.webContents.send('navigate-in-webview', url);
    console.log('✅ [Koko] Navegación enviada al webview principal');
    return { success: true, method: 'internal-webview', url };
  } else {
    console.error('❌ [Koko] No se encontró ventana principal para navegación');
    return { success: false, error: 'No main window found' };
  }
});

// 🚀 Manejador para open-browser-tab (simplificado para navegación interna)
ipcMain.handle('open-browser-tab', (_, url) => {
  console.log('🚀 [Koko] Abriendo URL en webview interno:', url);
  
  // Siempre usar navegación interna, sin ventanas externas
  const mainWin = BrowserWindow.getFocusedWindow();
  if (mainWin) {
    mainWin.webContents.send('navigate-in-webview', url);
    console.log('✅ [Koko] URL cargada en webview interno');
    return { success: true, method: 'internal-webview', url };
  } else {
    console.error('❌ [Koko] No se encontró ventana principal');
    return { success: false, error: 'No main window found' };
  }
});

// 🚀 Manejador para open-external-page (simplificado para navegación interna)
ipcMain.handle('open-external-page', (_, url) => {
  console.log('🚀 [Koko] Abriendo página en webview interno (antes externa):', url);
  
  // Siempre usar navegación interna, sin ventanas externas
  const mainWin = BrowserWindow.getFocusedWindow();
  if (mainWin) {
    mainWin.webContents.send('navigate-in-webview', url);
    console.log('✅ [Koko] Página cargada en webview interno');
    return { success: true, method: 'internal-webview', url };
  } else {
    console.error('❌ [Koko] No se encontró ventana principal');
    return { success: false, error: 'No main window found' };
  }
});

// �🆕 Manejador para crear nuevas pestañas desde webview
ipcMain.handle('create-new-tab', (_, url, title) => {
  console.log('🆕 [Koko] Solicitud de nueva pestaña desde webview:', { url, title });
  
  // Enviar al renderer para que cree la nueva pestaña
  const mainWin = BrowserWindow.getFocusedWindow();
  if (mainWin) {
    mainWin.webContents.send('create-new-tab', url, title);
    console.log('✅ [Koko] Solicitud de nueva pestaña enviada al renderer');
    return { success: true, url, title };
  } else {
    console.error('❌ [Koko] No se encontró ventana principal para crear nueva pestaña');
    return { success: false, error: 'No main window found' };
  }
});

console.log('✅ [Koko] Manejador de nuevas pestañas activo');

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

// Manejo de errores no capturados para evitar crashes por errores de base de datos
process.on('uncaughtException', (error) => {
  if (error.message.includes('quota database') || 
      error.message.includes('Database IO error') || 
      error.message.includes('storage')) {
    console.warn('⚠️ Error de almacenamiento ignorado:', error.message);
  } else {
    console.error('❌ Error no capturado:', error);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  if (reason && reason.toString().includes('quota') || 
      reason && reason.toString().includes('storage')) {
    console.warn('⚠️ Promesa rechazada de almacenamiento ignorada:', reason);
  } else {
    console.error('❌ Promesa rechazada no manejada en:', promise, 'razón:', reason);
  }
});

console.log('✅ [Koko] Manejadores de error configurados');

// Inicializar desarrollo
setupDevelopment();