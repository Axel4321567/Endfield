import { ipcMain, BrowserView } from 'electron';
import puppeteer from 'puppeteer-core';
import path from 'path';
import { readdirSync, existsSync } from 'fs';

/**
 * 🎭 Handlers para navegador Puppeteer embebido
 * Integración de Puppeteer con Electron BrowserView para navegación controlada
 */

// Variables globales
let puppeteerBrowser = null;
let puppeteerPage = null;
let currentBrowserView = null;
let mainWindow = null;

/**
 * [DESHABILITADO] Obtener ruta del ejecutable de Chromium
 * Ya no se usa - BrowserView usa el Chromium integrado de Electron
 */
function getChromiumExecutablePath() {
  console.log('⚠️ [Puppeteer] Función deshabilitada - usando BrowserView de Electron');
  return null;
}

/**
 * [DESHABILITADO] Lanzar Puppeteer con Chromium
 * Esta función ya no se usa - ahora usamos solo BrowserView
 */
async function launchPuppeteerBrowser() {
  console.log('⚠️ [Puppeteer] Esta función está deshabilitada - usando BrowserView en su lugar');
  throw new Error('Puppeteer launch is disabled - use BrowserView instead');
}

/**
 * Crear o actualizar BrowserView embebido
 */
function createOrUpdateBrowserView(url) {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      throw new Error('Ventana principal no disponible o destruida');
    }
    
    // PROTECCIÓN CRÍTICA: No crear BrowserView si DevTools está abierto
    if (mainWindow.webContents.isDevToolsOpened()) {
      console.error('❌ [BrowserView] NO SE PUEDE CREAR con DevTools abierto - crashearía VS Code');
      throw new Error('No se puede crear BrowserView mientras DevTools está abierto. Cierra DevTools primero.');
    }
    
    // Eliminar BrowserView anterior si existe
    if (currentBrowserView) {
      try {
        if (!currentBrowserView.webContents.isDestroyed()) {
          mainWindow.removeBrowserView(currentBrowserView);
          currentBrowserView.webContents.destroy();
        }
      } catch (error) {
        console.warn('⚠️ [BrowserView] Error al eliminar:', error.message);
      }
      currentBrowserView = null;
    }
    
    console.log('🔨 [BrowserView] Creando BrowserView...');
    
    // Crear nuevo BrowserView con protecciones adicionales
    currentBrowserView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        devTools: false, // Deshabilitar DevTools en BrowserView para evitar conflictos
        backgroundThrottling: false
      }
    });
  
  mainWindow.addBrowserView(currentBrowserView);
  
  // Calcular dimensiones dinámicamente desde el DOM
  const updateBounds = () => {
    mainWindow.webContents.executeJavaScript(`
      (() => {
        const sidebar = document.querySelector('.sidebar, [class*="sidebar"], nav');
        const header = document.querySelector('.puppeteer-control-panel, header');
        return {
          sidebarWidth: sidebar ? sidebar.offsetWidth : 80,
          headerHeight: header ? header.offsetHeight + 60 : 120
        };
      })()
    `).then(({ sidebarWidth, headerHeight }) => {
      const bounds = mainWindow.getContentBounds();
      currentBrowserView.setBounds({
        x: sidebarWidth,
        y: headerHeight,
        width: bounds.width - sidebarWidth,
        height: bounds.height - headerHeight
      });
    }).catch(() => {
      // Fallback si no se puede leer el DOM
      const bounds = mainWindow.getContentBounds();
      currentBrowserView.setBounds({
        x: 80,
        y: 120,
        width: bounds.width - 80,
        height: bounds.height - 120
      });
    });
  };
  
  // Aplicar bounds iniciales
  setTimeout(updateBounds, 100);
  
  currentBrowserView.setAutoResize({
    width: true,
    height: true
  });
  
  // Cargar URL
  console.log('🌐 [BrowserView] Cargando URL:', url);
  currentBrowserView.webContents.loadURL(url);
  
  // Eventos de navegación
  currentBrowserView.webContents.on('did-start-loading', () => {
    console.log('⏳ [BrowserView] Cargando...');
  });
  
  currentBrowserView.webContents.on('did-finish-load', () => {
    console.log('✅ [BrowserView] Carga completada');
  });
  
  currentBrowserView.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ [BrowserView] Error de carga:', errorCode, errorDescription);
  });
  
    return currentBrowserView;
  } catch (error) {
    console.error('❌ [BrowserView] Error al crear:', error);
    throw error;
  }
}

