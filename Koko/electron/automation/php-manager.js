/**
 * PHP Manager - Gestión de PHP portable
 * Instalación, configuración y gestión de PHP en Windows
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de rutas
const RESOURCES_PATH = path.join(__dirname, '..', '..', 'resources', 'php');
const INSTALL_DIR = path.join(RESOURCES_PATH, 'server');
const INSTALLER_PATH = path.join(RESOURCES_PATH, 'php-portable.zip');

const INSTALLER_FILENAME = 'php-portable.zip';
const PHP_DOWNLOAD_PAGE = 'https://windows.php.net/download/';

/**
 * Obtiene dinámicamente la URL de descarga de la última versión de PHP
 * Busca la versión más reciente de PHP 8.3 VS16 x64 Thread Safe
 */
async function getLatestPhpDownloadUrl() {
  const https = await import('https');
  
  return new Promise((resolve, reject) => {
    console.log('🔍 [PhpManager] Buscando última versión de PHP...');
    
    https.default.get(PHP_DOWNLOAD_PAGE, {
      headers: {
        'User-Agent': 'Koko-Browser/1.3.2 (Windows NT 10.0; Win64; x64) PHP-Downloader'
      }
    }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Manejar redirecciones
        https.default.get(response.headers.location, (redirectResponse) => {
          parsePhpDownloadPage(redirectResponse, resolve, reject);
        }).on('error', reject);
        return;
      }
      
      parsePhpDownloadPage(response, resolve, reject);
    }).on('error', reject);
  });
}

/**
 * Parsea la página de descargas de PHP para encontrar la URL más reciente
 */
function parsePhpDownloadPage(response, resolve, reject) {
  let html = '';
  
  response.on('data', (chunk) => {
    html += chunk.toString();
  });
  
  response.on('end', () => {
    try {
      // Buscar versiones de PHP 8.3 VS16 x64 Thread Safe
      // Patrón: php-8.3.XX-Win32-vs16-x64.zip (Thread Safe, no NTS)
      const regex = /php-(8\.3\.\d+)-Win32-vs16-x64\.zip/g;
      const matches = [...html.matchAll(regex)];
      
      if (matches.length === 0) {
        // Fallback a PHP 8.2 si no encuentra 8.3
        const fallbackRegex = /php-(8\.2\.\d+)-Win32-vs16-x64\.zip/g;
        const fallbackMatches = [...html.matchAll(fallbackRegex)];
        
        if (fallbackMatches.length === 0) {
          reject(new Error('No se encontraron versiones de PHP 8.3 o 8.2 disponibles'));
          return;
        }
        
        const version = fallbackMatches[0][1];
        const url = `https://windows.php.net/downloads/releases/php-${version}-Win32-vs16-x64.zip`;
        console.log(`✅ [PhpManager] Versión encontrada: PHP ${version} (fallback)`);
        resolve({ version, url });
        return;
      }
      
      // Usar la primera coincidencia (generalmente la más reciente)
      const version = matches[0][1];
      const url = `https://windows.php.net/downloads/releases/php-${version}-Win32-vs16-x64.zip`;
      console.log(`✅ [PhpManager] Versión encontrada: PHP ${version}`);
      resolve({ version, url });
      
    } catch (error) {
      reject(new Error(`Error parseando página de descargas: ${error.message}`));
    }
  });
  
  response.on('error', reject);
}

/**
 * Descarga un archivo desde una URL con seguimiento de progreso
 */
