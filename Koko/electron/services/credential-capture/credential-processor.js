/**
 * 🔐 Credential Processor
 * Procesa y guarda las credenciales capturadas
 */

import PasswordManagerService from '../auth/password-manager-service.js';

/**
 * Procesa y guarda las credenciales capturadas
 * @param {Object} credentialData - Datos de la credencial capturada
 * @returns {Promise<Object>} - Resultado del procesamiento
 */
export async function processCredential(credentialData) {
  try {
    console.log('🔐 [CredentialProcessor] Procesando credencial capturada:', {
      domain: credentialData.domain,
      username: credentialData.username
    });
    
    // Validar datos de entrada
    if (!credentialData.password) {
      return {
        success: false,
        error: 'No se proporcionó contraseña'
      };
    }
    
    if (!credentialData.username && !credentialData.email) {
      return {
        success: false,
        error: 'No se proporcionó usuario o email'
      };
    }
    
    // Verificar si ya existe una credencial para este dominio y usuario
    const existing = await PasswordManagerService.findCredentialsByDomain(credentialData.domain);
    
    if (existing.success && existing.credentials.length > 0) {
      const match = existing.credentials.find(c => c.username === credentialData.username);
      
      if (match) {
        console.log('🔐 [CredentialProcessor] Credencial existente encontrada');
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
      console.log('✅ [CredentialProcessor] Credencial guardada exitosamente');
      return {
        success: true,
        action: 'saved',
        id: result.id,
        message: 'Credencial guardada correctamente'
      };
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ [CredentialProcessor] Error procesando credencial:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Actualiza una credencial existente
 * @param {number} id - ID de la credencial a actualizar
 * @param {Object} credentialData - Nuevos datos de la credencial
 * @returns {Promise<Object>} - Resultado de la actualización
 */
export async function updateCredential(id, credentialData) {
  try {
    console.log('🔄 [CredentialProcessor] Actualizando credencial:', id);
    
    const result = await PasswordManagerService.updateCredential(id, {
      password: credentialData.password,
      email: credentialData.email,
      notes: `Actualizado automáticamente el ${new Date().toLocaleString()}`
    });
    
    if (result.success) {
      console.log('✅ [CredentialProcessor] Credencial actualizada exitosamente');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ [CredentialProcessor] Error actualizando credencial:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Busca credenciales por dominio
 * @param {string} domain - Dominio a buscar
 * @returns {Promise<Object>} - Credenciales encontradas
 */
export async function findCredentials(domain) {
  try {
    console.log('🔍 [CredentialProcessor] Buscando credenciales para:', domain);
    
    const result = await PasswordManagerService.findCredentialsByDomain(domain);
    
    return result;
    
  } catch (error) {
    console.error('❌ [CredentialProcessor] Error buscando credenciales:', error);
    return {
      success: false,
      error: error.message,
      credentials: []
    };
  }
}

export default {
  processCredential,
  updateCredential,
  findCredentials
};
