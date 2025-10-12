/**
 * 🔐 Credential Capture Module - Index
 * Exporta todas las funcionalidades del módulo de captura de credenciales
 */

export { default as CredentialCaptureService } from './credential-capture-service.js';
export { default as CredentialProcessor } from './credential-processor.js';
export { default as TokenProcessor } from './token-processor.js';

// Exportar funciones individuales para compatibilidad
export { 
  processCredential, 
  updateCredential, 
  findCredentials 
} from './credential-processor.js';

export { 
  processToken, 
  getTokensByService, 
  deleteToken 
} from './token-processor.js';
