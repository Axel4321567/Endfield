const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { spawn, exec } = require('child_process');
const os = require('os');

// Configuración global
let mainWindow = null;
let config = {};
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const configPath = path.join(__dirname, '../resources/config/update.json');
const logPath = path.join(__dirname, '../resources/launcher/logs/launcher.log');

// Crear ventana principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 760,
    resizable: false,
    maximizable: false,
    icon: path.join(__dirname, '../resources/icons/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a2e',
      symbolColor: '#ffffff'
    },
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000'
  });

  // Cargar la aplicación
  if (isDev) {
    mainWindow.loadURL('http://localhost:5177');
    // DevTools se pueden abrir con Ctrl+Shift+I o F12
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Mostrar cuando esté listo
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Configuración inicial
async function initializeApp() {
  try {
    // Crear directorios necesarios
    const logsDir = path.dirname(logPath);
    await fs.mkdir(logsDir, { recursive: true });
    
    const configDir = path.dirname(configPath);
    await fs.mkdir(configDir, { recursive: true });

    // Cargar configuración
    await loadConfig();
    
    // Configurar auto-updater
    autoUpdater.checkForUpdatesAndNotify();
    
    writeLog('info', 'Koko Launcher iniciado correctamente');
  } catch (error) {
    writeLog('error', `Error inicializando aplicación: ${error.message}`);
  }
}

// Gestión de configuración
async function loadConfig() {
  try {
    const configData = await fs.readFile(configPath, 'utf8');
    config = JSON.parse(configData);
  } catch (error) {
    // Configuración por defecto
    config = {
      version: app.getVersion(),
      updateChannel: 'stable',
      browserPath: '',
      lastUpdate: new Date().toISOString()
    };
    await saveConfig();
  }
}

async function saveConfig() {
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    writeLog('error', `Error guardando configuración: ${error.message}`);
  }
}

// Sistema de logs
async function writeLog(level, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}\\n`;
  
  try {
    await fs.appendFile(logPath, logEntry);
    
    // Enviar log al renderer si está disponible
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-entry', { timestamp, level, message });
    }
  } catch (error) {
    console.error('Error escribiendo log:', error);
  }
}

async function getLogs(lines = 100) {
  try {
    const logData = await fs.readFile(logPath, 'utf8');
    const logLines = logData.split('\\n').filter(line => line.trim());
    return logLines.slice(-lines);
  } catch (error) {
    return [];
  }
}

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-config', () => {
  return config;
});

ipcMain.handle('set-config', async (event, newConfig) => {
  config = { ...config, ...newConfig };
  await saveConfig();
  return config;
});

ipcMain.handle('download-file', async (event, url) => {
  return new Promise((resolve, reject) => {
    const { net } = require('electron');
    const request = net.request(url);
    
    let downloaded = 0;
    let total = 0;
    const chunks = [];
    
    request.on('response', (response) => {
      total = parseInt(response.headers['content-length'] || '0');
      
      response.on('data', (chunk) => {
        chunks.push(chunk);
        downloaded += chunk.length;
        
        const percentage = total > 0 ? (downloaded / total) * 100 : 0;
        event.sender.send('download-progress', {
          downloaded,
          total,
          percentage,
          speed: 0, // Se calculará en el frontend
          timeRemaining: 0
        });
      });
      
      response.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const tempPath = path.join(__dirname, '../temp', `download_${Date.now()}.tmp`);
          
          await fs.mkdir(path.dirname(tempPath), { recursive: true });
          await fs.writeFile(tempPath, buffer);
          
          resolve(tempPath);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    request.on('error', reject);
    request.end();
  });
});

ipcMain.handle('validate-file-integrity', async (event, filePath, expectedHash) => {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    return actualHash.toLowerCase() === expectedHash.toLowerCase();
  } catch (error) {
    writeLog('error', `Error validando integridad: ${error.message}`);
    return false;
  }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    writeLog('error', `Error eliminando archivo: ${error.message}`);
    return false;
  }
});

ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

// Obtener información del sistema
ipcMain.handle('get-system-info', async () => {
  return {
    username: os.userInfo().username,
    homedir: os.homedir(),
    platform: os.platform()
  };
});

// Obtener versión de un archivo ejecutable
ipcMain.handle('get-file-version', async (event, filePath) => {
  try {
    if (process.platform !== 'win32') {
      return null;
    }
    
    // Usar PowerShell para obtener la versión del archivo
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      const command = `powershell -Command "(Get-ItemProperty '${filePath}').VersionInfo.FileVersion"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Error obteniendo versión:', error);
          resolve(null);
          return;
        }
        
        const version = stdout.trim();
        if (version && version !== '' && !version.includes('Cannot find')) {
          resolve(version);
        } else {
          resolve(null);
        }
      });
    });
  } catch (error) {
    writeLog('error', `Error obteniendo versión de archivo: ${error.message}`);
    return null;
  }
});

