import { session } from 'electron';

/**
 * Configuración de sesiones de Electron para webviews
 */

/**
 * Configura la sesión de Discord con persistencia
 */
export async function setupDiscordSession() {
  const discordSession = session.fromPartition('persist:discord', { cache: true });
  
  // Configurar user agent
  discordSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // 🔒 INTERCEPTAR HEADERS HTTP - Cambiar User-Agent real
  discordSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    details.requestHeaders['Accept-Language'] = 'es-ES,es;q=0.9,en;q=0.8';
    details.requestHeaders['DNT'] = '1';
    
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });
  
  // Permitir cookies persistentes para Discord
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
    console.log('✅ [Discord] Sesión persistente configurada');
  } catch (error) {
    console.error('❌ [Discord] Error configurando sesión:', error);
  }
  
  return discordSession;
}

/**
 * Configura la sesión de webview con persistencia (para Google, etc.)
 */
export function setupWebviewSession() {
  const webviewSession = session.fromPartition('persist:webview', { cache: true });
  
  // Configurar user agent SIN "Electron"
  webviewSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
  
  // 🔒 INTERCEPTAR HEADERS HTTP - Cambiar User-Agent real para evitar detección
  webviewSession.webRequest.onBeforeSendHeaders((details, callback) => {
    // User-Agent SIN "Electron" para evitar detección de bots
    details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    details.requestHeaders['Accept-Language'] = 'es-ES,es;q=0.9,en;q=0.8';
    details.requestHeaders['DNT'] = '1';
    
    // Headers adicionales para parecer navegador real
    details.requestHeaders['sec-ch-ua'] = '"Chromium";v="131", "Not_A Brand";v="24"';
    details.requestHeaders['sec-ch-ua-mobile'] = '?0';
    details.requestHeaders['sec-ch-ua-platform'] = '"Windows"';
    
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });
  
  console.log('✅ [Webview] Sesión persistente configurada con headers anti-detección');
  return webviewSession;
}

/**
 * Configura la sesión principal con permisos y headers
 */
export function setupMainSession() {
  const ses = session.defaultSession;
  
  // 🔒 INTERCEPTAR HEADERS HTTP - Cambiar User-Agent real
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    details.requestHeaders['Accept-Language'] = 'es-ES,es;q=0.9,en;q=0.8';
    
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });
  
  // Configurar headers CORS permisivos
  ses.webRequest.onHeadersReceived((details, callback) => {
    const filteredHeaders = { ...details.responseHeaders };
    
    // Permitir CORS para todos los orígenes
    if (!details.url.includes('localhost')) {
      filteredHeaders['Access-Control-Allow-Origin'] = ['*'];
      filteredHeaders['Access-Control-Allow-Methods'] = ['GET, POST, PUT, DELETE, OPTIONS'];
      filteredHeaders['Access-Control-Allow-Headers'] = ['*'];
      filteredHeaders['Access-Control-Allow-Credentials'] = ['true'];
      
      // Headers para funcionalidades multimedia
      filteredHeaders['Feature-Policy'] = ['picture-in-picture *; autoplay *; fullscreen *; microphone *; camera *'];
      filteredHeaders['Permissions-Policy'] = ['picture-in-picture=*, autoplay=*, fullscreen=*, microphone=*, camera=*'];
      
      // Headers específicos para Discord
      if (details.url.includes('discord.com') || details.url.includes('discordapp.com')) {
        filteredHeaders['Cross-Origin-Embedder-Policy'] = ['unsafe-none'];
        filteredHeaders['Cross-Origin-Opener-Policy'] = ['unsafe-none'];
      }
    }
    
    callback({ responseHeaders: filteredHeaders });
  });
  
  // Configurar permisos automáticos
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('🔐 Permiso solicitado:', permission);
    callback(true); // Permitir todos los permisos
    console.log(`✅ Permiso "${permission}" otorgado`);
  });
  
  // Configurar verificación de permisos
  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    console.log('🔍 Verificando permiso:', permission, 'para:', requestingOrigin);
    
    // Permitir automáticamente para YouTube, Google y Discord
    if (requestingOrigin.includes('youtube.com') || 
        requestingOrigin.includes('google.com') ||
        requestingOrigin.includes('discord.com')) {
      return true;
    }
    
    return true; // Permitir por defecto
  });
  
  // Configurar manejador para capturas de pantalla (PiP)
  ses.setDisplayMediaRequestHandler((request, callback) => {
    console.log('🖥️ Solicitud de captura de pantalla para Picture-in-Picture');
    callback({ video: { mandatory: { chromeMediaSource: 'desktop' } } });
  });
  
  // Interceptar solicitudes para evitar bloqueos
  ses.webRequest.onBeforeRequest((details, callback) => {
    if (details.url.includes('localhost') || 
        details.url.includes('chrome-extension://') ||
        details.url.includes('devtools://')) {
      callback({});
      return;
    }
    callback({});
  });
  
  console.log('✅ [Session] Sesión principal configurada');
  return ses;
}

export default {
  setupDiscordSession,
  setupMainSession,
  setupWebviewSession
};
