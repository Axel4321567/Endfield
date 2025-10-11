import { app, BrowserWindow, session, ipcMain, globalShortcut } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar DatabaseManager de forma segura para aplicaciones empaquetadas
let DatabaseManager = null;

// Instancia global del DatabaseManager
let databaseManager = null;

// Importar autoUpdater de forma segura
let autoUpdater = null;

// Función para inicializar autoUpdater
async function initializeAutoUpdater() {
  try {
    const updaterModule = await import('electron-updater');
    autoUpdater = updaterModule.autoUpdater;
    console.log('✅ [AutoUpdater] Módulo cargado exitosamente');
    return true;
  } catch (error) {
    console.warn('⚠️ [AutoUpdater] No disponible en esta versión:', error.message);
    // Crear un mock para evitar errores
    autoUpdater = {
      checkForUpdatesAndNotify: () => console.log('AutoUpdater mock - no operation'),
      on: () => {},
      quitAndInstall: () => {}
    };
    return false;
  }
}

// Función para inicializar DatabaseManager
async function initializeDatabaseManager() {
  try {
    // Intentar diferentes rutas para aplicaciones empaquetadas vs desarrollo
    const isDev = !app.isPackaged;
    let dbManagerPath;
    
    if (isDev) {
      dbManagerPath = './automation/database-manager.js';
    } else {
      // En aplicaciones empaquetadas, buscar en resources
      dbManagerPath = path.join(process.resourcesPath, 'automation', 'database-manager.js');
    }
    
    console.log('🔍 [DatabaseManager] Intentando cargar desde:', dbManagerPath);
    
    const dbManagerModule = await import(dbManagerPath);
    DatabaseManager = dbManagerModule.default || dbManagerModule.DatabaseManager;
    console.log('✅ [DatabaseManager] Módulo cargado exitosamente');
    return true;
  } catch (error) {
    console.warn('⚠️ [DatabaseManager] No se pudo cargar:', error.message);
    // Crear un mock para evitar errores
    DatabaseManager = class {
      constructor() {
        console.log('DatabaseManager mock creado');
      }
    };
    return false;
  }
}

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

