import { ipcMain, BrowserView, session } from 'electron';
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
let resizeTimeout = null;
let resizeRAF = null;

// Polyfill para requestAnimationFrame en Node.js
const requestAnimationFrame = global.requestAnimationFrame || setImmediate;
const cancelAnimationFrame = global.cancelAnimationFrame || clearImmediate;

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
    
    // Obtener la sesión webview pre-configurada con anti-detección
    const webviewSession = session.fromPartition('persist:webview', { cache: true });
    
    // Crear nuevo BrowserView usando la sesión webview con anti-detección
    currentBrowserView = new BrowserView({
      webPreferences: {
        session: webviewSession, // Usar sesión con anti-detección configurada
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        devTools: false, // Deshabilitar DevTools en BrowserView para evitar conflictos
        backgroundThrottling: false
      }
    });
  
  // NO agregar automáticamente a la ventana, esperar a que se llame show()
  // mainWindow.addBrowserView(currentBrowserView);
  
  console.log('🛡️ [BrowserView] Creado con sesión webview anti-detección (no visible hasta show())');
  
  // Calcular dimensiones dinámicamente desde el DOM
  const updateBounds = () => {
    if (!currentBrowserView || currentBrowserView.webContents.isDestroyed()) {
      return;
    }
    
    mainWindow.webContents.executeJavaScript(`
      (() => {
        const sidebar = document.querySelector('.sidebar-container');
        const controlPanel = document.querySelector('.puppeteer-control-panel, [class*="control-panel"]');
        const tabBar = document.querySelector('.tab-bar');
        
        // Obtener ancho del sidebar (280px normal, 72px colapsado)
        const sidebarWidth = sidebar ? sidebar.offsetWidth : 280;
        
        // Obtener altura del header del navegador (tab bar + control panel)
        const tabBarHeight = tabBar ? tabBar.offsetHeight : 48; // Fallback 48px
        const controlPanelHeight = controlPanel ? controlPanel.offsetHeight : 60; // Fallback 60px
        const headerHeight = tabBarHeight + controlPanelHeight;
        
        console.log('📏 [BrowserView] Dimensiones detectadas:', {
          sidebarWidth,
          controlPanelHeight,
          tabBarHeight,
          headerHeight,
          sidebarCollapsed: sidebar?.classList.contains('collapsed')
        });
        
        return { sidebarWidth, headerHeight };
      })()
    `).then(({ sidebarWidth, headerHeight }) => {
      const bounds = mainWindow.getContentBounds();
      const newBounds = {
        x: sidebarWidth,
        y: headerHeight,
        width: bounds.width - sidebarWidth,
        height: bounds.height - headerHeight
      };
      
      console.log('🔧 [BrowserView] Aplicando bounds:', newBounds);
      currentBrowserView.setBounds(newBounds);
    }).catch((error) => {
      console.warn('⚠️ [BrowserView] Error obteniendo dimensiones, usando fallback:', error.message);
      // Fallback con dimensiones por defecto (TabBar 48px + Control Panel 60px = 108px)
      const bounds = mainWindow.getContentBounds();
      const fallbackHeaderHeight = 108; // 48px (TabBar) + 60px (Control Panel)
      currentBrowserView.setBounds({
        x: 280,
        y: fallbackHeaderHeight,
        width: bounds.width - 280,
        height: bounds.height - fallbackHeaderHeight
      });
    });
  };
  
  // Aplicar bounds iniciales con múltiples intentos para asegurar que el DOM esté listo
  setTimeout(updateBounds, 100);
  setTimeout(updateBounds, 300);
  setTimeout(updateBounds, 500);
  
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
    let currentUrl = null;
    
    // Obtener URL actual del BrowserView si existe
    if (currentBrowserView && !currentBrowserView.webContents.isDestroyed()) {
      try {
        currentUrl = currentBrowserView.webContents.getURL();
      } catch (error) {
        console.warn('⚠️ [BrowserView] No se pudo obtener URL actual:', error.message);
      }
    }
    
    return {
      success: true,
      isOpen: !!currentBrowserView,
      hasPage: !!currentBrowserView,
      hasBrowserView: !!currentBrowserView,
      currentUrl
    };
  });
  
  // Mostrar BrowserView
  ipcMain.handle('puppeteer-show', async () => {
    try {
      if (currentBrowserView && !currentBrowserView.webContents.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
        // Agregar el BrowserView a la ventana
        mainWindow.addBrowserView(currentBrowserView);
        
        // Actualizar bounds para posicionarlo correctamente (INCLUIR TABS + CONTROL PANEL)
        try {
          const { sidebarWidth, totalHeaderHeight } = await mainWindow.webContents.executeJavaScript(`
            (() => {
              const sidebar = document.querySelector('.sidebar-container');
              const tabBar = document.querySelector('.tab-bar');
              const controlPanel = document.querySelector('.puppeteer-control-panel');
              
              const sidebarWidth = sidebar ? sidebar.offsetWidth : 280;
              const tabBarHeight = tabBar ? tabBar.offsetHeight : 48;
              const controlPanelHeight = controlPanel ? controlPanel.offsetHeight : 60;
              const totalHeaderHeight = tabBarHeight + controlPanelHeight;
              
              console.log('📐 [Show] Detectado:', {
                tabBarHeight,
                controlPanelHeight,
                totalHeaderHeight
              });
              
              return { sidebarWidth, totalHeaderHeight };
            })()
          `);
          
          const bounds = mainWindow.getContentBounds();
          const boundsConfig = {
            x: sidebarWidth,
            y: totalHeaderHeight,
            width: bounds.width - sidebarWidth,
            height: bounds.height - totalHeaderHeight
          };
          
          console.log('🔧 [BrowserView] Aplicando bounds al mostrar:', boundsConfig);
          currentBrowserView.setBounds(boundsConfig);
        } catch (error) {
          console.warn('⚠️ [BrowserView] Error detectando elementos, usando fallback');
          // Fallback: TabBar (48px) + Control Panel (60px) = 108px
          const bounds = mainWindow.getContentBounds();
          currentBrowserView.setBounds({
            x: 280,
            y: 108,
            width: bounds.width - 280,
            height: bounds.height - 108
          });
        }
        
        console.log('👁️ [BrowserView] Mostrando navegador');
        return { success: true };
      }
      return { success: false, message: 'No hay BrowserView activo' };
    } catch (error) {
      console.error('❌ [BrowserView] Error al mostrar:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Ocultar BrowserView
  ipcMain.handle('puppeteer-hide', async () => {
    try {
      if (currentBrowserView && !currentBrowserView.webContents.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.removeBrowserView(currentBrowserView);
        console.log('🙈 [BrowserView] Ocultando navegador');
        return { success: true };
      }
      return { success: false, message: 'No hay BrowserView activo' };
    } catch (error) {
      console.error('❌ [BrowserView] Error al ocultar:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Handler para notificar cambios en el sidebar (con animación suave)
  ipcMain.handle('notify-sidebar-change', async () => {
    console.log('🔔 [Sidebar] Cambio detectado, actualizando BrowserView...');
    
    if (!currentBrowserView || currentBrowserView.webContents.isDestroyed()) {
      return { success: false, message: 'No hay BrowserView activo' };
    }
    
    try {
      // Múltiples actualizaciones durante la animación CSS (300ms)
      const updateFrames = [0, 50, 100, 150, 200, 250, 300];
      
      for (const delay of updateFrames) {
        setTimeout(async () => {
          try {
            const { sidebarWidth, headerHeight } = await mainWindow.webContents.executeJavaScript(`
              (() => {
                const sidebar = document.querySelector('.sidebar-container');
                const controlPanel = document.querySelector('.puppeteer-control-panel, [class*="control-panel"]');
                const tabBar = document.querySelector('.tab-bar');
                const sidebarWidth = sidebar ? sidebar.offsetWidth : 280;
                const tabBarHeight = tabBar ? tabBar.offsetHeight : 48;
                const controlPanelHeight = controlPanel ? controlPanel.offsetHeight : 60;
                const headerHeight = tabBarHeight + controlPanelHeight;
                return { sidebarWidth, headerHeight };
              })()
            `);
            
            if (currentBrowserView && !currentBrowserView.webContents.isDestroyed()) {
              const bounds = mainWindow.getContentBounds();
              currentBrowserView.setBounds({
                x: sidebarWidth,
                y: headerHeight,
                width: bounds.width - sidebarWidth,
                height: bounds.height - headerHeight
              });
            }
          } catch (error) {
            // Ignorar errores en frames intermedios
          }
        }, delay);
      }
      
      console.log('✅ [Sidebar] BrowserView actualizándose con animación suave');
      return { success: true };
    } catch (error) {
      console.error('❌ [Sidebar] Error actualizando BrowserView:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Redimensionar BrowserView al redimensionar ventana (con debouncing y RAF)
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Función optimizada de resize con debouncing y RequestAnimationFrame
    const smoothResize = () => {
      // Cancelar resize anterior si existe
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      if (resizeRAF) {
        cancelAnimationFrame(resizeRAF);
      }
      
      // Usar RAF para sincronizar con el repintado del navegador
      resizeRAF = requestAnimationFrame(() => {
        try {
          if (currentBrowserView && !currentBrowserView.webContents.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.executeJavaScript(`
              (() => {
                const sidebar = document.querySelector('.sidebar-container');
                const controlPanel = document.querySelector('.puppeteer-control-panel, [class*="control-panel"]');
                const tabBar = document.querySelector('.tab-bar');
                const sidebarWidth = sidebar ? sidebar.offsetWidth : 280;
                const tabBarHeight = tabBar ? tabBar.offsetHeight : 48;
                const controlPanelHeight = controlPanel ? controlPanel.offsetHeight : 60;
                const headerHeight = tabBarHeight + controlPanelHeight;
                return { sidebarWidth, headerHeight };
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
                const fallbackHeaderHeight = 108; // 48px (TabBar) + 60px (Control Panel)
                currentBrowserView.setBounds({
                  x: 280,
                  y: fallbackHeaderHeight,
                  width: bounds.width - 280,
                  height: bounds.height - fallbackHeaderHeight
                });
              }
            });
          }
        } catch (error) {
          console.warn('⚠️ [BrowserView] Error en resize:', error.message);
        }
      });
    };
    
    // Handler para resize de ventana con debouncing ligero
    mainWindow.on('resize', () => {
      smoothResize();
      
      // Debouncing adicional para el resize final (cuando usuario suelta)
      resizeTimeout = setTimeout(() => {
        smoothResize();
      }, 100);
    });
    
    // Observer para detectar cambios en el sidebar (colapsar/expandir)
    mainWindow.webContents.executeJavaScript(`
      (() => {
        const sidebar = document.querySelector('.sidebar-container');
        if (!sidebar) return;
        
        // Observer para detectar cambios en las clases del sidebar
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              console.log('🔄 [Sidebar] Cambio detectado en el sidebar');
              // Notificar a Electron que el sidebar cambió
              window.electronAPI?.app?.notifySidebarChange?.();
            }
          });
        });
        
        observer.observe(sidebar, {
          attributes: true,
          attributeFilter: ['class']
        });
        
        console.log('👁️ [Sidebar] Observer configurado');
      })()
    `).catch(err => console.warn('⚠️ [BrowserView] No se pudo configurar observer:', err.message));
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
