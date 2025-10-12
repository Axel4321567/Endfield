/**
 *  Credential Capture Service - DEPRECATED
 * 
 * @deprecated Este archivo se mantiene solo para compatibilidad hacia atrás
 * Usa los nuevos módulos organizados en su lugar
 */

// Reexportar desde los nuevos módulos para compatibilidad
export { 
  default as CredentialCaptureService,
  CREDENTIAL_CAPTURE_SCRIPT,
  TOKEN_CAPTURE_SCRIPT,
  DISCORD_CAPTURE_SCRIPT,
  processCapturedCredential,
  processCapturedToken
} from './credential-capture/credential-capture-service.js';

// También exportar como default para compatibilidad
export { default } from './credential-capture/credential-capture-service.js';

// Log de deprecación solo en desarrollo
if (process.env.NODE_ENV !== 'production') {
  console.warn(' [DEPRECATED] Migra a ./credential-capture/credential-capture-service.js');
}
