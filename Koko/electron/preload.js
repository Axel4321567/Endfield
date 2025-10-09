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
  }
});

// Log para confirmar que preload se cargó correctamente
console.log('🚀 Electron preload script loaded successfully');
console.log('✅ [Koko] Sistema de navegación inteligente disponible en window.electronAPI.navigation');