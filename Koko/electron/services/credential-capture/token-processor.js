/**
 * 🎫 Token Processor
 * Procesa y guarda los tokens de autenticación capturados
 */

import PasswordManagerService from '../auth/password-manager-service.js';

/**
 * Procesa y guarda tokens capturados
 * @param {Object} tokenData - Datos del token capturado
 * @returns {Promise<Object>} - Resultado del procesamiento
 */
export async function processToken(tokenData) {
  try {
    console.log('🎫 [TokenProcessor] Procesando token capturado:', {
      service: tokenData.service,
      source: tokenData.source
    });
    
    // Validar datos de entrada
    if (!tokenData.token || tokenData.token.length < 10) {
      return {
        success: false,
        error: 'Token inválido o demasiado corto'
      };
    }
    
    if (!tokenData.service && !tokenData.domain) {
      return {
        success: false,
        error: 'No se proporcionó servicio o dominio'
      };
    }
    
    // Guardar token en la base de datos
    const result = await PasswordManagerService.saveAuthToken({
      serviceName: tokenData.service || tokenData.domain,
      serviceUrl: `https://${tokenData.domain}`,
      tokenType: tokenData.tokenType || 'bearer',
      token: tokenData.token,
      notes: `Capturado desde ${tokenData.source} el ${new Date(tokenData.timestamp).toLocaleString()}`
    });
    
    if (result.success) {
      console.log('✅ [TokenProcessor] Token guardado exitosamente');
      return {
        success: true,
        action: 'saved',
        id: result.id,
        message: 'Token guardado correctamente'
      };
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ [TokenProcessor] Error procesando token:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtiene tokens por servicio
 * @param {string} serviceName - Nombre del servicio
 * @returns {Promise<Object>} - Tokens encontrados
 */
export async function getTokensByService(serviceName) {
  try {
    console.log('🔍 [TokenProcessor] Buscando tokens para:', serviceName);
    
    const result = await PasswordManagerService.getTokensByService(serviceName);
    
    return result;
    
  } catch (error) {
    console.error('❌ [TokenProcessor] Error buscando tokens:', error);
    return {
      success: false,
      error: error.message,
      tokens: []
    };
  }
}

/**
 * Elimina un token
 * @param {number} id - ID del token a eliminar
 * @returns {Promise<Object>} - Resultado de la eliminación
 */
export async function deleteToken(id) {
  try {
    console.log('🗑️ [TokenProcessor] Eliminando token:', id);
    
    const result = await PasswordManagerService.deleteAuthToken(id);
    
    if (result.success) {
      console.log('✅ [TokenProcessor] Token eliminado exitosamente');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ [TokenProcessor] Error eliminando token:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  processToken,
  getTokensByService,
  deleteToken
};