// Configuraciones específicas para bases de datos - MANTENEMOS STORAGE PARA DISCORD
// app.commandLine.appendSwitch('--disable-databases'); // Comentado para permitir persistencia
// app.commandLine.appendSwitch('--disable-local-storage'); // Comentado para Discord
// app.commandLine.appendSwitch('--disable-session-storage'); // Comentado para Discord
app.commandLine.appendSwitch('--enable-logging');
app.commandLine.appendSwitch('--log-level', '3'); // Solo errores críticos

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../src-tauri/icons/Icon.ico'),
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
    win.webContents.openDevTools();
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
    
    // DevTools habilitadas para debugging
    win.webContents.openDevTools();
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
  
  // 🔄 CONFIGURACIÓN ESPECÍFICA PARA DISCORD - SESIÓN PERSISTENTE
  const discordSession = session.fromPartition('persist:discord', { cache: true });
  
  // Configurar Discord session para mantener datos
  discordSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Permitir todas las cookies para Discord
  try {
    await discordSession.cookies.set({
      url: 'https://discord.com',
      name: 'discord_persistent',
      value: 'true',
      secure: true,
      httpOnly: false,
      sameSite: 'no_restriction',
      expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 año
    });
    
    await discordSession.cookies.set({
      url: 'https://discord.com',
      name: 'discord_auto_login',
      value: 'enabled',
      secure: true,
      httpOnly: false,
      sameSite: 'no_restriction',
      expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
    });
    
    await discordSession.cookies.set({
      url: 'https://discord.com',
      name: 'discord_remember_me',
      value: 'true',
      secure: true,
      httpOnly: false,
      sameSite: 'no_restriction',
      expirationDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
    });
    
    console.log('🍪 [Discord] Cookies persistentes configuradas');
  } catch (err) {
    console.warn('❌ No se pudieron configurar cookies Discord:', err);
  }
  
  // Configurar permisos para Discord
  discordSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('🔐 [Discord] Permiso solicitado:', permission);
    
    // Permitir notificaciones, micrófono, cámara para Discord
    if (permission === 'notifications' || 
        permission === 'microphone' || 
        permission === 'camera' ||
        permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });
  
  console.log('💾 [Discord] Sesión persistente configurada correctamente');
  
  // NO LIMPIAR CACHE - Mantener datos de Discord
  console.log('🧹 Cache preservado para mantener sesión de Discord');
  
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
    
    // Headers adicionales para Google, Discord y sitios problemáticos
    if (details.url.includes('google.com') || 
        details.url.includes('youtube.com') ||
        details.url.includes('discord.com') ||
        details.url.includes('discordapp.com')) {
      headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
      headers['Accept-Language'] = 'en-US,en;q=0.5';
      headers['Accept-Encoding'] = 'gzip, deflate, br';
      headers['Upgrade-Insecure-Requests'] = '1';
      headers['Sec-Fetch-Dest'] = 'document';
      headers['Sec-Fetch-Mode'] = 'navigate';
      headers['Sec-Fetch-Site'] = 'none';
      headers['Cache-Control'] = 'max-age=0';
      
      // Headers específicos para Discord
      if (details.url.includes('discord.com') || details.url.includes('discordapp.com')) {
        headers['Sec-Fetch-Site'] = 'same-origin';
        headers['Sec-Fetch-User'] = '?1';
        headers['Discord-Client'] = 'web';
      }
      
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
    
    // Configuración específica para Google, Discord y sitios problemáticos
    if (details.url.includes('google.com') || 
        details.url.includes('youtube.com') ||
        details.url.includes('googleapis.com') ||
        details.url.includes('gstatic.com') ||
        details.url.includes('discord.com') ||
        details.url.includes('discordapp.com')) {
      
      // Eliminar completamente headers restrictivos
      delete filteredHeaders['X-Frame-Options'];
      delete filteredHeaders['x-frame-options'];
      delete filteredHeaders['Content-Security-Policy'];
      delete filteredHeaders['content-security-policy'];
      delete filteredHeaders['X-Content-Type-Options'];
      delete filteredHeaders['x-content-type-options'];
      
      // Agregar headers permisivos
      filteredHeaders['X-Frame-Options'] = ['ALLOWALL'];
      filteredHeaders['Access-Control-Allow-Origin'] = ['*'];
      filteredHeaders['Access-Control-Allow-Methods'] = ['GET, POST, PUT, DELETE, OPTIONS'];
      filteredHeaders['Access-Control-Allow-Headers'] = ['*'];
      filteredHeaders['Access-Control-Allow-Credentials'] = ['true'];
      
      // Headers específicos para funcionalidades multimedia
      filteredHeaders['Feature-Policy'] = ['picture-in-picture *; autoplay *; fullscreen *; microphone *; camera *'];
      filteredHeaders['Permissions-Policy'] = ['picture-in-picture=*, autoplay=*, fullscreen=*, microphone=*, camera=*'];
      
      // Headers específicos para Discord
      if (details.url.includes('discord.com') || details.url.includes('discordapp.com')) {
        filteredHeaders['Access-Control-Allow-Credentials'] = ['true'];
        filteredHeaders['Cross-Origin-Embedder-Policy'] = ['unsafe-none'];
        filteredHeaders['Cross-Origin-Opener-Policy'] = ['unsafe-none'];
        console.log('� Headers Discord configurados para:', details.url);
      }
      
      console.log('🔓 Headers modificados para:', details.url);
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
    
    // Permitir automáticamente para YouTube, Google y Discord
    if (requestingOrigin.includes('youtube.com') || 
        requestingOrigin.includes('google.com') ||
        requestingOrigin.includes('googleapis.com') ||
        requestingOrigin.includes('discord.com') ||
        requestingOrigin.includes('discordapp.com')) {
      console.log('🎯 Permiso automático para YouTube/Google/Discord:', permission);
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

  // Configurar atajos de teclado para DevTools
  try {
    // F12 para abrir DevTools
    globalShortcut.register('F12', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.webContents.openDevTools();
      }
    });

    // Ctrl+Shift+I para abrir DevTools (atajo estándar)
    globalShortcut.register('CmdOrCtrl+Shift+I', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.webContents.openDevTools();
      }
    });

    console.log('⌨️ Atajos de teclado para DevTools configurados: F12, Ctrl+Shift+I');
  } catch (error) {
    console.error('❌ Error configurando atajos:', error);
  }

  // Inicializar auto-updater después de crear la ventana
  await setupAutoUpdater();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Limpiar atajos de teclado
  globalShortcut.unregisterAll();
  
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

