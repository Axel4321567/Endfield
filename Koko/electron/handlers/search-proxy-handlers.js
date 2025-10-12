/**
 * Search Proxy Handlers
 * Maneja las búsquedas usando el servicio FastAPI proxy
 */

import { ipcMain, BrowserView } from 'electron';

const PROXY_BASE_URL = 'http://localhost:8001';
let searchBrowserView = null;
let currentMainWindow = null;

/**
 * Crear BrowserView para mostrar resultados de búsqueda
 */
function createSearchBrowserView(mainWindow) {
  if (!searchBrowserView) {
    searchBrowserView = new BrowserView({
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        enableRemoteModule: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        // Deshabilitar scripts de terceros para seguridad
        javascript: true, // Necesario para Google, pero sandboxed
      }
    });
    
    console.log('🔍 [SearchProxy] BrowserView creado para búsquedas');
  }
  
  currentMainWindow = mainWindow;
  return searchBrowserView;
}

/**
 * Mostrar BrowserView de búsqueda
 */
function showSearchBrowserView(mainWindow, bounds) {
  if (!searchBrowserView) {
    createSearchBrowserView(mainWindow);
  }
  
  // Establecer bounds (posición y tamaño)
  const defaultBounds = bounds || {
    x: 0,
    y: 80, // Dejar espacio para el header
    width: mainWindow.getBounds().width,
    height: mainWindow.getBounds().height - 80
  };
  
  searchBrowserView.setBounds(defaultBounds);
  searchBrowserView.setAutoResize({ 
    width: true, 
    height: true,
    horizontal: true,
    vertical: true
  });
  
  mainWindow.setBrowserView(searchBrowserView);
  console.log('✅ [SearchProxy] BrowserView mostrado');
}

/**
 * Ocultar BrowserView de búsqueda
 */
function hideSearchBrowserView(mainWindow) {
  if (searchBrowserView && mainWindow) {
    mainWindow.removeBrowserView(searchBrowserView);
    console.log('👁️ [SearchProxy] BrowserView ocultado');
  }
}

/**
 * Destruir BrowserView de búsqueda
 */
function destroySearchBrowserView() {
  if (searchBrowserView) {
    if (currentMainWindow) {
      currentMainWindow.removeBrowserView(searchBrowserView);
    }
    // @ts-ignore - destroy existe pero no está en los tipos
    searchBrowserView.webContents.destroy();
    searchBrowserView = null;
    console.log('🗑️ [SearchProxy] BrowserView destruido');
  }
}

/**
 * Registrar handlers IPC para búsqueda con proxy
 */
export function registerSearchProxyHandlers(mainWindow) {
  console.log('🔍 [SearchProxy] Registrando handlers IPC');
  
  // Handler: Verificar salud del proxy
  ipcMain.handle('search-proxy:health', async () => {
    try {
      const response = await fetch(`${PROXY_BASE_URL}/health`, {
        method: 'GET',
        timeout: 3000
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [SearchProxy] Proxy saludable:', data);
        return { success: true, data };
      }
      
      return { success: false, error: 'Proxy no responde correctamente' };
    } catch (error) {
      console.error('❌ [SearchProxy] Error verificando proxy:', error.message);
      return { success: false, error: error.message };
    }
  });
  
  // Handler: Realizar búsqueda y cargar en BrowserView
  ipcMain.handle('search-proxy:search', async (event, query) => {
    try {
      console.log('🔍 [SearchProxy] Buscando directamente en Google:', query);
      
      // Crear o mostrar BrowserView
      showSearchBrowserView(mainWindow);
      
      // Cargar Google directamente en el BrowserView
      // Esto usa la sesión webview configurada con headers anti-detección
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      
      console.log('🌐 [SearchProxy] Navegando a:', googleUrl);
      await searchBrowserView.webContents.loadURL(googleUrl);
      
      console.log('✅ [SearchProxy] Búsqueda cargada directamente en BrowserView');
      
      return {
        success: true,
        query: query,
        url: googleUrl,
        message: 'Búsqueda cargada exitosamente'
      };
      
    } catch (error) {
      console.error('❌ [SearchProxy] Error en búsqueda:', error);
      return {
        success: false,
        error: error.message,
        query: query
      };
    }
  });
  
  // Handler: Obtener metadata de búsqueda (JSON)
  ipcMain.handle('search-proxy:search-json', async (event, query) => {
    try {
      console.log('🔍 [SearchProxy] Obteniendo metadata para:', query);
      
      const response = await fetch(`${PROXY_BASE_URL}/search/json?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: `Proxy error: ${response.status}`
        };
      }
      
      const data = await response.json();
      console.log('✅ [SearchProxy] Metadata recibida:', data);
      
      return {
        success: true,
        data: data
      };
      
    } catch (error) {
      console.error('❌ [SearchProxy] Error obteniendo metadata:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // Handler: Ocultar BrowserView de búsqueda
  ipcMain.handle('search-proxy:hide', async () => {
    try {
      hideSearchBrowserView(mainWindow);
      return { success: true };
    } catch (error) {
      console.error('❌ [SearchProxy] Error ocultando BrowserView:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Handler: Mostrar BrowserView de búsqueda
  ipcMain.handle('search-proxy:show', async (event, bounds) => {
    try {
      showSearchBrowserView(mainWindow, bounds);
      return { success: true };
    } catch (error) {
      console.error('❌ [SearchProxy] Error mostrando BrowserView:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Handler: Navegar en el BrowserView de búsqueda
  ipcMain.handle('search-proxy:navigate', async (event, url) => {
    try {
      if (!searchBrowserView) {
        createSearchBrowserView(mainWindow);
        showSearchBrowserView(mainWindow);
      }
      
      await searchBrowserView.webContents.loadURL(url);
      console.log('✅ [SearchProxy] Navegado a:', url);
      
      return { success: true, url };
    } catch (error) {
      console.error('❌ [SearchProxy] Error navegando:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Cleanup cuando la ventana se cierra
  mainWindow.on('closed', () => {
    destroySearchBrowserView();
  });
  
  console.log('✅ [SearchProxy] Handlers registrados');
}

/**
 * Obtener BrowserView actual (para uso interno)
 */
export function getSearchBrowserView() {
  return searchBrowserView;
}

/**
 * Exportar funciones de utilidad
 */
export {
  createSearchBrowserView,
  showSearchBrowserView,
  hideSearchBrowserView,
  destroySearchBrowserView
};