ipcMain.handle('launch-process', async (event, executablePath, options = {}) => {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(executablePath, options.args || [], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      detached: true,
      stdio: 'ignore'
    });
    
    childProcess.unref();
    
    childProcess.on('error', (error) => {
      writeLog('error', `Error lanzando proceso: ${error.message}`);
      reject(error);
    });
    
    childProcess.on('spawn', () => {
      writeLog('info', `Proceso lanzado: ${executablePath} (PID: ${childProcess.pid})`);
      resolve({ pid: childProcess.pid });
    });
  });
});

ipcMain.handle('terminate-process', async (event, pid, force = false) => {
  try {
    if (process.platform === 'win32') {
      const signal = force ? '/F' : '/T';
      exec(`taskkill ${signal} /PID ${pid}`, (error) => {
        if (error) {
          writeLog('error', `Error terminando proceso: ${error.message}`);
        } else {
          writeLog('info', `Proceso terminado: PID ${pid}`);
        }
      });
    } else {
      process.kill(pid, force ? 'SIGKILL' : 'SIGTERM');
    }
    return true;
  } catch (error) {
    writeLog('error', `Error terminando proceso: ${error.message}`);
    return false;
  }
});

ipcMain.handle('is-process-running', async (event, pid) => {
  try {
    if (process.platform === 'win32') {
      return new Promise((resolve) => {
        exec(`tasklist /FI "PID eq ${pid}"`, (error, stdout) => {
          resolve(!error && stdout.includes(pid.toString()));
        });
      });
    } else {
      process.kill(pid, 0);
      return true;
    }
  } catch {
    return false;
  }
});

ipcMain.handle('install-update', async (event, filePath) => {
  try {
    writeLog('info', `Iniciando instalación de actualización: ${filePath}`);
    
    // Ejecutar el instalador
    const installerProcess = spawn(filePath, ['/S'], {
      detached: true,
      stdio: 'ignore'
    });
    
    installerProcess.unref();
    
    return new Promise((resolve, reject) => {
      installerProcess.on('error', reject);
      installerProcess.on('exit', (code) => {
        if (code === 0) {
          writeLog('info', 'Actualización instalada exitosamente');
          resolve();
        } else {
          reject(new Error(`Instalación falló con código: ${code}`));
        }
      });
    });
  } catch (error) {
    writeLog('error', `Error instalando actualización: ${error.message}`);
    throw error;
  }
});

ipcMain.handle('write-log', async (event, level, message) => {
  await writeLog(level, message);
});

ipcMain.handle('get-logs', async (event, lines) => {
  return await getLogs(lines);
});

// Eventos de la aplicación
app.whenReady().then(() => {
  createWindow();
  initializeApp();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Configuración de seguridad
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationURL) => {
    navigationEvent.preventDefault();
    shell.openExternal(navigationURL);
  });
  
  contents.on('will-navigate', (navigationEvent, navigationURL) => {
    const parsedUrl = new URL(navigationURL);
    
    if (parsedUrl.origin !== 'http://localhost:5173' && !isDev) {
      navigationEvent.preventDefault();
    }
  });
});

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  writeLog('info', 'Verificando actualizaciones...');
});

autoUpdater.on('update-available', (info) => {
  writeLog('info', `Actualización disponible: ${info.version}`);
});

autoUpdater.on('update-not-available', (info) => {
  writeLog('info', 'No hay actualizaciones disponibles');
});

autoUpdater.on('error', (err) => {
  writeLog('error', `Error en auto-updater: ${err.message}`);
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  writeLog('info', 'Actualización descargada, reiniciando...');
  autoUpdater.quitAndInstall();
});