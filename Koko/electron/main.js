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
      preload: app.isPackaged 
        ? path.join(process.resourcesPath, 'app.asar', 'electron', 'preload.js')
        : path.join(__dirname, 'preload.js'),
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
      disableHtmlFullscreenWindowResize: true,
      // Configuraciones específicas para YouTube y media
      enableBlinkFeatures: 'PictureInPictureAPI,BackgroundVideoPlayback,MediaSession',
      disableBlinkFeatures: '',
      autoplayPolicy: 'no-user-gesture-required'
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

  // Manejar navegación externa
  win.webContents.setWindowOpenHandler(({ url }) => {
    import('electron').then(({ shell }) => shell.openExternal(url));
    return { action: 'deny' };
  });
}

// Configurar sesión para permitir webview y funcionalidades avanzadas de YouTube
app.whenReady().then(async () => {
  // Habilitar webview tags y configurar permisos
  const ses = session.defaultSession;

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

// 🧠 Sistema de navegación inteligente - Maneja ERR_ABORTED automáticamente
ipcMain.handle('open-browser-tab', (_, url) => {
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

console.log('✅ [Koko] Manejador de navegación inteligente activo');

// 🚀 Manejador específico para dominios bloqueados (Prompt Maestro)
ipcMain.handle('open-external-page', async (_, url) => {
  console.log('🚀 [Koko] Abriendo página externa para dominio bloqueado:', url);
  
  try {
    // Detectar dominios que requieren ventana externa
    const blockedDomains = [
      'google.com', 'youtube.com', 'gmail.com', 'maps.google.com',
      'accounts.google.com', 'drive.google.com', 'docs.google.com',
      'sheets.google.com', 'slides.google.com', 'photos.google.com',
      'calendar.google.com', 'translate.google.com', 'play.google.com',
      'cloud.google.com', 'firebase.google.com', 'android.com'
    ];
    
    const shouldOpenExternal = blockedDomains.some(domain => 
      url.includes(domain) || url.includes(`www.${domain}`)
    );
    
    if (shouldOpenExternal) {
      // Crear nueva ventana BrowserWindow para dominio bloqueado
      const externalWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          webSecurity: true,
          allowRunningInsecureContent: false,
          plugins: true
        },
        icon: path.join(__dirname, '../src-tauri/icons/icon.png'),
        title: 'Koko Browser - Ventana Externa',
        show: false
      });
      
      // Configurar permisos para YouTube y multimedia
      externalWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = [
          'media', 'camera', 'microphone', 'notifications', 
          'geolocation', 'midi', 'midiSysex', 'pointerLock',
          'fullscreen', 'openExternal', 'background-sync',
          'display-capture', 'clipboard-read', 'clipboard-write'
        ];
        callback(allowedPermissions.includes(permission));
      });
      
      // Configurar headers para compatibilidad con Google
      externalWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        details.requestHeaders['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
        details.requestHeaders['Accept-Language'] = 'en-US,en;q=0.5';
        details.requestHeaders['Accept-Encoding'] = 'gzip, deflate, br';
        details.requestHeaders['DNT'] = '1';
        details.requestHeaders['Connection'] = 'keep-alive';
        details.requestHeaders['Upgrade-Insecure-Requests'] = '1';
        callback({ requestHeaders: details.requestHeaders });
      });
      
      // Cargar URL y mostrar ventana
      await externalWindow.loadURL(url);
      externalWindow.show();
      externalWindow.focus();
      
      console.log('✅ [Koko] Ventana externa creada exitosamente para:', url);
      return { 
        success: true, 
        method: 'external-window', 
        url,
        windowId: externalWindow.id,
        reason: 'Dominio bloqueado - requiere ventana externa'
      };
    } else {
      // Si no es dominio bloqueado, usar webview normal
      const mainWin = BrowserWindow.getFocusedWindow();
      if (mainWin) {
        mainWin.webContents.send('navigate-in-webview', url);
        console.log('✅ [Koko] Navegación interna para:', url);
        return { 
          success: true, 
          method: 'internal-webview', 
          url,
          reason: 'Dominio permitido en webview'
        };
      }
    }
    
  } catch (error) {
    console.error('❌ [Koko] Error al abrir página externa:', error);
    return { 
      success: false, 
      error: error.message, 
      url 
    };
  }
});

console.log('✅ [Koko] Manejador de páginas externas activo (Prompt Maestro)');

// 🆕 Manejador para crear nuevas pestañas desde webview
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

// Inicializar desarrollo
setupDevelopment();