async function downloadFile(url, destinationPath, progressCallback) {
  const https = await import('https');
  const http = await import('http');
  
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https.default : http.default;
    
    console.log(`📥 [PhpManager] Descargando desde: ${url}`);
    
    const options = {
      headers: {
        'User-Agent': 'Koko-Browser/1.3.2 (Windows NT 10.0; Win64; x64) PHP-Downloader'
      }
    };
    
    const request = protocol.get(url, options, (response) => {
      // Manejar redirecciones
      if (response.statusCode === 302 || response.statusCode === 301) {
        console.log(`🔄 [PhpManager] Redirigiendo a: ${response.headers.location}`);
        downloadFile(response.headers.location, destinationPath, progressCallback)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Error HTTP: ${response.statusCode}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      const chunks = [];
      
      response.on('data', (chunk) => {
        chunks.push(chunk);
        downloadedSize += chunk.length;
        
        if (progressCallback && totalSize) {
          const progress = Math.round((downloadedSize / totalSize) * 50); // 0-50% para descarga
          progressCallback({
            progress: Math.min(progress, 50),
            phase: `Descargando PHP: ${Math.round(downloadedSize / 1024 / 1024)}MB / ${Math.round(totalSize / 1024 / 1024)}MB`
          });
        }
      });
      
      response.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          fs.writeFileSync(destinationPath, buffer);
          console.log(`✅ [PhpManager] Descarga completada: ${destinationPath} (${Math.round(buffer.length / 1024 / 1024)}MB)`);
          resolve(destinationPath);
        } catch (err) {
          if (fs.existsSync(destinationPath)) {
            fs.unlinkSync(destinationPath);
          }
          reject(err);
        }
      });
      
      response.on('error', (err) => {
        if (fs.existsSync(destinationPath)) {
          fs.unlinkSync(destinationPath);
        }
        reject(err);
      });
    });
    
    request.on('error', (err) => {
      if (fs.existsSync(destinationPath)) {
        fs.unlinkSync(destinationPath);
      }
      reject(err);
    });
    
    request.setTimeout(60000, () => {
      request.destroy();
      if (fs.existsSync(destinationPath)) {
        fs.unlinkSync(destinationPath);
      }
      reject(new Error('Timeout de descarga (60s)'));
    });
  });
}

/**
 * Asegura que el instalador de PHP esté disponible
 */
async function ensurePhpInstaller(progressCallback) {
  try {
    // Verificar si ya existe el instalador
    if (fs.existsSync(INSTALLER_PATH)) {
      const stats = fs.statSync(INSTALLER_PATH);
      const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`✅ [PhpManager] Instalador encontrado: ${INSTALLER_PATH} (${sizeInMB}MB)`);
      return INSTALLER_PATH;
    }
    
    // Crear directorio si no existe
    if (!fs.existsSync(RESOURCES_PATH)) {
      fs.mkdirSync(RESOURCES_PATH, { recursive: true });
    }
    
    console.log(`📦 [PhpManager] Descargando PHP...`);
    
    // Obtener dinámicamente la URL de la última versión
    const { version, url } = await getLatestPhpDownloadUrl();
    console.log(`📦 [PhpManager] Descargando PHP ${version}...`);
    
    await downloadFile(url, INSTALLER_PATH, progressCallback);
    return INSTALLER_PATH;
    
  } catch (error) {
    console.error(`❌ [PhpManager] Error descargando instalador:`, error);
    
    // Limpiar archivo parcial si existe
    if (fs.existsSync(INSTALLER_PATH)) {
      fs.unlinkSync(INSTALLER_PATH);
    }
    
    throw new Error(`No se pudo descargar el instalador de PHP: ${error.message}`);
  }
}

/**
 * Extraer archivo ZIP usando PowerShell
 */
async function extractZip(zipPath, destinationPath) {
  console.log(`📦 [PhpManager] Extrayendo ZIP: ${zipPath} -> ${destinationPath}`);
  
  // Crear directorio de destino si no existe
  if (!fs.existsSync(destinationPath)) {
    fs.mkdirSync(destinationPath, { recursive: true });
  }
  
  // Usar PowerShell para extraer
  const extractCmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destinationPath}' -Force"`;
  
  try {
    await execAsync(extractCmd);
    console.log(`✅ [PhpManager] Extracción completada`);
    return true;
  } catch (error) {
    console.error(`❌ [PhpManager] Error al extraer ZIP:`, error);
    throw new Error(`No se pudo extraer PHP: ${error.message}`);
  }
}

/**
 * Clase principal para manejar PHP
 */
class PhpManager {
  constructor() {
    this.isInstalling = false;
    this.progressCallback = null;
  }

  /**
   * Configurar callback para eventos de progreso
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  /**
   * Verifica si PHP está instalado
   */
  async isPhpInstalled() {
    try {
      const phpExe = path.join(INSTALL_DIR, 'php.exe');
      const installed = fs.existsSync(phpExe);
      
      if (installed) {
        console.log(`✅ [PhpManager] PHP encontrado en: ${INSTALL_DIR}`);
      } else {
        console.log(`⚠️ [PhpManager] PHP no encontrado en: ${phpExe}`);
      }
      
      return installed;
    } catch (error) {
      console.error(`❌ [PhpManager] Error verificando instalación:`, error.message);
      return false;
    }
  }

