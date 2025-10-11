import { app } from 'electron';
import path from 'path';

/**
 * Configuración centralizada de la aplicación
 */

// Configurar userData personalizado para mejor persistencia
export const customUserData = path.join(app.getPath('appData'), 'KokoBrowserData');

/**
 * Inicializa las rutas personalizadas de la aplicación
 */
export function initializeAppPaths() {
  app.setPath('userData', customUserData);
  app.setPath('cache', path.join(customUserData, 'cache'));
  
  console.log('💾 [App] userData configurado en:', customUserData);
}

/**
 * Configuración de command line switches
 */
export function initializeCommandLineSwitches() {
  // Configuración adicional para compatibilidad con Google
  app.commandLine.appendSwitch('--disable-http-cache');
  app.commandLine.appendSwitch('--disable-gpu-process-crash-limit');
  app.commandLine.appendSwitch('--no-sandbox');
  app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
  app.commandLine.appendSwitch('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Configuraciones adicionales para reducir errores de base de datos
  app.commandLine.appendSwitch('--disable-background-timer-throttling');
  app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('--disable-renderer-backgrounding');
  
  console.log('⚙️ [App] Command line switches configurados');
}

export default {
  customUserData,
  initializeAppPaths,
  initializeCommandLineSwitches
};
