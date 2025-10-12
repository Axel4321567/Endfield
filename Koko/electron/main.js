/**
 * Koko Browser - Electron Main Process
 * Versión refactorizada y modular
 */

import { app, BrowserWindow, globalShortcut, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar configuraciones
import { initializeAppPaths, initializeCommandLineSwitches } from './config/app-config.js';
import { setupDiscordSession, setupMainSession, setupWebviewSession } from './config/session-config.js';

// Importar servicios
import { createWindow } from './services/window-manager.js';
import { setupAutoUpdater, registerUpdateHandlers } from './services/auto-updater-service.js';

// Importar utilidades
import { initializeAutoUpdater, initializeDatabaseManager } from './utils/module-loader.js';

// Importar handlers
import { registerAppHandlers } from './handlers/ipc-handlers.js';
import { registerDiscordHandlers } from './handlers/discord-handlers.js';
import { registerSystemHandlers } from './handlers/system-handlers.js';
import { registerDatabaseHandlers } from './handlers/database-handlers.js';
import { registerPhpHandlers } from './handlers/php-handlers.js';
import { registerPhpMyAdminHandlers, initializePhpMyAdminManager } from './handlers/phpmyadmin-handlers.js';
import { registerDatabaseServiceHandlers } from './handlers/database-service-handlers.js';
import { registerPasswordManagerHandlers } from './handlers/password-manager-handlers.js';
import { registerCredentialCaptureHandlers } from './handlers/credential-capture-handlers.js';
import { registerSearchProxyHandlers } from './handlers/search-proxy-handlers.js';
import { registerSearchProxyServiceHandlers, cleanupSearchProxy } from './handlers/search-proxy-service-handlers.js';
import { registerChromiumHandlers, cleanupChromium } from './handlers/chromium-handlers.js';
import { registerPuppeteerBrowserHandlers, cleanupPuppeteerBrowser } from './handlers/puppeteer-browser-handlers.js';

// Importar phpMyAdmin Manager
import PhpMyAdminManager from './automation/phpmyadmin-manager.js';

// Importar Services
import DatabaseService from './services/database-service.js';
import PasswordManagerService from './services/auth/password-manager-service.js';
import * as BrowserSessionService from './services/browser-session-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Variables globales
let autoUpdater = null;
let DatabaseManager = null;
let phpMyAdminManager = null;

// ==========================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================

// Configurar paths personalizados
initializeAppPaths();

// Configurar command line switches
initializeCommandLineSwitches();

// ==========================================
// EVENTO: APP READY
// ==========================================

app.whenReady().then(async () => {
  console.log('🚀 [Koko] Aplicación iniciada');
  
  // Configurar sesiones
  await setupDiscordSession();
  setupMainSession();
  setupWebviewSession(); // 🔒 Sesión para Google/YouTube con headers anti-detección
  
  // Configurar argumentos adicionales para funcionalidades multimedia
  app.commandLine.appendSwitch('enable-features', 'PictureInPictureAPI,MediaSession,BackgroundVideoPlayback');
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  app.commandLine.appendSwitch('enable-blink-features', 'PictureInPictureAPI');
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  
  console.log('🎥 Funcionalidades multimedia habilitadas');
  
  // Crear ventana principal
  const mainWindow = await createWindow();
  
  // Crear menú de aplicación
  createApplicationMenu();
  
  // Registrar handlers IPC
  registerAppHandlers();
  registerDiscordHandlers();
  registerSystemHandlers();
  registerDatabaseHandlers();
  registerPhpHandlers();
  registerDatabaseServiceHandlers();
  registerPasswordManagerHandlers();
  registerCredentialCaptureHandlers();
  registerSearchProxyHandlers(mainWindow); // 🔍 Handlers para búsqueda segura con BrowserView
  registerSearchProxyServiceHandlers(); // 🔍 Handlers para gestionar el servicio del proxy
  // registerChromiumHandlers(); // 🌐 [DESHABILITADO] Handlers para gestionar Chromium
  registerPuppeteerBrowserHandlers(mainWindow); // 🎭 Handlers para navegador Puppeteer embebido
  
  // Inicializar phpMyAdmin Manager
  phpMyAdminManager = new PhpMyAdminManager();
  initializePhpMyAdminManager(phpMyAdminManager);
  registerPhpMyAdminHandlers();
  console.log('✅ [phpMyAdmin] Manager inicializado');
  
  // Inicializar Database Service
  DatabaseService.initializePool();
  console.log('✅ [DatabaseService] Pool de conexiones inicializado');
  
  // Inicializar Password Manager (crear tablas si no existen)
  try {
    await PasswordManagerService.initializePasswordTables();
    console.log('✅ [PasswordManager] Tablas inicializadas');
  } catch (error) {
    console.error('❌ [PasswordManager] Error inicializando:', error);
  }
  
  // Inicializar Browser Session Service (crear tablas si no existen)
  try {
    await BrowserSessionService.initializeBrowserSessionTable();
    console.log('✅ [BrowserSession] Tablas inicializadas');
  } catch (error) {
    console.error('❌ [BrowserSession] Error inicializando:', error);
  }
  
  // Configurar auto-updater
  autoUpdater = await initializeAutoUpdater();
  registerUpdateHandlers(app);
  await setupAutoUpdater(autoUpdater);
  
  // Inicializar DatabaseManager
  DatabaseManager = await initializeDatabaseManager();
  
  console.log('✅ [Koko] Inicialización completada');
  
  // Listener para activación en macOS
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

// ==========================================
// MENÚ DE APLICACIÓN
// ==========================================

function createApplicationMenu() {
  const template = [
    {
      label: 'Ver',
      submenu: [
        {
          label: 'Recargar',
          accelerator: 'CmdOrCtrl+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.reload();
          }
        },
        {
          label: 'Herramientas de Desarrollador',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              const currentZoom = focusedWindow.webContents.getZoomLevel();
              focusedWindow.webContents.setZoomLevel(currentZoom + 1);
            }
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              const currentZoom = focusedWindow.webContents.getZoomLevel();
              focusedWindow.webContents.setZoomLevel(currentZoom - 1);
            }
          }
        },
        {
          label: 'Zoom Normal',
          accelerator: 'CmdOrCtrl+0',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.webContents.setZoomLevel(0);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  
  console.log('⌨️ DevTools disponible: F12, Ctrl+Shift+I, Ctrl+Shift+C (o desde menú Ver)');
}

// ==========================================
// EVENTOS DE CIERRE
// ==========================================

app.on('window-all-closed', () => {
  // Limpiar atajos de teclado
  globalShortcut.unregisterAll();
  
  // Limpiar Search Proxy al cerrar
  cleanupSearchProxy();
  
  // Limpiar Chromium al cerrar
  cleanupChromium();
  
  // Limpiar Puppeteer al cerrar
  cleanupPuppeteerBrowser();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// MANEJO DE ERRORES
// ==========================================

process.on('uncaughtException', (error) => {
  if (error.message.includes('quota database') || 
      error.message.includes('Database IO error') || 
      error.message.includes('storage')) {
    console.warn('⚠️ Error de almacenamiento ignorado:', error.message);
  } else {
    console.error('❌ Error no capturado:', error);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  if (reason && reason.toString().includes('quota') || 
      reason && reason.toString().includes('storage')) {
    console.warn('⚠️ Promesa rechazada de almacenamiento ignorada:', reason);
  } else {
    console.error('❌ Promesa rechazada no manejada en:', promise, 'razón:', reason);
  }
});

console.log('✅ [Koko] Manejadores de error configurados');

// ==========================================
// DESARROLLO
// ==========================================

async function setupDevelopment() {
  if (process.env.NODE_ENV === 'development') {
    try {
      const electronReload = await import('electron-reload');
      electronReload.default(__dirname, {
        electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
        hardResetMethod: 'exit'
      });
      console.log('🔄 [Dev] electron-reload activado');
    } catch (error) {
      console.log('ℹ️ [Dev] electron-reload no disponible:', error.message);
    }
  }
}

setupDevelopment();

console.log('✅ [Koko] Main process cargado - ' + __filename);
