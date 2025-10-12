import { ipcMain } from 'electron';
import { 
  CREDENTIAL_CAPTURE_SCRIPT,
  TOKEN_CAPTURE_SCRIPT,
  processCapturedCredential,
  processCapturedToken
} from '../services/credential-capture/credential-capture-service.js';
import PasswordManagerService from '../services/auth/password-manager-service.js';

/**
 * Registra todos los handlers IPC para captura de credenciales
 */
export function registerCredentialCaptureHandlers() {
  console.log('📡 [CredentialCaptureHandlers] Registrando handlers IPC');

  /**
   * Inyecta el script de captura en un webContents
   * @param {number} webContentsId - ID del webContents
   * @param {string} scriptType - Tipo de script: 'credential', 'token', 'discord', 'all', 'discord-full'
   */
  ipcMain.handle('credential-capture:inject', async (event, webContentsId, scriptType = 'all') => {
    try {
      console.log(`🔌 [CredentialCaptureHandlers] Inyectando script (${scriptType}) en webContents ${webContentsId}`);
      
      // Importar dinámicamente el servicio refactorizado
      const CredentialCaptureService = (await import('../services/credential-capture/credential-capture-service.js')).default;
      
      const result = await CredentialCaptureService.injectScript(webContentsId, scriptType);
      
      return result;
      
    } catch (error) {
      console.error('❌ [CredentialCaptureHandlers] Error al inyectar script:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });

  /**
   * Procesa credenciales capturadas desde el frontend
   */
  ipcMain.handle('credential-capture:process', async (event, credentialData) => {
    try {
      console.log('🔐 [CredentialCaptureHandlers] Procesando credencial capturada');
      
      const result = await processCapturedCredential(credentialData);
      
      return { 
        success: true, 
        data: result 
      };
    } catch (error) {
      console.error('❌ [CredentialCaptureHandlers] Error al procesar credencial:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });

  /**
   * Busca credenciales guardadas para una URL específica
   */
  ipcMain.handle('credential-capture:check-saved', async (event, url) => {
    try {
      console.log(`🔍 [CredentialCaptureHandlers] Buscando credenciales para ${url}`);
      
      // Extraer dominio de la URL
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // Buscar credenciales por dominio
      const result = await PasswordManagerService.findCredentialsByDomain(domain);
      
      return { 
        success: true, 
        credentials: result.credentials || [] 
      };
    } catch (error) {
      console.error('❌ [CredentialCaptureHandlers] Error al buscar credenciales:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });

  /**
   * Obtiene el script de captura para inyección manual
   */
  ipcMain.handle('credential-capture:get-script', async (event, scriptType = 'credential') => {
    try {
      console.log('📜 [CredentialCaptureHandlers] Obteniendo script de captura:', scriptType);
      
      const script = scriptType === 'token' ? TOKEN_CAPTURE_SCRIPT : CREDENTIAL_CAPTURE_SCRIPT;
      
      return { 
        success: true, 
        script 
      };
    } catch (error) {
      console.error('❌ [CredentialCaptureHandlers] Error al obtener script:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });

  /**
   * Notifica al main process sobre un evento de captura
   */
  ipcMain.on('credential-capture:notify', (event, data) => {
    console.log('📢 [CredentialCaptureHandlers] Notificación de captura recibida:', data.type);
    
    // Reenviar a todos los renderer processes
    event.sender.send('credential-capture:event', data);
  });

  /**
   * Listener para credenciales capturadas desde webviews
   */
  ipcMain.on('webview-credential-captured', async (event, credentialData) => {
    console.log('🔐 [CredentialCaptureHandlers] Credencial capturada desde webview:', credentialData.domain);
    
    try {
      const result = await processCapturedCredential(credentialData);
      console.log('✅ [CredentialCaptureHandlers] Credencial guardada:', result.id);
      
      // Notificar a todos los renderer processes
      event.sender.send('credential-saved', { success: true, data: result });
    } catch (error) {
      console.error('❌ [CredentialCaptureHandlers] Error procesando credencial:', error);
      event.sender.send('credential-saved', { success: false, error: error.message });
    }
  });

  /**
   * Listener para tokens capturados desde webviews
   */
  ipcMain.on('webview-token-captured', async (event, tokenData) => {
    console.log('🎫 [CredentialCaptureHandlers] Token capturado desde webview:', tokenData.serviceName);
    
    try {
      const result = await processCapturedToken(tokenData);
      console.log('✅ [CredentialCaptureHandlers] Token guardado:', result.id);
      
      event.sender.send('token-saved', { success: true, data: result });
    } catch (error) {
      console.error('❌ [CredentialCaptureHandlers] Error procesando token:', error);
      event.sender.send('token-saved', { success: false, error: error.message });
    }
  });

  /**
   * Listener para notificaciones desde webviews
   */
  ipcMain.on('webview-credential-notify', (event, data) => {
    console.log('📢 [CredentialCaptureHandlers] Notificación desde webview:', data.type);
  });

  console.log('✅ [CredentialCaptureHandlers] Handlers registrados correctamente');
}

/**
 * Remueve todos los handlers de captura de credenciales
 */
export function unregisterCredentialCaptureHandlers() {
  console.log('🧹 [CredentialCaptureHandlers] Removiendo handlers IPC');
  
  ipcMain.removeHandler('credential-capture:inject');
  ipcMain.removeHandler('credential-capture:process');
  ipcMain.removeHandler('credential-capture:check-saved');
  ipcMain.removeHandler('credential-capture:get-script');
  ipcMain.removeAllListeners('credential-capture:notify');
  
  console.log('✅ [CredentialCaptureHandlers] Handlers removidos');
}
