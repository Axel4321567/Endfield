import { ipcMain, app } from 'electron';
import os from 'os';

/**
 * Handlers IPC para operaciones del sistema
 */

export function registerSystemHandlers() {
  // Actualización del sistema (git + npm)
  ipcMain.handle('system-update', async () => {
    console.log('🚀 [System] Ejecutando actualización del sistema');
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const projectDir = app.getAppPath();
      console.log('📁 [System] Directorio del proyecto:', projectDir);
      
      console.log('📥 [System] Descargando cambios...');
      await execAsync('git fetch origin main', { cwd: projectDir });
      
      console.log('🔄 [System] Aplicando cambios...');
      await execAsync('git reset --hard origin/main', { cwd: projectDir });
      
      console.log('📦 [System] Instalando dependencias...');
      await execAsync('npm install', { cwd: projectDir });
      
      console.log('🏗️ [System] Construyendo aplicación...');
      await execAsync('npm run build', { cwd: projectDir });
      
      console.log('✅ [System] Actualización completada exitosamente');
      return { success: true, message: 'Actualización completada' };
      
    } catch (error) {
      console.error('❌ [System] Error durante la actualización:', error);
      return { success: false, error: error.message };
    }
  });

  // Reiniciar aplicación
  ipcMain.handle('system-restart', () => {
    console.log('🔄 [System] Reiniciando aplicación...');
    app.relaunch();
    app.exit(0);
  });

  // Información del sistema
  ipcMain.handle('system-info', () => {
    console.log('📊 [System] Obteniendo información del sistema');
    return {
      platform: process.platform,
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      appPath: app.getAppPath(),
      userData: app.getPath('userData'),
      os: {
        type: os.type(),
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
      }
    };
  });

  console.log('✅ [IPC] Handlers de sistema registrados');
}

export default {
  registerSystemHandlers
};
