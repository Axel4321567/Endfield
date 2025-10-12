import { spawn } from 'child_process';
import path from 'path';
import { app, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let proxyProcess = null;

/**
 * 🔍 Handlers para gestionar el Search Proxy (FastAPI)
 */

/**
 * Obtener la ruta del script de Python del Search Proxy
 */
function getProxyScriptPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'src', 'APIs', 'SearchProxy', 'main.py');
  }
  // En desarrollo, subir dos niveles desde handlers/ para llegar a la raíz del proyecto
  return path.join(__dirname, '..', '..', 'src', 'APIs', 'SearchProxy', 'main.py');
}

/**
 * Verificar si el proxy está corriendo
 */
async function checkProxyStatus() {
  try {
    const response = await fetch('http://localhost:8001/health', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        running: true,
        status: data.status,
        version: data.version,
        port: 8001
      };
    }
  } catch (error) {
    // El servicio no está corriendo
  }
  
  return { running: false, port: 8001 };
}

/**
 * Registrar handlers IPC para Search Proxy
 */
export function registerSearchProxyServiceHandlers() {
  
  // Obtener estado del Search Proxy
  ipcMain.handle('search-proxy-status', async () => {
    try {
      const status = await checkProxyStatus();
      return {
        success: true,
        running: status.running,
        port: status.port,
        version: status.version
      };
    } catch (error) {
      console.error('Error al verificar estado del Search Proxy:', error);
      return {
        success: false,
        running: false,
        error: error.message
      };
    }
  });

  // Iniciar Search Proxy
  ipcMain.handle('search-proxy-start', async () => {
    try {
      console.log('🚀 [Search Proxy] Intentando iniciar servicio...');
      
      // Verificar si ya está corriendo
      const currentStatus = await checkProxyStatus();
      if (currentStatus.running) {
        console.log('✅ [Search Proxy] Ya está corriendo');
        return {
          success: true,
          message: 'Search Proxy ya está corriendo',
          port: 8001
        };
      }

      // Obtener ruta del script de Python
      const scriptPath = getProxyScriptPath();
      console.log(`📁 [Search Proxy] Ruta del script: ${scriptPath}`);
      
      // Verificar que el archivo existe
      try {
        await fs.access(scriptPath);
        console.log('✅ [Search Proxy] Script encontrado');
      } catch (error) {
        console.error('❌ [Search Proxy] Script no encontrado');
        throw new Error(`No se encontró el script del proxy en: ${scriptPath}`);
      }

      // Determinar el comando de Python
      const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
      console.log(`🐍 [Search Proxy] Ejecutando: ${pythonCommand} ${scriptPath}`);
      
      // Iniciar el proceso de Python
      proxyProcess = spawn(pythonCommand, [scriptPath], {
        cwd: path.dirname(scriptPath),
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      console.log(`✅ [Search Proxy] Proceso iniciado con PID: ${proxyProcess.pid}`);

      // Capturar logs del proceso
      proxyProcess.stdout.on('data', (data) => {
        console.log(`[Search Proxy] ${data.toString()}`);
      });

      proxyProcess.stderr.on('data', (data) => {
        console.error(`[Search Proxy Error] ${data.toString()}`);
      });

      proxyProcess.on('error', (error) => {
        console.error('Error al iniciar Search Proxy:', error);
      });

      proxyProcess.on('exit', (code, signal) => {
        console.log(`Search Proxy terminó con código ${code}, señal ${signal}`);
        proxyProcess = null;
      });

      // Esperar a que el servicio esté listo
      let attempts = 0;
      const maxAttempts = 30; // 15 segundos (30 * 500ms)
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const status = await checkProxyStatus();
        
        if (status.running) {
          return {
            success: true,
            message: 'Search Proxy iniciado correctamente',
            port: 8001,
            pid: proxyProcess.pid
          };
        }
        
        attempts++;
      }

      // Si llegamos aquí, el servicio no se inició a tiempo
      if (proxyProcess) {
        proxyProcess.kill();
        proxyProcess = null;
      }
      
      throw new Error('El servicio no se inició en el tiempo esperado');

    } catch (error) {
      console.error('Error al iniciar Search Proxy:', error);
      
      if (proxyProcess) {
        proxyProcess.kill();
        proxyProcess = null;
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Detener Search Proxy
  ipcMain.handle('search-proxy-stop', async () => {
    try {
      if (!proxyProcess) {
        // Verificar si está corriendo externamente
        const status = await checkProxyStatus();
        if (!status.running) {
          return {
            success: true,
            message: 'Search Proxy no estaba corriendo'
          };
        }
        
        // Si está corriendo externamente, no podemos detenerlo desde aquí
        return {
          success: false,
          error: 'Search Proxy está corriendo externamente. Deténlo manualmente.'
        };
      }

      // Terminar el proceso
      return new Promise((resolve) => {
        proxyProcess.on('exit', () => {
          proxyProcess = null;
          resolve({
            success: true,
            message: 'Search Proxy detenido correctamente'
          });
        });

        // Enviar señal de terminación
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', proxyProcess.pid, '/f', '/t']);
        } else {
          proxyProcess.kill('SIGTERM');
        }

        // Timeout de seguridad
        setTimeout(() => {
          if (proxyProcess) {
            proxyProcess.kill('SIGKILL');
            proxyProcess = null;
          }
          resolve({
            success: true,
            message: 'Search Proxy detenido (forzado)'
          });
        }, 5000);
      });

    } catch (error) {
      console.error('Error al detener Search Proxy:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('✅ Handlers del Search Proxy Service registrados');
}

// Limpiar al cerrar la aplicación
export function cleanupSearchProxy() {
  if (proxyProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', proxyProcess.pid, '/f', '/t']);
      } else {
        proxyProcess.kill('SIGTERM');
      }
      proxyProcess = null;
    } catch (error) {
      console.error('Error al limpiar Search Proxy:', error);
    }
  }
}