// Handler para abrir DevTools
ipcMain.handle('utils-show-devtools', () => {
  console.log('🔧 Abriendo herramientas de desarrollador...');
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.webContents.openDevTools();
    return { success: true };
  }
  return { success: false, error: 'No hay ventana activa' };
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
      icon: path.join(__dirname, '../src-tauri/icons/Icon.ico'),
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

// 🔄 Manejadores para el sistema de actualización
ipcMain.handle('system-update', async () => {
  console.log('🚀 [System] Ejecutando actualización del sistema');
  
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    // Cambiar al directorio del proyecto
    const projectDir = app.getAppPath();
    console.log('📁 [System] Directorio del proyecto:', projectDir);
    
    // Ejecutar comandos de actualización
    console.log('📥 [System] Descargando cambios...');
    await execAsync('git fetch origin main', { cwd: projectDir });
    
    console.log('🔄 [System] Aplicando cambios...');
    await execAsync('git reset --hard origin/main', { cwd: projectDir });
    
    console.log('📦 [System] Instalando dependencias...');
    await execAsync('npm install', { cwd: projectDir });
    
    console.log('🏗️ [System] Construyendo aplicación...');
    await execAsync('npm run build', { cwd: projectDir });
    
    console.log('✅ [System] Actualización completada exitosamente');
    return { success: true, message: 'Actualización completada' };
    
  } catch (error) {
    console.error('❌ [System] Error durante la actualización:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('system-restart', () => {
  console.log('🔄 [System] Reiniciando aplicación...');
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('system-info', () => {
  console.log('📊 [System] Obteniendo información del sistema');
  return {
    platform: process.platform,
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    appPath: app.getAppPath(),
    userData: app.getPath('userData')
  };
});

console.log('✅ [Koko] Manejadores de sistema activos');

// Manejadores IPC para Discord
ipcMain.handle('discord-reload', () => {
  console.log('🔄 [Discord] Recargando Discord webview');
  const mainWin = BrowserWindow.getFocusedWindow();
  if (mainWin) {
    mainWin.webContents.send('discord-reload-request');
    return { success: true };
  }
  return { success: false, error: 'No main window found' };
});

ipcMain.handle('discord-status', () => {
  console.log('📊 [Discord] Obteniendo estado de Discord');
  // En un escenario real, aquí consultarías el estado real de Discord
  return {
    connected: true,
    user: null, // Se llenaría con datos reales
    guilds: 0
  };
});

ipcMain.handle('discord-set-settings', (_, settings) => {
  console.log('⚙️ [Discord] Configurando ajustes:', settings);
  // En un escenario real, aquí guardarías la configuración
  return { success: true };
});

ipcMain.handle('discord-get-settings', () => {
  console.log('📋 [Discord] Obteniendo configuración actual');
  // En un escenario real, aquí cargarías la configuración guardada
  return {
    theme: 'dark',
    notifications: true,
    autoStart: false
  };
});

ipcMain.handle('discord-inject-css', (_, css) => {
  console.log('🎨 [Discord] Inyectando CSS personalizado');
  const mainWin = BrowserWindow.getFocusedWindow();
  if (mainWin) {
    mainWin.webContents.send('discord-inject-css', css);
    return { success: true };
  }
  return { success: false, error: 'No main window found' };
});

ipcMain.handle('discord-optimize', () => {
  console.log('🚀 [Discord] Optimizando Discord para mejor rendimiento');
  const mainWin = BrowserWindow.getFocusedWindow();
  if (mainWin) {
    mainWin.webContents.send('discord-optimize-request');
    return { success: true };
  }
  return { success: false, error: 'No main window found' };
});

console.log('✅ [Koko] Manejadores de Discord activos');

// ========================
// AUTO-UPDATER CONFIGURATION
// ========================

// Función para configurar auto-updater después de inicializar
async function setupAutoUpdater() {
  const isUpdaterAvailable = await initializeAutoUpdater();
  
  if (!isUpdaterAvailable || !autoUpdater) {
    console.log('⚠️ [AutoUpdater] Auto-updater no disponible, saltando configuración');
    return;
  }

  // Configurar auto-updater
  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (error) {
    console.error('❌ [AutoUpdater] Error al verificar actualizaciones:', error);
    return;
  }

  // Configurar eventos del auto-updater
  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 [AutoUpdater] Buscando actualizaciones...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('🆕 [AutoUpdater] Actualización disponible:', info.version);
    
    // Notificar al renderer sobre la actualización disponible
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
    console.log('✅ [AutoUpdater] La aplicación está actualizada. Versión actual:', info.version);
    
    // Notificar al renderer
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('update-not-available', {
        version: info.version
      });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('❌ [AutoUpdater] Error en auto-updater:', err);
    
    // Notificar error al renderer
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('update-error', {
        message: err.message || 'Error desconocido',
        stack: err.stack
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "⬇️ [AutoUpdater] Descarga en progreso: " + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log(log_message);
    
    // Notificar progreso al renderer
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
    console.log('✅ [AutoUpdater] Actualización descargada. La aplicación se reiniciará en 5 segundos...');
    
    // Notificar al renderer que la actualización está lista
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      mainWin.webContents.send('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      });
    }
    
    // Reiniciar la aplicación automáticamente después de 5 segundos
    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 5000);
  });

  // Verificar actualizaciones cada 2 minutos (para pruebas)
  setInterval(() => {
    console.log('⏱️ [AutoUpdater] Verificación automática de actualizaciones (cada 2 min)');
    autoUpdater.checkForUpdatesAndNotify();
  }, 2 * 60 * 1000); // 2 minutos

  console.log('✅ [AutoUpdater] Sistema de auto-actualización configurado');
}

// Manejadores IPC para auto-updater
ipcMain.handle('check-for-updates', () => {
  console.log('🔍 [AutoUpdater] Verificación manual de actualizaciones solicitada');
  if (autoUpdater && autoUpdater.checkForUpdatesAndNotify) {
    autoUpdater.checkForUpdatesAndNotify();
  }
  return { success: true, message: 'Buscando actualizaciones...' };
});

ipcMain.handle('install-update', () => {
  console.log('🔄 [AutoUpdater] Instalación manual de actualización solicitada');
  if (autoUpdater && autoUpdater.quitAndInstall) {
    autoUpdater.quitAndInstall();
  }
  return { success: true };
});

ipcMain.handle('get-app-version', () => {
  console.log('📋 [AutoUpdater] Obteniendo versión actual de la aplicación');
  return {
    version: app.getVersion(),
    name: app.getName()
  };
});

ipcMain.handle('app-get-version', () => {
  console.log('📋 [App] Obteniendo versión actual');
  return app.getVersion();
});

// Handler para verificar si estamos en modo desarrollo
ipcMain.handle('app-is-dev', () => {
  const isDev = !app.isPackaged;
  console.log('🔍 [App] Modo:', isDev ? 'Desarrollo' : 'Producción');
  return isDev;
});

// Handler para verificar actualizaciones usando el token de GitHub desde el backend
ipcMain.handle('check-github-update', async () => {
  console.log('🔍 [GitHub] Verificando última release...');
  
  try {
    const https = await import('https');
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/Axel4321567/Endfield/releases/latest',
        method: 'GET',
        headers: {
          'User-Agent': 'Koko-Browser',
          'Accept': 'application/vnd.github.v3+json',
          // Token de GitHub desde variable de entorno (no hardcodear en código)
          ...(process.env.GH_TOKEN && { 'Authorization': `token ${process.env.GH_TOKEN}` })
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

// ===== DATABASE MANAGEMENT IPC HANDLERS =====

// Inicializar DatabaseManager cuando sea necesario
async function ensureDatabaseManager() {
  if (!databaseManager) {
    if (!DatabaseManager) {
      await initializeDatabaseManager();
    }
    databaseManager = new DatabaseManager();
  }
  return databaseManager;
}

// Handler para instalar MariaDB
ipcMain.handle('database-install', async (event) => {
  try {
    console.log('🔧 [Database] Iniciando instalación de MariaDB...');
    const manager = await ensureDatabaseManager();
    
    // Configurar listener para progreso de descarga
    const progressHandler = (progressData) => {
      event.sender.send('database-download-progress', progressData);
    };
    
    // Configurar el manager para enviar eventos de progreso
    manager.setProgressCallback(progressHandler);
    
    const result = await manager.install();
    console.log('✅ [Database] Instalación completada:', result);
    return result;
  } catch (error) {
    console.error('❌ [Database] Error en instalación:', error);
    return { success: false, error: error.message };
  }
});

// Handler para iniciar servicio MariaDB
ipcMain.handle('database-start', async (event) => {
  const logToRenderer = (message) => {
    console.log(message);
    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.executeJavaScript(`console.log('${message.replace(/'/g, "\\'")}');`);
    }
  };
  
  try {
    logToRenderer('▶️ [Main] === INICIANDO database-start handler ===');
    logToRenderer('▶️ [Main] Obteniendo DatabaseManager...');
    
    const manager = await ensureDatabaseManager();
    logToRenderer('✅ [Main] DatabaseManager obtenido, llamando startMariaDB()...');
    
    const result = await manager.startMariaDB();
    logToRenderer('📥 [Main] === RESPUESTA DE startMariaDB ===');
    logToRenderer('📥 [Main] Resultado: ' + JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    const errorMsg = '❌ [Main] Error al iniciar servicio: ' + error.message;
    logToRenderer(errorMsg);
    return { success: false, error: error.message };
  }
});

// Handler para detener servicio MariaDB
ipcMain.handle('database-stop', async () => {
  try {
    console.log('⏹️ [Database] Deteniendo servicio MariaDB...');
    const manager = await ensureDatabaseManager();
    const result = await manager.stopMariaDB();
    console.log('✅ [Database] Servicio detenido:', result);
    return result;
  } catch (error) {
    console.error('❌ [Database] Error al detener servicio:', error);
    return { success: false, error: error.message };
  }
});

// Handler para obtener estado del servicio MariaDB
ipcMain.handle('database-status', async (event) => {
  const logToRenderer = (message) => {
    console.log(message);
    // También enviar al renderer para que se vea en DevTools
    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.executeJavaScript(`console.log('${message.replace(/'/g, "\\'")}');`);
    }
  };
  
  try {
    logToRenderer('📊 [Main] === INICIANDO database-status handler ===');
    logToRenderer('📊 [Main] Obteniendo estado del servicio...');
    
    const manager = await ensureDatabaseManager();
    logToRenderer('✅ [Main] DatabaseManager obtenido');
    
    const result = await manager.getMariaDBStatus();
    logToRenderer('📥 [Main] === RESPUESTA DE DatabaseManager ===');
    logToRenderer('📥 [Main] Resultado raw: ' + JSON.stringify(result, null, 2));
    
    // Adaptar formato para el frontend
    const adaptedResult = {
      success: true,
      status: result.state === 'running' ? 'running' : 
              result.state === 'stopped' ? 'stopped' :
              result.state === 'paused' ? 'stopped' :
              result.state === 'not-installed' ? 'error' : 'unknown',
      installed: result.isInstalled,
      serviceName: result.serviceName,
      isRunning: result.isRunning,
      version: result.version || 'No detectada',
      error: result.state === 'not-installed' ? 'MariaDB no está instalado' : undefined
    };
    
    logToRenderer('🔄 [Main] === ESTADO ADAPTADO PARA FRONTEND ===');
    logToRenderer('🔄 [Main] Estado final: ' + JSON.stringify(adaptedResult, null, 2));
    logToRenderer('📤 [Main] Enviando respuesta al renderer...');
    
    return adaptedResult;
  } catch (error) {
    const errorMessage = '❌ [Main] Error al obtener estado: ' + error.message;
    console.error(errorMessage);
    
    // También enviar error al renderer
    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.executeJavaScript(`console.error('${errorMessage.replace(/'/g, "\\'")}');`);
    }
    
    const errorResult = { 
      success: false, 
      error: error.message, 
      status: 'unknown',
      installed: false,
      version: 'Error'
    };
    
    // Log del resultado de error también
    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.executeJavaScript(`console.log('📤 [Main] Enviando error: ${JSON.stringify(errorResult).replace(/'/g, "\\'")}');`);
    }
    
    return errorResult;
  }
});

// Handler para abrir HeidiSQL
ipcMain.handle('database-open-heidisql', async () => {
  try {
    console.log('🖥️ [Database] Abriendo HeidiSQL...');
    const manager = await ensureDatabaseManager();
    const result = await manager.openHeidiSQL();
    console.log('✅ [Database] HeidiSQL abierto:', result);
    return result;
  } catch (error) {
    console.error('❌ [Database] Error al abrir HeidiSQL:', error);
    return { success: false, error: error.message };
  }
});

// Handler para obtener información completa de la base de datos
ipcMain.handle('database-info', async () => {
  try {
    console.log('ℹ️ [Database] Obteniendo información completa...');
    const manager = await ensureDatabaseManager();
    const status = await manager.getMariaDBStatus();
    
    return {
      success: true,
      status: status.status,
      installed: status.installed,
      version: status.version || 'N/A',
      port: 3306,
      host: 'localhost',
      database: 'KokoDB',
      uptime: status.uptime || null
    };
  } catch (error) {
    console.error('❌ [Database] Error al obtener información:', error);
    return { 
      success: false, 
      error: error.message,
      status: 'error',
      installed: false
    };
  }
});

// Handler para ejecutar diagnósticos
ipcMain.handle('database-diagnostics', async () => {
  try {
    console.log('🔍 [Database] Ejecutando diagnósticos...');
    const manager = await ensureDatabaseManager();
    const result = await manager.runDiagnostics();
    console.log('✅ [Database] Diagnósticos completados:', result);
    return result;
  } catch (error) {
    console.error('❌ [Database] Error en diagnósticos:', error);
    return { 
      success: false, 
      error: error.message,
      issues: [{ 
        type: 'general', 
        message: 'Error ejecutando diagnósticos', 
        solution: 'Reintentar como administrador' 
      }]
    };
  }
});

console.log('✅ [Database] Handlers IPC configurados correctamente');

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