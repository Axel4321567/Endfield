import { contextBridge, ipcRenderer } from 'electron';

// Exponer APIs seguras al contexto de la ventana
contextBridge.exposeInMainWorld('electronAPI', {
  // Información del entorno
  isElectron: true,
  platform: process.platform,
  
  // APIs para el navegador web
  webview: {
    // Navegación
    navigate: (url) => ipcRenderer.invoke('webview-navigate', url),
    goBack: () => ipcRenderer.invoke('webview-back'),
    goForward: () => ipcRenderer.invoke('webview-forward'),
    reload: () => ipcRenderer.invoke('webview-reload'),
    
    // Eventos
    onNavigationChange: (callback) => ipcRenderer.on('webview-navigation-change', callback),
    onLoadStart: (callback) => ipcRenderer.on('webview-load-start', callback),
    onLoadEnd: (callback) => ipcRenderer.on('webview-load-end', callback)
  },
  
  // APIs para automatización (futuro)
  automation: {
    runSearch: (query) => ipcRenderer.invoke('automation-search', query),
    runTask: (taskName, params) => ipcRenderer.invoke('automation-task', taskName, params)
  },
  
  // APIs para VPN/Proxy (futuro)
  network: {
    setProxy: (proxyRules) => ipcRenderer.invoke('network-set-proxy', proxyRules),
    clearProxy: () => ipcRenderer.invoke('network-clear-proxy'),
    getProxyStatus: () => ipcRenderer.invoke('network-proxy-status')
  },
  
  // Utilidades generales
  utils: {
    openExternal: (url) => ipcRenderer.invoke('utils-open-external', url),
    showDevTools: () => ipcRenderer.invoke('utils-show-devtools')
  },
  
  // APIs de control de aplicación
  app: {
    quit: () => ipcRenderer.invoke('app-quit'),
    closeWindow: () => ipcRenderer.invoke('app-close-window'),
    minimize: () => ipcRenderer.invoke('app-minimize'),
    getStatus: () => ipcRenderer.invoke('app-get-status')
  },

  // 🧠 Sistema de navegación inteligente
  navigation: {
    // Función principal para navegación inteligente
    openBrowserTab: (url) => {
      console.log('🎯 [Koko-Web] Navegación inteligente solicitada para:', url);
      return ipcRenderer.invoke('open-browser-tab', url);
    },
    
    // 🚀 Función específica para dominios bloqueados (Prompt Maestro)
    openExternalPage: (url) => {
      console.log('🚀 [Koko-Web] Apertura externa para dominio bloqueado:', url);
      return ipcRenderer.invoke('open-external-page', url);
    },
    
    // Función para crear nuevas pestañas desde webview
    createNewTab: (url, title) => {
      console.log('🆕 [Koko-Web] Nueva pestaña solicitada para:', url);
      return ipcRenderer.invoke('create-new-tab', url, title);
    },
    
    // Listeners para comunicación bidireccional
    onNavigateInWebview: (callback) => ipcRenderer.on('navigate-in-webview', callback),
    removeNavigateInWebviewListener: () => ipcRenderer.removeAllListeners('navigate-in-webview'),
    
    // Listener para crear nuevas pestañas
    onCreateNewTab: (callback) => ipcRenderer.on('create-new-tab', callback),
    removeCreateNewTabListener: () => ipcRenderer.removeAllListeners('create-new-tab')
  },

  // APIs para funcionalidades multimedia de YouTube
  media: {
    // Picture-in-Picture support
    requestPictureInPicture: () => {
      console.log('🎥 Picture-in-Picture solicitado desde preload');
      return true;
    },
    
    // Media Session API support
    setMediaMetadata: (metadata) => {
      console.log('🎵 Media metadata:', metadata);
      return true;
    },
    
    // Fullscreen API support
    requestFullscreen: () => {
      console.log('🔲 Fullscreen solicitado');
      return true;
    },
    
    // Autoplay support
    enableAutoplay: () => {
      console.log('▶️ Autoplay habilitado');
      return true;
    }
  },

  // 🔄 Sistema de actualización de la aplicación
  system: {
    // Ejecutar actualización desde GitHub
    executeUpdate: () => {
      console.log('🚀 [System] Solicitando actualización de la aplicación');
      return ipcRenderer.invoke('system-update');
    },

    // Reiniciar la aplicación
    restartApp: () => {
      console.log('🔄 [System] Solicitando reinicio de la aplicación');
      return ipcRenderer.invoke('system-restart');
    },

    // Obtener información del sistema
    getSystemInfo: () => {
      console.log('📊 [System] Obteniendo información del sistema');
      return ipcRenderer.invoke('system-info');
    }
  },

  // 🔄 Auto-Updater de Electron
  autoUpdater: {
    // Verificar actualizaciones manualmente
    checkForUpdates: () => {
      console.log('🔍 [AutoUpdater] Verificando actualizaciones manualmente');
      return ipcRenderer.invoke('check-for-updates');
    },

    // Instalar actualización descargada
    installUpdate: () => {
      console.log('📥 [AutoUpdater] Instalando actualización');
      return ipcRenderer.invoke('install-update');
    },

    // Obtener versión actual de la app
    getVersion: () => {
      return ipcRenderer.invoke('app-get-version');
    },

    // Verificar si estamos en modo desarrollo
    isDev: () => {
      return ipcRenderer.invoke('app-is-dev');
    },

    // Escuchar evento: actualización disponible
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update-available', (event, info) => callback(info));
    },

    // Escuchar evento: progreso de descarga
    onDownloadProgress: (callback) => {
      ipcRenderer.on('download-progress', (event, progress) => callback(progress));
    },

    // Escuchar evento: actualización descargada
    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('update-downloaded', (event, info) => callback(info));
    },

    // Escuchar evento: no hay actualizaciones
    onUpdateNotAvailable: (callback) => {
      ipcRenderer.on('update-not-available', (event, info) => callback(info));
    },

    // Escuchar evento: error
    onError: (callback) => {
      ipcRenderer.on('update-error', (event, error) => callback(error));
    },

    // Remover listeners
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('update-available');
      ipcRenderer.removeAllListeners('download-progress');
      ipcRenderer.removeAllListeners('update-downloaded');
      ipcRenderer.removeAllListeners('update-not-available');
      ipcRenderer.removeAllListeners('update-error');
    },

    // Verificar updates usando el backend (evita rate limit)
    checkGitHubUpdate: () => ipcRenderer.invoke('check-github-update')
  },

  // 💬 APIs específicas para Discord
  discord: {
    // Recargar Discord webview
    reload: () => {
      console.log('🔄 [Discord] Recargando Discord webview');
      return ipcRenderer.invoke('discord-reload');
    },

    // Obtener estado de Discord
    getStatus: () => {
      console.log('📊 [Discord] Obteniendo estado de Discord');
      return ipcRenderer.invoke('discord-status');
    },

    // Configurar ajustes de Discord
    setSettings: (settings) => {
      console.log('⚙️ [Discord] Configurando ajustes:', settings);
      return ipcRenderer.invoke('discord-set-settings', settings);
    },

    // Obtener configuración actual
    getSettings: () => {
      console.log('📋 [Discord] Obteniendo configuración actual');
      return ipcRenderer.invoke('discord-get-settings');
    },

    // Inyectar CSS personalizado en Discord
    injectCSS: (css) => {
      console.log('🎨 [Discord] Inyectando CSS personalizado');
      return ipcRenderer.invoke('discord-inject-css', css);
    },

    // Optimizar Discord para mejor rendimiento
    optimize: () => {
      console.log('🚀 [Discord] Optimizando Discord para mejor rendimiento');
      return ipcRenderer.invoke('discord-optimize');
    },

    // 🔐 Gestión de token para persistencia de sesión
    saveToken: (token) => {
      console.log('💾 [Discord] Guardando token');
      return ipcRenderer.invoke('discord-save-token', token);
    },

    getToken: () => {
      console.log('🔑 [Discord] Recuperando token');
      return ipcRenderer.invoke('discord-get-token');
    },

    deleteToken: () => {
      console.log('🗑️ [Discord] Eliminando token');
      return ipcRenderer.invoke('discord-delete-token');
    },

    // Listeners para eventos de Discord
    onStatusChange: (callback) => ipcRenderer.on('discord-status-change', callback),
    removeStatusChangeListener: () => ipcRenderer.removeAllListeners('discord-status-change'),

    onNotification: (callback) => ipcRenderer.on('discord-notification', callback),
    removeNotificationListener: () => ipcRenderer.removeAllListeners('discord-notification')
  },

  // 🗄️ APIs de Base de Datos (MariaDB + HeidiSQL)
  database: {
    // Instalar MariaDB
    install: () => {
      console.log('🔧 [Database] Iniciando instalación de MariaDB...');
      return ipcRenderer.invoke('database-install');
    },

    // Iniciar servicio de base de datos
    start: () => {
      console.log('▶️ [Database] Iniciando servicio MariaDB...');
      return ipcRenderer.invoke('database-start');
    },

    // Detener servicio de base de datos
    stop: () => {
      console.log('⏹️ [Database] Deteniendo servicio MariaDB...');
      return ipcRenderer.invoke('database-stop');
    },

    // Obtener estado del servicio
    getStatus: () => {
      console.log('📊 [Preload] === INICIANDO database.getStatus ===');
      console.log('📊 [Preload] Llamando ipcRenderer.invoke("database-status")');
      
      const promise = ipcRenderer.invoke('database-status');
      
      promise.then(result => {
        console.log('✅ [Preload] === RESPUESTA RECIBIDA ===');
        console.log('📥 [Preload] Respuesta del main process:', result);
        console.log('📥 [Preload] Tipo:', typeof result);
        console.log('📥 [Preload] JSON.stringify:', JSON.stringify(result, null, 2));
      }).catch(error => {
        console.error('❌ [Preload] Error en llamada IPC:', error);
      });
      
      return promise;
    },

    // Abrir HeidiSQL
    openHeidiSQL: () => {
      console.log('🖥️ [Database] Abriendo HeidiSQL...');
      return ipcRenderer.invoke('database-open-heidisql');
    },

    // Obtener información completa de la base de datos
    getInfo: () => {
      console.log('ℹ️ [Database] Obteniendo información completa...');
      return ipcRenderer.invoke('database-info');
    },

    // Ejecutar diagnósticos del sistema
    runDiagnostics: () => {
      console.log('🔍 [Database] Ejecutando diagnósticos del sistema...');
      return ipcRenderer.invoke('database-diagnostics');
    },

    // Listeners para eventos de progreso
    onDownloadProgress: (callback) => {
      ipcRenderer.on('database-download-progress', (event, progressData) => {
        callback(progressData);
      });
    },

    removeDownloadProgressListener: () => {
      ipcRenderer.removeAllListeners('database-download-progress');
    }
  }
});

// Log para confirmar que preload se cargó correctamente
console.log('🚀 Electron preload script loaded successfully');
console.log('✅ [Koko] Sistema de navegación inteligente disponible en window.electronAPI.navigation');
console.log('✅ [Database] APIs de base de datos disponibles en window.electronAPI.database');