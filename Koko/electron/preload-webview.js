/**
 * Preload script para webviews (Discord, etc)
 * Este script se ejecuta en el contexto del webview antes de cargar la página
 */

const { contextBridge, ipcRenderer } = require('electron');

// Exponer API segura para captura de credenciales
contextBridge.exposeInMainWorld('electronAPI', {
  credentialCapture: {
    // Procesar credencial capturada
    process: (credentialData) => {
      console.log('📤 [WebviewPreload] Enviando credencial al main process');
      ipcRenderer.send('webview-credential-captured', credentialData);
      return Promise.resolve({ success: true });
    },
    
    // Notificar evento
    notify: (data) => {
      ipcRenderer.send('webview-credential-notify', data);
    }
  },
  
  // API para tokens
  tokenCapture: {
    process: (tokenData) => {
      console.log('🎫 [WebviewPreload] Enviando token al main process');
      ipcRenderer.send('webview-token-captured', tokenData);
      return Promise.resolve({ success: true });
    }
  }
});

console.log('✅ [WebviewPreload] Preload cargado - APIs de captura disponibles');
