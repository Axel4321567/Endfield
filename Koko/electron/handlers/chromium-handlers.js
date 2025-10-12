import { ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import { execSync, spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 🌐 Handlers para gestionar Chromium
 * Descarga, instalación, verificación y gestión de Chromium usando @puppeteer/browsers
 */

// Variable global para el proceso de Chromium
let chromiumProcess = null;

// Rutas de instalación
function getChromiumPaths() {
  const userHome = process.env.HOME || process.env.USERPROFILE || '';
  const chromiumDir = path.join(userHome, '.koko', 'chromium');
  
  return {
    chromiumDir,
    chromiumCache: path.join(chromiumDir, 'cache'),
    chromiumData: path.join(chromiumDir, 'data')
  };
}

/**
 * Verificar si Chromium está instalado
 */
async function checkChromiumInstallation() {
  try {
    const { chromiumDir } = getChromiumPaths();
    
    // Verificar si existe el directorio
    if (!existsSync(chromiumDir)) {
      return {
        installed: false,
        version: null,
        path: null
      };
    }

    // Buscar el ejecutable de Chromium
    const platform = process.platform;
    let chromiumExecutable = null;
    let version = null;

    // Buscar recursivamente el ejecutable en el directorio (modo silencioso)
    const findExecutable = (dir, depth = 0, maxDepth = 10) => {
      if (depth > maxDepth) return null;
      
      try {
        const files = readdirSync(dir, { withFileTypes: true });
        
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          
          if (file.isFile()) {
            // Buscar chrome.exe o chrome dependiendo de la plataforma
            if ((platform === 'win32' && file.name === 'chrome.exe') ||
                (platform === 'darwin' && file.name === 'Chromium') ||
                (platform === 'linux' && file.name === 'chrome')) {
              return fullPath;
            }
          } else if (file.isDirectory()) {
            const found = findExecutable(fullPath, depth + 1, maxDepth);
            if (found) return found;
          }
        }
      } catch (error) {
        // Silencioso
      }
      return null;
    };

    chromiumExecutable = findExecutable(chromiumDir);

    if (chromiumExecutable && existsSync(chromiumExecutable)) {
      // Intentar obtener la versión
      try {
        const versionOutput = execSync(`"${chromiumExecutable}" --version`, { encoding: 'utf-8' });
        version = versionOutput.trim();
      } catch (error) {
        console.warn('No se pudo obtener versión de Chromium:', error);
        version = 'Desconocida';
      }

      return {
        installed: true,
        version,
        path: chromiumExecutable
      };
    }

    return {
      installed: false,
      version: null,
      path: null
    };
  } catch (error) {
    console.error('Error al verificar instalación de Chromium:', error);
    return {
      installed: false,
      version: null,
      path: null,
      error: error.message
    };
  }
}

/**
 * Descargar e instalar Chromium usando @puppeteer/browsers
 */
async function downloadChromium(event) {
  try {
    console.log('📥 [Chromium] Iniciando descarga...');
    const { chromiumDir } = getChromiumPaths();

    // Crear directorio si no existe
    await fs.mkdir(chromiumDir, { recursive: true });
    console.log('📁 [Chromium] Directorio creado:', chromiumDir);

    // Enviar progreso
    event.sender.send('chromium-download-progress', {
      progress: 10,
      phase: 'Preparando descarga...'
    });

    // Importar dinámicamente @puppeteer/browsers
    const { install, Browser, resolveBuildId, detectBrowserPlatform } = await import('@puppeteer/browsers');
    
    event.sender.send('chromium-download-progress', {
      progress: 20,
      phase: 'Obteniendo versión estable...'
    });

    console.log('🔍 [Chromium] Obteniendo última versión estable...');

    // Detectar plataforma actual
    const platform = detectBrowserPlatform();
    if (!platform) {
      throw new Error('No se pudo detectar la plataforma del sistema');
    }
    console.log(`🖥️ [Chromium] Plataforma detectada: ${platform}`);

    // Obtener la última versión estable dinámicamente
    const buildId = await resolveBuildId(Browser.CHROME, platform, 'stable');
    console.log(`📌 [Chromium] Versión a descargar: ${buildId}`);

    event.sender.send('chromium-download-progress', {
      progress: 30,
      phase: `Descargando versión ${buildId}...`
    });

    console.log('🌐 [Chromium] Descargando desde repositorio oficial...');

    // Descargar Chromium
    const browser = await install({
      browser: Browser.CHROME,
      buildId: buildId,
      cacheDir: chromiumDir,
      platform: platform,
      downloadProgressCallback: (downloadedBytes, totalBytes) => {
        const progress = Math.round((downloadedBytes / totalBytes) * 50) + 30;
        event.sender.send('chromium-download-progress', {
          progress,
          phase: `Descargando: ${Math.round(downloadedBytes / 1024 / 1024)}MB / ${Math.round(totalBytes / 1024 / 1024)}MB`
        });
      }
    });

    console.log('✅ [Chromium] Descarga completada');
    console.log('📂 [Chromium] Ruta del ejecutable:', browser.executablePath);

    event.sender.send('chromium-download-progress', {
      progress: 90,
      phase: 'Verificando instalación...'
    });

    // Dar tiempo para que los archivos se escriban completamente
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verificar instalación
    const installCheck = await checkChromiumInstallation();
    console.log('🔍 [Chromium] Verificación de instalación:', installCheck);

    event.sender.send('chromium-download-progress', {
      progress: 100,
      phase: 'Completado'
    });

    // Asegurar que retornamos datos válidos
    const finalPath = browser.executablePath || installCheck.path;
    const finalVersion = installCheck.version || buildId;

    console.log('✅ [Chromium] Instalación completada');
    console.log('📌 Versión:', finalVersion);
    console.log('📂 Ruta:', finalPath);

    return {
      success: true,
      path: finalPath,
      version: finalVersion,
      installed: true,
      message: 'Chromium instalado correctamente'
    };

  } catch (error) {
    console.error('❌ [Chromium] Error en descarga:', error);
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

/**
 * Verificar integridad de Chromium
 */
async function verifyChromium() {
  try {
    const installation = await checkChromiumInstallation();
    
    if (!installation.installed) {
      return {
        success: false,
        error: 'Chromium no está instalado'
      };
    }

    // Verificar que el ejecutable existe y tiene permisos
    const stats = await fs.stat(installation.path);
    
    if (!stats.isFile()) {
      return {
        success: false,
        error: 'El ejecutable de Chromium no es un archivo válido'
      };
    }

    // Verificar tamaño mínimo (debe ser mayor a 1MB)
    if (stats.size < 1024 * 1024) {
      return {
        success: false,
        error: 'El ejecutable de Chromium parece estar corrupto (tamaño muy pequeño)'
      };
    }

    return {
      success: true,
      filesChecked: 1,
      size: stats.size,
      path: installation.path
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Desinstalar Chromium
 */
async function uninstallChromium() {
  try {
    const { chromiumDir } = getChromiumPaths();
    
    if (!existsSync(chromiumDir)) {
      return {
        success: true,
        message: 'Chromium no estaba instalado'
      };
    }

    // Eliminar directorio completo
    await fs.rm(chromiumDir, { recursive: true, force: true });
    
    console.log('✅ [Chromium] Desinstalado correctamente');
    
    return {
      success: true,
      message: 'Chromium desinstalado correctamente'
    };
  } catch (error) {
    console.error('❌ [Chromium] Error al desinstalar:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Limpiar caché de Chromium
 */
async function clearChromiumCache() {
  try {
    const { chromiumCache } = getChromiumPaths();
    
    if (!existsSync(chromiumCache)) {
      return {
        success: true,
        bytesCleared: 0,
        message: 'No hay caché para limpiar'
      };
    }

    // Calcular tamaño antes de eliminar
    const getDirectorySize = async (dir) => {
      let size = 0;
      const files = await fs.readdir(dir, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          size += await getDirectorySize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          size += stats.size;
        }
      }
      
      return size;
    };

    const bytesCleared = await getDirectorySize(chromiumCache);
    
    // Eliminar caché
    await fs.rm(chromiumCache, { recursive: true, force: true });
    await fs.mkdir(chromiumCache, { recursive: true });
    
    console.log(`✅ [Chromium] Caché limpiado: ${bytesCleared} bytes`);
    
    return {
      success: true,
      bytesCleared,
      message: `Caché limpiado: ${Math.round(bytesCleared / 1024 / 1024)}MB liberados`
    };
  } catch (error) {
    console.error('❌ [Chromium] Error al limpiar caché:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Registrar handlers IPC para Chromium
 */
export function registerChromiumHandlers() {
  console.log('🌐 [Chromium] Registrando handlers IPC...');

  // Obtener estado de Chromium
  ipcMain.handle('chromium-status', async () => {
    try {
      const installation = await checkChromiumInstallation();
      return {
        success: true,
        ...installation
      };
    } catch (error) {
      console.error('Error al verificar estado de Chromium:', error);
      return {
        success: false,
        installed: false,
        error: error.message
      };
    }
  });

  // Descargar Chromium
  ipcMain.handle('chromium-download', async (event) => {
    return await downloadChromium(event);
  });

  // Verificar integridad
  ipcMain.handle('chromium-verify', async () => {
    return await verifyChromium();
  });

  // Desinstalar Chromium
  ipcMain.handle('chromium-uninstall', async () => {
    return await uninstallChromium();
  });

  // Limpiar caché
  ipcMain.handle('chromium-clear-cache', async () => {
    return await clearChromiumCache();
  });

  // [DESHABILITADO] Lanzar Chromium como navegador - usamos BrowserView ahora
  ipcMain.handle('chromium-launch', async (event, url = 'https://www.google.com') => {
    console.log('⚠️ [Chromium] chromium-launch está deshabilitado - usar puppeteerBrowser en su lugar');
    return {
      success: false,
      error: 'chromium-launch está deshabilitado. Use window.electronAPI.puppeteerBrowser.open() en su lugar.'
    };
    
    /* CÓDIGO ORIGINAL DESHABILITADO
    try {
      console.log('🚀 [Chromium] Intentando lanzar Chromium...', { url });
      
      const installation = await checkChromiumInstallation();
      
      if (!installation.installed || !installation.path) {
        console.error('❌ [Chromium] No está instalado');
        return {
          success: false,
          error: 'Chromium no está instalado. Por favor, descárgalo primero.'
        };
      }

      // Si ya hay un proceso ejecutándose, cerrarlo primero
      if (chromiumProcess) {
        console.log('⚠️ [Chromium] Cerrando proceso anterior...');
        try {
          chromiumProcess.kill();
        } catch (err) {
          console.warn('⚠️ [Chromium] Error al cerrar proceso anterior:', err.message);
        }
        chromiumProcess = null;
      }

      const { chromiumData } = getChromiumPaths();
      
      // Crear directorio de datos si no existe
      await fs.mkdir(chromiumData, { recursive: true });

      const chromiumArgs = [
        `--user-data-dir=${chromiumData}`,
        '--disable-background-networking',
        '--disable-client-side-phishing-detection',
        '--disable-default-apps',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--enable-automation',
        '--no-first-run',
        '--no-service-autorun',
        '--password-store=basic',
        url
      ];

      console.log('🚀 [Chromium] Lanzando con args:', chromiumArgs);

      chromiumProcess = spawn(installation.path, chromiumArgs, {
        detached: true,
        stdio: 'ignore'
      });

      chromiumProcess.unref();

      chromiumProcess.on('error', (error) => {
        console.error('❌ [Chromium] Error al lanzar:', error);
      });

      chromiumProcess.on('exit', (code) => {
        console.log(`🔴 [Chromium] Proceso terminado con código: ${code}`);
        chromiumProcess = null;
      });

      console.log('✅ [Chromium] Lanzado exitosamente con PID:', chromiumProcess.pid);

      return {
        success: true,
        pid: chromiumProcess.pid,
        message: 'Chromium lanzado correctamente'
      };
    } catch (error) {
      console.error('❌ [Chromium] Error al lanzar:', error);
      return {
        success: false,
        error: error.message
      };
    }
    FIN CÓDIGO ORIGINAL DESHABILITADO */
  });

  // Cerrar Chromium
  ipcMain.handle('chromium-close', async () => {
    try {
      if (!chromiumProcess) {
        return {
          success: true,
          message: 'No hay proceso de Chromium ejecutándose'
        };
      }

      chromiumProcess.kill();
      chromiumProcess = null;

      return {
        success: true,
        message: 'Chromium cerrado correctamente'
      };
    } catch (error) {
      console.error('❌ [Chromium] Error al cerrar:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('✅ [Chromium] Handlers registrados correctamente');
}

/**
 * Limpiar proceso de Chromium al cerrar la app
 */
export function cleanupChromium() {
  if (chromiumProcess) {
    try {
      console.log('🔴 [Chromium] Cerrando proceso al cerrar app...');
      chromiumProcess.kill();
      chromiumProcess = null;
    } catch (error) {
      console.error('❌ [Chromium] Error al cerrar proceso:', error);
    }
  }
}
