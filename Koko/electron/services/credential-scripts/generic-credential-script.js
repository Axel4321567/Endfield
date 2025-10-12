/**
 * 🔐 Generic Credential Capture Script
 * Script de inyección universal para capturar credenciales de cualquier sitio web
 * Este script se ejecuta en el contexto del webview (isolated)
 */

export const GENERIC_CREDENTIAL_SCRIPT = `
(function() {
  'use strict';
  
  // Verificar si ya está instalado
  if (window.__KOKO_CREDENTIAL_CAPTURE_INSTALLED__) {
    return;
  }
  window.__KOKO_CREDENTIAL_CAPTURE_INSTALLED__ = true;
  
  console.log('🔐 [CredentialCapture] Script de captura activado en:', window.location.hostname);
  
  // Función para extraer el dominio de la URL
  function getDomain(url) {
    try {
      const urlObj = new URL(url || window.location.href);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return window.location.hostname;
    }
  }
  
  // Función para obtener el favicon
  function getFaviconUrl() {
    const links = document.querySelectorAll('link[rel*="icon"]');
    if (links.length > 0) {
      return links[0].href;
    }
    return window.location.origin + '/favicon.ico';
  }
  
  // Detectar campos de formulario de login
  function detectLoginFields(form) {
    const fields = {
      username: null,
      email: null,
      password: null,
      usernameValue: null,
      emailValue: null,
      passwordValue: null
    };
    
    // Buscar campos de contraseña
    const passwordFields = form.querySelectorAll('input[type="password"]');
    if (passwordFields.length > 0) {
      fields.password = passwordFields[0];
      fields.passwordValue = passwordFields[0].value;
    }
    
    // Buscar campos de email
    const emailFields = form.querySelectorAll('input[type="email"]');
    if (emailFields.length > 0) {
      fields.email = emailFields[0];
      fields.emailValue = emailFields[0].value;
    }
    
    // Buscar campos de texto que puedan ser username
    const textFields = form.querySelectorAll('input[type="text"], input[type="tel"], input:not([type])');
    for (const field of textFields) {
      const name = (field.name || field.id || field.placeholder || '').toLowerCase();
      if (name.includes('user') || name.includes('email') || name.includes('login') || 
          name.includes('account') || name.includes('telefon') || name.includes('phone')) {
        if (!fields.email && (name.includes('email') || name.includes('@'))) {
          fields.email = field;
          fields.emailValue = field.value;
        } else if (!fields.username) {
          fields.username = field;
          fields.usernameValue = field.value;
        }
      }
    }
    
    return fields;
  }
  
  // Capturar envío de formularios
  function captureFormSubmit(form) {
    form.addEventListener('submit', function(e) {
      try {
        const fields = detectLoginFields(form);
        
        // Verificar que tengamos al menos contraseña y username/email
        if (!fields.passwordValue) {
          console.log('🔐 [CredentialCapture] No se detectó contraseña, ignorando formulario');
          return;
        }
        
        if (!fields.usernameValue && !fields.emailValue) {
          console.log('🔐 [CredentialCapture] No se detectó usuario/email, ignorando formulario');
          return;
        }
        
        const credentialData = {
          url: window.location.href,
          domain: getDomain(window.location.href),
          username: fields.usernameValue || fields.emailValue || '',
          email: fields.emailValue || null,
          password: fields.passwordValue,
          faviconUrl: getFaviconUrl(),
          formAction: form.action || window.location.href,
          timestamp: new Date().toISOString()
        };
        
        console.log('🔐 [CredentialCapture] Credenciales detectadas:', {
          domain: credentialData.domain,
          username: credentialData.username,
          hasPassword: !!credentialData.password
        });
        
        // Enviar al host usando postMessage (funciona en webviews aislados)
        try {
          // Método 1: ipcRenderer si está disponible en preload
          if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('credential-captured', credentialData);
          }
          // Método 2: Usar el objeto expuesto por el preload
          else if (window.electronAPI?.credentialCapture?.process) {
            window.electronAPI.credentialCapture.process(credentialData);
          }
          // Método 3: Guardar en localStorage para recuperar después
          else {
            console.warn('⚠️ [CredentialCapture] No se puede enviar directamente, guardando en localStorage');
            const saved = JSON.parse(localStorage.getItem('__koko_pending_credentials__') || '[]');
            saved.push(credentialData);
            localStorage.setItem('__koko_pending_credentials__', JSON.stringify(saved));
          }
        } catch (sendError) {
          console.error('❌ [CredentialCapture] Error enviando credenciales:', sendError);
        }
        
      } catch (error) {
        console.error('🔐 [CredentialCapture] Error capturando credenciales:', error);
      }
    });
  }
  
  // Capturar cambios en inputs (para autoguardado)
  let captureTimeout = null;
  function setupInputListeners() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      const passwordFields = form.querySelectorAll('input[type="password"]');
      
      passwordFields.forEach(passwordField => {
        passwordField.addEventListener('change', () => {
          clearTimeout(captureTimeout);
          captureTimeout = setTimeout(() => {
            const fields = detectLoginFields(form);
            if (fields.passwordValue && (fields.usernameValue || fields.emailValue)) {
              console.log('🔐 [CredentialCapture] Credenciales modificadas, listas para captura');
            }
          }, 500);
        });
      });
    });
  }
  
  // Inicializar captura en todos los formularios
  function initializeCapture() {
    const forms = document.querySelectorAll('form');
    console.log('🔐 [CredentialCapture] Encontrados ' + forms.length + ' formularios');
    
    forms.forEach(form => {
      captureFormSubmit(form);
    });
    
    setupInputListeners();
  }
  
  // Observer para detectar nuevos formularios (SPAs)
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // ELEMENT_NODE
          if (node.tagName === 'FORM') {
            captureFormSubmit(node);
          } else {
            const forms = node.querySelectorAll('form');
            forms.forEach(form => captureFormSubmit(form));
          }
        }
      });
    });
  });
  
  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initializeCapture();
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });
  } else {
    initializeCapture();
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
  
  console.log('✅ [CredentialCapture] Sistema de captura inicializado');
})();
`;

export default GENERIC_CREDENTIAL_SCRIPT;