  /**
   * Reconfigura php.ini para corregir extension_dir y extensiones
   */
  async reconfigurePhpIni() {
    try {
      const phpIni = path.join(INSTALL_DIR, 'php.ini');
      
      if (!fs.existsSync(phpIni)) {
        console.log('⚠️ [PhpManager] php.ini no existe, creándolo desde php.ini-development...');
        const phpIniDev = path.join(INSTALL_DIR, 'php.ini-development');
        if (fs.existsSync(phpIniDev)) {
          fs.copyFileSync(phpIniDev, phpIni);
        } else {
          throw new Error('No se encuentra php.ini-development');
        }
      }

      console.log('🔧 [PhpManager] Reconfigurando php.ini...');
      let phpIniContent = fs.readFileSync(phpIni, 'utf8');
      
      // Configurar extension_dir con ruta absoluta
      const extDir = path.join(INSTALL_DIR, 'ext');
      phpIniContent = phpIniContent.replace(
        /^;?\s*extension_dir\s*=.*$/gm,
        `extension_dir = "${extDir.replace(/\\/g, '/')}"`
      );
      
      // Si no existe ninguna línea extension_dir, agregarla
      if (!phpIniContent.includes('extension_dir =')) {
        phpIniContent = phpIniContent.replace(
          /\[PHP\]/,
          `[PHP]\nextension_dir = "${extDir.replace(/\\/g, '/')}"`
        );
      }
      
      // Habilitar extensiones necesarias
      const extensionsToEnable = ['mysqli', 'pdo_mysql', 'mbstring', 'openssl', 'curl', 'fileinfo', 'gd', 'intl', 'zip'];
      extensionsToEnable.forEach(ext => {
        const regex = new RegExp(`;extension=${ext}`, 'g');
        phpIniContent = phpIniContent.replace(regex, `extension=${ext}`);
      });
      
      fs.writeFileSync(phpIni, phpIniContent, 'utf8');
      console.log(`✅ [PhpManager] php.ini reconfigurado correctamente`);
      
      return { success: true };
    } catch (error) {
      console.error('❌ [PhpManager] Error reconfigurando php.ini:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene información de PHP instalado
   */
  async getPhpInfo() {
    try {
      const isInstalled = await this.isPhpInstalled();
      
      if (!isInstalled) {
        return {
          installed: false,
          version: 'No detectada',
          path: null
        };
      }

      // Obtener versión de PHP
      const phpExe = path.join(INSTALL_DIR, 'php.exe');
      try {
        const { stdout } = await execAsync(`"${phpExe}" -v`);
        const versionMatch = stdout.match(/PHP (\d+\.\d+\.\d+)/);
        const version = versionMatch ? versionMatch[1] : 'Desconocida';
        
        return {
          installed: true,
          version: version,
          path: INSTALL_DIR
        };
      } catch (error) {
        console.error('❌ [PhpManager] Error al obtener versión:', error);
        return {
          installed: true,
          version: 'Error al detectar',
          path: INSTALL_DIR
        };
      }
    } catch (error) {
      console.error('❌ [PhpManager] Error general:', error);
      return {
        installed: false,
        version: 'Error',
        path: null
      };
    }
  }

  /**
   * Instala PHP portable (versión ZIP)
   */
  async install() {
    if (this.isInstalling) {
      return { success: false, message: 'Instalación ya en progreso' };
    }

    this.isInstalling = true;
    
    try {
      console.log('🔧 [PhpManager] Iniciando instalación de PHP portable...');
      
      // Verificar si ya está instalado
      const isInstalled = await this.isPhpInstalled();
      if (isInstalled) {
        console.log('✅ [PhpManager] PHP ya está instalado');
        return { success: true, message: 'PHP ya está instalado' };
      }

      // Descargar ZIP portable
      console.log('📦 [PhpManager] Descargando PHP portable...');
      const zipPath = await ensurePhpInstaller(this.progressCallback);
      
      if (this.progressCallback) {
        this.progressCallback({ progress: 50, phase: 'Extrayendo archivos...' });
      }
      
      // Extraer ZIP a resources/php/server
      console.log(`📦 [PhpManager] Extrayendo a: ${INSTALL_DIR}`);
      await extractZip(zipPath, INSTALL_DIR);
      
      if (this.progressCallback) {
        this.progressCallback({ progress: 70, phase: 'Configurando PHP...' });
      }
      
      // Verificar si PHP se extrajo directamente o en una subcarpeta
      const phpExeDirect = path.join(INSTALL_DIR, 'php.exe');
      
      if (!fs.existsSync(phpExeDirect)) {
        // Buscar subcarpetas que contengan PHP
        console.log(`🔍 [PhpManager] php.exe no encontrado directamente, buscando en subcarpetas...`);
        const extractedFolders = fs.readdirSync(INSTALL_DIR).filter(item => {
          const fullPath = path.join(INSTALL_DIR, item);
          return fs.statSync(fullPath).isDirectory();
        });
        
        // Si se extrajo en una subcarpeta, mover el contenido al directorio principal
        if (extractedFolders.length > 0) {
          const phpFolder = path.join(INSTALL_DIR, extractedFolders[0]);
          const phpExeInFolder = path.join(phpFolder, 'php.exe');
          
          if (fs.existsSync(phpExeInFolder)) {
            console.log(`✅ [PhpManager] PHP encontrado en: ${phpFolder}`);
            console.log(`🔄 [PhpManager] Moviendo archivos al directorio principal...`);
            
            const files = fs.readdirSync(phpFolder);
            let movedCount = 0;
            let errorCount = 0;
            
            for (const file of files) {
              const srcPath = path.join(phpFolder, file);
              const destPath = path.join(INSTALL_DIR, file);
              
              try {
                // Si el destino ya existe, eliminarlo primero
                if (fs.existsSync(destPath)) {
                  console.log(`🗑️ [PhpManager] Eliminando ${file} existente...`);
                  if (fs.statSync(destPath).isDirectory()) {
                    fs.rmSync(destPath, { recursive: true, force: true });
                  } else {
                    fs.unlinkSync(destPath);
                  }
                }
                
                // Copiar archivo/carpeta
                if (fs.statSync(srcPath).isDirectory()) {
                  fs.cpSync(srcPath, destPath, { recursive: true, force: true });
                } else {
                  fs.copyFileSync(srcPath, destPath);
                }
                movedCount++;
                console.log(`✅ [PhpManager] Movido: ${file}`);
              } catch (error) {
                errorCount++;
                console.error(`❌ [PhpManager] Error moviendo ${file}:`, error.message);
              }
            }
            
            console.log(`📊 [PhpManager] Resumen: ${movedCount} archivos movidos, ${errorCount} errores`);
            
            // Eliminar carpeta temporal
            try {
              fs.rmSync(phpFolder, { recursive: true, force: true });
              console.log(`✅ [PhpManager] Carpeta temporal eliminada`);
            } catch (rmError) {
              console.warn(`⚠️ [PhpManager] No se pudo eliminar carpeta temporal:`, rmError.message);
            }
          } else {
            throw new Error(`No se encontró php.exe en la subcarpeta: ${phpFolder}`);
          }
        } else {
          throw new Error(`No se encontró php.exe después de la extracción`);
        }
      } else {
        console.log(`✅ [PhpManager] PHP extraído directamente en: ${INSTALL_DIR}`);
      }
      
      if (this.progressCallback) {
        this.progressCallback({ progress: 90, phase: 'Configurando php.ini...' });
      }
      
      // Crear php.ini desde php.ini-development
      const phpExe = path.join(INSTALL_DIR, 'php.exe');
      const phpIni = path.join(INSTALL_DIR, 'php.ini');
      const phpIniDev = path.join(INSTALL_DIR, 'php.ini-development');
      
      if (!fs.existsSync(phpExe)) {
        throw new Error(`No se encontró php.exe en: ${phpExe}`);
      }
      
      if (fs.existsSync(phpIniDev) && !fs.existsSync(phpIni)) {
        fs.copyFileSync(phpIniDev, phpIni);
        console.log(`✅ [PhpManager] php.ini creado desde php.ini-development`);
        
        // Habilitar extensiones comunes para desarrollo web
        let phpIniContent = fs.readFileSync(phpIni, 'utf8');
        
        // Configurar extension_dir con ruta absoluta correcta
        const extDir = path.join(INSTALL_DIR, 'ext');
        
        // Buscar todas las líneas de extension_dir y descomentar/actualizar
        phpIniContent = phpIniContent.replace(
          /^;?\s*extension_dir\s*=.*$/gm,
          `extension_dir = "${extDir.replace(/\\/g, '/')}"`
        );
        
        // Si no existe ninguna línea extension_dir, agregarla después de [PHP]
        if (!phpIniContent.includes('extension_dir =')) {
          phpIniContent = phpIniContent.replace(
            /\[PHP\]/,
            `[PHP]\nextension_dir = "${extDir.replace(/\\/g, '/')}"`
          );
        }
        
        console.log(`✅ [PhpManager] extension_dir configurado en: ${extDir}`);
        
        // Habilitar extensiones importantes
        const extensionsToEnable = [
          'mysqli',
          'pdo_mysql',
          'mbstring',
          'openssl',
          'curl',
          'fileinfo',
          'gd',
          'intl',
          'zip'
        ];
        
        extensionsToEnable.forEach(ext => {
          const regex = new RegExp(`;extension=${ext}`, 'g');
          phpIniContent = phpIniContent.replace(regex, `extension=${ext}`);
        });
        
        // Configurar zona horaria
        phpIniContent = phpIniContent.replace(
          /;date\.timezone\s*=.*/,
          'date.timezone = America/Mexico_City'
        );
        
        fs.writeFileSync(phpIni, phpIniContent, 'utf8');
        console.log(`✅ [PhpManager] php.ini configurado con extensiones habilitadas`);
      }
      
      if (this.progressCallback) {
        this.progressCallback({ progress: 100, phase: 'Instalación completada' });
      }
      
      console.log('✅ [PhpManager] PHP portable instalado correctamente');
      return { 
        success: true, 
        message: 'PHP instalado correctamente' 
      };
      
    } catch (error) {
      console.error('❌ [PhpManager] Error en instalación:', error);
      return { 
        success: false, 
        message: error.message || 'Error desconocido durante la instalación'
      };
    } finally {
      this.isInstalling = false;
    }
  }

  /**
   * Desinstala PHP portable (elimina archivos)
   */
  async uninstall() {
    try {
      console.log('🗑️ [PhpManager] Iniciando desinstalación de PHP portable...');
      
      // Verificar si está instalado
      const isInstalled = await this.isPhpInstalled();
      if (!isInstalled) {
        console.log('⚠️ [PhpManager] PHP no está instalado');
        return { success: false, message: 'PHP no está instalado' };
      }

      // Eliminar archivos de instalación
      const installDir = INSTALL_DIR;
      if (fs.existsSync(installDir)) {
        console.log(`🗑️ [PhpManager] Eliminando archivos de instalación: ${installDir}`);
        try {
          fs.rmSync(installDir, { recursive: true, force: true });
          console.log('✅ [PhpManager] Archivos eliminados');
        } catch (fsError) {
          console.error(`❌ [PhpManager] Error al eliminar archivos:`, fsError.message);
          throw new Error(`No se pudieron eliminar los archivos: ${fsError.message}`);
        }
      }
      
      // Eliminar el archivo ZIP descargado
      const zipPath = INSTALLER_PATH;
      if (fs.existsSync(zipPath)) {
        console.log(`🗑️ [PhpManager] Eliminando instalador: ${zipPath}`);
        try {
          fs.unlinkSync(zipPath);
          console.log('✅ [PhpManager] Instalador eliminado');
        } catch (error) {
          console.warn('⚠️ [PhpManager] No se pudo eliminar instalador:', error.message);
        }
      }
      
      // Verificar que se desinstaló
      const stillInstalled = await this.isPhpInstalled();
      if (stillInstalled) {
        throw new Error('La desinstalación parece haber fallado');
      }
      
      console.log('✅ [PhpManager] PHP desinstalado correctamente');
      return { 
        success: true, 
        message: 'PHP desinstalado correctamente' 
      };
      
    } catch (error) {
      console.error('❌ [PhpManager] Error en desinstalación:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  }
}

// Exportar instancia única
export default new PhpManager();
