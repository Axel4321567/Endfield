const { contextBridge, ipcRenderer } = require('electron');

// API segura expuesta al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Versión y configuración
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config) => ipcRenderer.invoke('set-config', config),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getFileVersion: (filePath) => ipcRenderer.invoke('get-file-version', filePath),

  // Gestión de archivos
  downloadFile: (url, onProgress) => {
    // Configurar listener para progreso
    const progressHandler = (event, progress) => {
      if (onProgress) onProgress(progress);
    };
    
    ipcRenderer.on('download-progress', progressHandler);
    
    return ipcRenderer.invoke('download-file', url).finally(() => {
      ipcRenderer.removeListener('download-progress', progressHandler);
    });
  },
  
  validateFileIntegrity: (filePath, expectedHash) => 
    ipcRenderer.invoke('validate-file-integrity', filePath, expectedHash),
  
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),

  // Gestión de procesos
  launchProcess: (executablePath, options) => 
    ipcRenderer.invoke('launch-process', executablePath, options),
  
  terminateProcess: (pid, force) => 
    ipcRenderer.invoke('terminate-process', pid, force),
  
  isProcessRunning: (pid) => ipcRenderer.invoke('is-process-running', pid),

  // Actualizaciones
  installUpdate: (filePath) => ipcRenderer.invoke('install-update', filePath),
  
  cancelDownload: () => {
    // Implementar cancelación si es necesario
    return Promise.resolve();
  },

  // Navegador específico
  isBrowserRunning: async () => {
    // Verificar si KokoBrowser.exe está ejecutándose
    const { spawn } = require('child_process');
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        const tasklist = spawn('tasklist', ['/FI', 'IMAGENAME eq KokoBrowser.exe']);
        let output = '';
        
        tasklist.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        tasklist.on('close', (code) => {
          resolve(output.includes('KokoBrowser.exe'));
        });
      } else {
        resolve(false);
      }
    });
  },
  
  closeBrowser: () => {
    // Enviar señal de cierre a KokoBrowser
    if (process.platform === 'win32') {
      const { spawn } = require('child_process');
      spawn('taskkill', ['/IM', 'KokoBrowser.exe', '/T']);
    }
    return Promise.resolve();
  },

  // Dependencias (MariaDB, HeidiSQL)
  checkDependencyUpdates: async () => {
    // Implementar verificación de actualizaciones de dependencias
    return Promise.resolve({
      mariadb: null,
      heidisql: null
    });
  },
  
  updateDependency: (dependency, downloadUrl) => {
    // Implementar actualización de dependencias
    return Promise.resolve();
  },

  // Logs
  writeLog: (level, message) => ipcRenderer.invoke('write-log', level, message),
  getLogs: (lines) => ipcRenderer.invoke('get-logs', lines),

  // Listeners para eventos
  onLogEntry: (callback) => {
    ipcRenderer.on('log-entry', (event, logEntry) => {
      callback(logEntry);
    });
  },
  
  onUpdaterProgress: (callback) => {
    ipcRenderer.on('updater-progress', (event, progress) => {
      callback(progress);
    });
  },
  
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('log-entry');
    ipcRenderer.removeAllListeners('updater-progress');
    ipcRenderer.removeAllListeners('download-progress');
  },

  // Utilidades del sistema
  openExternal: (url) => {
    const { shell } = require('electron');
    return shell.openExternal(url);
  },
  
  showMessageBox: (options) => {
    const { dialog } = require('electron');
    return dialog.showMessageBox(options);
  },
  
  showSaveDialog: (options) => {
    const { dialog } = require('electron');
    return dialog.showSaveDialog(options);
  },
  
  showOpenDialog: (options) => {
    const { dialog } = require('electron');
    return dialog.showOpenDialog(options);
  }
});