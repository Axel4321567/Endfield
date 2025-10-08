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
  }
});

// Log para confirmar que preload se cargó correctamente
console.log('🚀 Electron preload script loaded successfully');