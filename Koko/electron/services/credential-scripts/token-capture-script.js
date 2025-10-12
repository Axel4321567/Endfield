/**
 * 🎫 Token Capture Script
 * Script universal para capturar tokens de autenticación desde cookies, localStorage y headers
 * Este script se ejecuta en el contexto del webview (isolated)
 */

export const TOKEN_CAPTURE_SCRIPT = `
(function() {
  'use strict';
  
  // Verificar si ya está instalado
  if (window.__KOKO_TOKEN_CAPTURE_INSTALLED__) {
    return;
  }
  window.__KOKO_TOKEN_CAPTURE_INSTALLED__ = true;
  
  console.log('🎫 [TokenCapture] Script de captura de tokens activado');
  
  // Función genérica para enviar tokens
  function sendToken(tokenData) {
    try {
      // Método 1: electronAPI expuesto por preload
      if (window.electronAPI?.tokenCapture?.process) {
        window.electronAPI.tokenCapture.process(tokenData);
      }
      // Método 2: ipcRenderer directo
      else if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('token-captured', tokenData);
      }
      // Método 3: Guardar en localStorage para recuperar después
      else {
        console.warn('⚠️ [TokenCapture] No se puede enviar directamente, guardando en localStorage');
        const saved = JSON.parse(localStorage.getItem('__koko_pending_tokens__') || '[]');
        saved.push(tokenData);
        localStorage.setItem('__koko_pending_tokens__', JSON.stringify(saved));
      }
    } catch (error) {
      console.error('❌ [TokenCapture] Error enviando token:', error);
    }
  }
  
  // Función para capturar tokens de localStorage
  function captureFromLocalStorage() {
    try {
      const commonTokenKeys = ['token', 'auth_token', 'access_token', 'session', 'jwt'];
      
      for (const key of commonTokenKeys) {
        const value = localStorage.getItem(key);
        if (value && value.length > 10) {
          console.log(\`🎫 [TokenCapture] Token encontrado en localStorage: \${key}\`);
          
          sendToken({
            service: document.domain,
            domain: document.domain,
            token: value,
            tokenName: key,
            source: 'localStorage',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('🎫 [TokenCapture] Error capturando desde localStorage:', error);
    }
  }
  
  // Función para capturar tokens de cookies
  function captureFromCookies() {
    try {
      const cookies = document.cookie.split(';');
      
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        
        if (name && value && 
            (name === 'token' || name.includes('auth') || 
             name.includes('session') || name.includes('jwt'))) {
          console.log(\`🎫 [TokenCapture] Token encontrado en cookie: \${name}\`);
          
          sendToken({
            service: document.domain,
            domain: document.domain,
            token: value,
            tokenName: name,
            source: 'cookie',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('🎫 [TokenCapture] Error capturando desde cookies:', error);
    }
  }
  
  // Interceptar requests para capturar tokens en headers
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).then(response => {
      try {
        // Capturar token del header Authorization
        const authHeader = response.headers.get('Authorization');
        if (authHeader) {
          console.log('🎫 [TokenCapture] Token encontrado en Authorization header');
          
          sendToken({
            service: document.domain,
            domain: document.domain,
            token: authHeader.replace('Bearer ', '').replace('Token ', ''),
            source: 'authorization_header',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('🎫 [TokenCapture] Error interceptando fetch:', error);
      }
      
      return response;
    });
  };
  
  // Observar cambios en localStorage
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    const result = originalSetItem.apply(this, arguments);
    
    if (key === 'token' || key.includes('auth') || key.includes('session') || key.includes('jwt')) {
      console.log(\`🎫 [TokenCapture] Nuevo token detectado en localStorage: \${key}\`);
      
      sendToken({
        service: document.domain,
        domain: document.domain,
        token: value,
        tokenName: key,
        source: 'localStorage',
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  };
  
  // Ejecutar captura inicial después de login
  setTimeout(() => {
    captureFromLocalStorage();
    captureFromCookies();
  }, 2000);
  
  console.log('✅ [TokenCapture] Sistema de captura de tokens inicializado');
})();
`;

export default TOKEN_CAPTURE_SCRIPT;