/**
 * Abrir URL solo en BrowserView (sin lanzar Puppeteer)
 */
async function openUrlInPuppeteer(url) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚨 [BrowserView] openUrlInPuppeteer LLAMADO');
    console.log('📍 URL solicitada:', url);
    console.log('📞 Stack trace:');
    console.trace();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Validación de seguridad: NO permitir si la ventana está en DevTools mode
    if (mainWindow && mainWindow.webContents && mainWindow.webContents.isDevToolsOpened()) {
      console.warn('⚠️ [BrowserView] DevTools está abierto, postponiendo creación');
      // Esperar un poco para evitar conflictos
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Normalizar URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Crear o actualizar BrowserView
    console.log('✅ [BrowserView] Creando BrowserView...');
    createOrUpdateBrowserView(url);
    
    return {
      success: true,
      url,
      message: 'BrowserView creado correctamente con URL: ' + url
    };
  } catch (error) {
    console.error('❌ [BrowserView] Error al abrir URL:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cerrar BrowserView
 */
async function closePuppeteerBrowser() {
  try {
    // Cerrar BrowserView con protecciones
    if (currentBrowserView) {
      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.removeBrowserView(currentBrowserView);
        }
        if (!currentBrowserView.webContents.isDestroyed()) {
          currentBrowserView.webContents.destroy();
        }
      } catch (destroyError) {
        console.warn('⚠️ [BrowserView] Error al destruir:', destroyError.message);
      }
      currentBrowserView = null;
    }
    
    console.log('✅ [BrowserView] Navegador cerrado correctamente');
    
    return {
      success: true,
      message: 'Navegador cerrado correctamente'
    };
  } catch (error) {
    console.error('❌ [BrowserView] Error al cerrar:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Registrar handlers IPC
 */
export function registerPuppeteerBrowserHandlers(window) {
  mainWindow = window;
  console.log('🎭 [Puppeteer] Registrando handlers IPC...');
  
  // Abrir URL
  ipcMain.handle('puppeteer-open', async (event, url) => {
    return await openUrlInPuppeteer(url);
  });
  
  // Cerrar navegador
  ipcMain.handle('puppeteer-close', async () => {
    return await closePuppeteerBrowser();
  });
  
  // Obtener estado
  ipcMain.handle('puppeteer-status', async () => {
    return {
      success: true,
      isOpen: !!currentBrowserView,
      hasPage: !!currentBrowserView,
      hasBrowserView: !!currentBrowserView
    };
  });
  
  // Redimensionar BrowserView al redimensionar ventana
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.on('resize', () => {
      try {
        if (currentBrowserView && !currentBrowserView.webContents.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.executeJavaScript(`
            (() => {
              const sidebar = document.querySelector('.sidebar, [class*="sidebar"], nav');
              const header = document.querySelector('.puppeteer-control-panel, header');
              return {
                sidebarWidth: sidebar ? sidebar.offsetWidth : 80,
                headerHeight: header ? header.offsetHeight + 60 : 120
              };
            })()
          `).then(({ sidebarWidth, headerHeight }) => {
            if (currentBrowserView && !currentBrowserView.webContents.isDestroyed()) {
              const bounds = mainWindow.getContentBounds();
              currentBrowserView.setBounds({
                x: sidebarWidth,
                y: headerHeight,
                width: bounds.width - sidebarWidth,
                height: bounds.height - headerHeight
              });
            }
          }).catch((error) => {
            if (currentBrowserView && !currentBrowserView.webContents.isDestroyed()) {
              const bounds = mainWindow.getContentBounds();
              currentBrowserView.setBounds({
                x: 80,
                y: 120,
                width: bounds.width - 80,
                height: bounds.height - 120
              });
            }
          });
        }
      } catch (error) {
        console.warn('⚠️ [BrowserView] Error en resize:', error.message);
      }
    });
  }
  
  console.log('✅ [Puppeteer] Handlers registrados correctamente');
}

/**
 * Cleanup al cerrar app
 */
export async function cleanupPuppeteerBrowser() {
  console.log('🧹 [Puppeteer] Limpiando recursos...');
  await closePuppeteerBrowser();
}
