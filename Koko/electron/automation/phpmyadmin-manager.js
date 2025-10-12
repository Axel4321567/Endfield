/**
 * 🐘 phpMyAdmin Manager
 * Gestiona el servidor PHP embebido y phpMyAdmin
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PHPMYADMIN_DOWNLOAD_PAGE = 'https://www.phpmyadmin.net/downloads/';
const RESOURCES_PATH = path.join(__dirname, '..', '..', 'resources');
const PHPMYADMIN_PATH = path.join(RESOURCES_PATH, 'phpmyadmin');
const INSTALLER_PATH = path.join(RESOURCES_PATH, 'phpmyadmin-installer.zip');

/**
 * Obtiene dinámicamente la URL de descarga de la última versión de phpMyAdmin
 */
async function getLatestPhpMyAdminUrl() {
  const https = await import('https');
  
  return new Promise((resolve, reject) => {
    console.log('🔍 [PhpMyAdmin] Buscando última versión...');
    
    https.default.get(PHPMYADMIN_DOWNLOAD_PAGE, {
      headers: {
        'User-Agent': 'Koko-Browser/1.3.2 (Windows NT 10.0; Win64; x64) PhpMyAdmin-Downloader'
      }
    }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.default.get(response.headers.location, (redirectResponse) => {
          parsePhpMyAdminPage(redirectResponse, resolve, reject);
        }).on('error', reject);
        return;
      }
      
      parsePhpMyAdminPage(response, resolve, reject);
    }).on('error', reject);
  });
}

/**
 * Parsea la página de descargas de phpMyAdmin
 */
function parsePhpMyAdminPage(response, resolve, reject) {
  let html = '';
  
  response.on('data', (chunk) => {
    html += chunk.toString();
  });
  
  response.on('end', () => {
    try {
      // Buscar enlaces de descarga: phpMyAdmin-X.Y.Z-all-languages.zip
      const regex = /href="([^"]*phpMyAdmin-(\d+\.\d+\.\d+)-all-languages\.zip)"/g;
      const matches = [...html.matchAll(regex)];
      
      if (matches.length === 0) {
        reject(new Error('No se encontraron versiones de phpMyAdmin disponibles'));
        return;
      }
      
      // Tomar la primera coincidencia (más reciente)
      let url = matches[0][1];
      const version = matches[0][2];
      
      // Si la URL es relativa, construir URL completa
      if (!url.startsWith('http')) {
        url = `https://files.phpmyadmin.net/phpMyAdmin/${version}/phpMyAdmin-${version}-all-languages.zip`;
      }
      
      console.log(`✅ [PhpMyAdmin] Versión encontrada: ${version}`);
      resolve({ version, url });
      
    } catch (error) {
      reject(new Error(`Error parseando página: ${error.message}`));
    }
  });
  
  response.on('error', reject);
}

/**
 * Descarga un archivo desde una URL
 */
async function downloadFile(url, destinationPath, progressCallback) {
  const https = await import('https');
  const http = await import('http');
  
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https.default : http.default;
    
    console.log(`📥 [PhpMyAdmin] Descargando desde: ${url}`);
    
    const options = {
      headers: {
        'User-Agent': 'Koko-Browser/1.3.2 (Windows NT 10.0; Win64; x64) PhpMyAdmin-Downloader'
      }
    };
    
    const request = protocol.get(url, options, (response) => {
      // Manejar redirecciones
      if (response.statusCode === 302 || response.statusCode === 301) {
        console.log(`🔄 [PhpMyAdmin] Redirigiendo a: ${response.headers.location}`);
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
          const progress = Math.round((downloadedSize / totalSize) * 50);
          progressCallback({
            progress: Math.min(progress, 50),
            phase: `Descargando: ${Math.round(downloadedSize / 1024 / 1024)}MB / ${Math.round(totalSize / 1024 / 1024)}MB`
          });
        }
      });
      
      response.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          fs.writeFileSync(destinationPath, buffer);
          console.log(`✅ [PhpMyAdmin] Descarga completada: ${destinationPath} (${Math.round(buffer.length / 1024 / 1024)}MB)`);
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
 * Extrae archivo ZIP usando módulo nativo de Node.js
 */
async function extractZip(zipPath, destinationPath) {
  console.log(`📦 [PhpMyAdmin] Extrayendo: ${zipPath} -> ${destinationPath}`);
  
  // Usar AdmZip para extracción rápida
  try {
    // Importar AdmZip dinámicamente
    const AdmZip = (await import('adm-zip')).default;
    
    if (!fs.existsSync(destinationPath)) {
      fs.mkdirSync(destinationPath, { recursive: true });
    }
    
    const zip = new AdmZip(zipPath);
    console.log(`📂 [PhpMyAdmin] Extrayendo archivos...`);
    
    // Extraer todos los archivos
    zip.extractAllTo(destinationPath, true);
    
    console.log(`✅ [PhpMyAdmin] Extracción completada`);
  } catch (error) {
    console.error(`❌ [PhpMyAdmin] Error en extracción:`, error);
    
    // Fallback a PowerShell si AdmZip falla
    console.log(`🔄 [PhpMyAdmin] Intentando con PowerShell como fallback...`);
    const extractCmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& { $ProgressPreference = 'SilentlyContinue'; Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath}', '${destinationPath}') }"`;
    
    try {
      await execAsync(extractCmd, { 
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024
      });
      console.log(`✅ [PhpMyAdmin] Extracción completada con PowerShell`);
    } catch (psError) {
      throw new Error(`Error extrayendo ZIP: ${psError.message}`);
    }
  }
}

class PhpMyAdminManager {
  constructor() {
    this.phpProcess = null;
    this.phpPort = 8888;
    this.phpPath = path.join(__dirname, '..', '..', 'resources', 'php', 'server');
    this.phpMyAdminPath = path.join(__dirname, '..', '..', 'resources', 'phpmyadmin');
    this.phpExe = path.join(this.phpPath, 'php.exe');
    this.phpIni = path.join(this.phpPath, 'php.ini');
    this.isRunning = false;
  }

  /**
   * Verifica si PHP está instalado
   */
  isPhpInstalled() {
    return fs.existsSync(this.phpExe);
  }

  /**
   * Verifica si phpMyAdmin está instalado
   */
  isPhpMyAdminInstalled() {
    const indexPath = path.join(this.phpMyAdminPath, 'index.php');
    return fs.existsSync(indexPath);
  }

  /**
   * Instala phpMyAdmin descargándolo automáticamente
   */
  async install(progressCallback) {
    try {
      console.log('🔧 [PhpMyAdmin] Iniciando instalación...');
      
      // Verificar si ya está instalado
      if (this.isPhpMyAdminInstalled()) {
        console.log('✅ [PhpMyAdmin] Ya está instalado');
        return { success: true, message: 'phpMyAdmin ya está instalado' };
      }

      // Crear directorio de resources si no existe
      if (!fs.existsSync(RESOURCES_PATH)) {
        fs.mkdirSync(RESOURCES_PATH, { recursive: true });
      }

      if (progressCallback) {
        progressCallback({ progress: 10, phase: 'Buscando última versión...' });
      }

      // Obtener URL de descarga dinámica
      const { version, url } = await getLatestPhpMyAdminUrl();
      console.log(`📦 [PhpMyAdmin] Descargando phpMyAdmin ${version}...`);

      if (progressCallback) {
        progressCallback({ progress: 20, phase: `Descargando phpMyAdmin ${version}...` });
      }

      // Descargar ZIP
      await downloadFile(url, INSTALLER_PATH, progressCallback);

      if (progressCallback) {
        progressCallback({ progress: 60, phase: 'Extrayendo archivos...' });
      }

      // Extraer a directorio temporal
      const tempDir = path.join(RESOURCES_PATH, 'phpmyadmin-temp');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempDir, { recursive: true });

      await extractZip(INSTALLER_PATH, tempDir);
      console.log(`✅ [PhpMyAdmin] Extracción finalizada, procesando archivos...`);

      if (progressCallback) {
        progressCallback({ progress: 80, phase: 'Moviendo archivos...' });
      }

      // Buscar la carpeta extraída (phpMyAdmin-X.Y.Z-all-languages)
      console.log(`🔍 [PhpMyAdmin] Buscando carpeta extraída en: ${tempDir}`);
      const extractedFolders = fs.readdirSync(tempDir);
      console.log(`📁 [PhpMyAdmin] Carpetas encontradas: ${extractedFolders.length}`);
      
      if (extractedFolders.length === 0) {
        throw new Error('No se encontraron archivos después de la extracción');
      }

      const extractedFolder = path.join(tempDir, extractedFolders[0]);
      console.log(`📂 [PhpMyAdmin] Usando carpeta: ${extractedFolder}`);
      
      // Verificar que sea una carpeta válida de phpMyAdmin
      const indexPath = path.join(extractedFolder, 'index.php');
      if (!fs.existsSync(indexPath)) {
        throw new Error('La carpeta extraída no contiene index.php');
      }

      // Mover a la ubicación final
      if (fs.existsSync(this.phpMyAdminPath)) {
        fs.rmSync(this.phpMyAdminPath, { recursive: true, force: true });
      }

      fs.renameSync(extractedFolder, this.phpMyAdminPath);
      console.log(`✅ [PhpMyAdmin] Archivos movidos a: ${this.phpMyAdminPath}`);

      // Limpiar archivos temporales
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      if (fs.existsSync(INSTALLER_PATH)) {
        fs.unlinkSync(INSTALLER_PATH);
      }

      if (progressCallback) {
        progressCallback({ progress: 90, phase: 'Configurando phpMyAdmin...' });
      }

      // Crear configuración
      this.createPhpMyAdminConfig();

      if (progressCallback) {
        progressCallback({ progress: 100, phase: 'Instalación completada' });
      }

      console.log('✅ [PhpMyAdmin] Instalación completada exitosamente');
      return {
        success: true,
        message: `phpMyAdmin ${version} instalado correctamente`,
        version
      };

    } catch (error) {
      console.error('❌ [PhpMyAdmin] Error en instalación:', error);
      
      // Limpiar en caso de error
      if (fs.existsSync(INSTALLER_PATH)) {
        fs.unlinkSync(INSTALLER_PATH);
      }
      if (fs.existsSync(path.join(RESOURCES_PATH, 'phpmyadmin-temp'))) {
        fs.rmSync(path.join(RESOURCES_PATH, 'phpmyadmin-temp'), { recursive: true, force: true });
      }
      
      throw error;
    }
  }

  /**
   * Desinstala phpMyAdmin
   */
  async uninstall() {
    try {
      console.log('🗑️ [PhpMyAdmin] Iniciando desinstalación...');
      
      // Detener servidor si está corriendo
      if (this.isRunning) {
        await this.stop();
      }

      // Eliminar directorio de phpMyAdmin
      if (fs.existsSync(this.phpMyAdminPath)) {
        fs.rmSync(this.phpMyAdminPath, { recursive: true, force: true });
        console.log('✅ [PhpMyAdmin] Archivos eliminados');
      }

      // Eliminar archivo ZIP si existe
      if (fs.existsSync(INSTALLER_PATH)) {
        fs.unlinkSync(INSTALLER_PATH);
      }

      console.log('✅ [PhpMyAdmin] Desinstalación completada');
      return {
        success: true,
        message: 'phpMyAdmin desinstalado correctamente'
      };

    } catch (error) {
      console.error('❌ [PhpMyAdmin] Error en desinstalación:', error);
      throw error;
    }
  }

  /**
   * Verifica si el puerto está disponible
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = http.createServer();
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(true);
        }
      });
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  }

  /**
   * Encuentra un puerto disponible
   */
  async findAvailablePort(startPort = 8888) {
    let port = startPort;
    while (port < startPort + 100) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
      port++;
    }
    throw new Error('No se pudo encontrar un puerto disponible');
  }

  /**
   * Configura php.ini con las extensiones necesarias
   */
  configurePhpIni() {
    try {
      const phpIniDev = path.join(this.phpPath, 'php.ini-development');
      
      // Si no existe php.ini, copiar desde php.ini-development
      if (!fs.existsSync(this.phpIni) && fs.existsSync(phpIniDev)) {
        fs.copyFileSync(phpIniDev, this.phpIni);
      }

      if (!fs.existsSync(this.phpIni)) {
        console.log('⚠️ No se encontró php.ini, usando configuración por defecto');
        return;
      }

      let config = fs.readFileSync(this.phpIni, 'utf8');

      // Habilitar extensiones necesarias para phpMyAdmin
      const extensions = [
        'extension=mysqli',
        'extension=mbstring',
        'extension=openssl',
        'extension=curl'
      ];

      let modified = false;
      extensions.forEach(ext => {
        const extName = ext.split('=')[1];
        const commented = `;${ext}`;
        
        if (config.includes(commented)) {
          config = config.replace(commented, ext);
          modified = true;
          console.log(`✅ Habilitada extensión: ${extName}`);
        } else if (!config.includes(ext)) {
          config += `\n${ext}\n`;
          modified = true;
          console.log(`✅ Agregada extensión: ${extName}`);
        }
      });

      if (modified) {
        fs.writeFileSync(this.phpIni, config);
        console.log('✅ php.ini configurado correctamente');
      }
    } catch (error) {
      console.error('❌ Error configurando php.ini:', error.message);
    }
  }

  /**
   * Crea el archivo config.inc.php para phpMyAdmin
   */
  createPhpMyAdminConfig() {
    try {
      const configPath = path.join(this.phpMyAdminPath, 'config.inc.php');
      
      // Generar blowfish_secret aleatorio
      const blowfishSecret = Array(32)
        .fill(0)
        .map(() => Math.random().toString(36).charAt(2))
        .join('');

      const config = `<?php
/**
 * phpMyAdmin configuration for Koko Browser
 * Auto-generated configuration
 */

declare(strict_types=1);

// Blowfish secret for cookie auth
$cfg['blowfish_secret'] = '${blowfishSecret}';

// Server configuration
$i = 0;

// MariaDB local server
$i++;
$cfg['Servers'][$i]['auth_type'] = 'config';
$cfg['Servers'][$i]['host'] = 'localhost';
$cfg['Servers'][$i]['port'] = '3306';
$cfg['Servers'][$i]['user'] = 'root';
$cfg['Servers'][$i]['password'] = '';
$cfg['Servers'][$i]['compress'] = false;
$cfg['Servers'][$i]['AllowNoPassword'] = true;

// Directories for saving/loading files
$cfg['UploadDir'] = '';
$cfg['SaveDir'] = '';

// Disable version check
$cfg['VersionCheck'] = false;

// UI settings
$cfg['DefaultLang'] = 'es';
$cfg['DefaultConnectionCollation'] = 'utf8mb4_unicode_ci';

// Security settings
$cfg['AllowArbitraryServer'] = false;
$cfg['LoginCookieValidity'] = 3600;

// Allow embedding in iframe (for Koko Browser)
$cfg['SendErrorReports'] = 'never';
$cfg['AllowThirdPartyFraming'] = true;

// Memory and time limits
$cfg['ExecTimeLimit'] = 300;
$cfg['MemoryLimit'] = '512M';

// Theme
$cfg['ThemeDefault'] = 'pmahomme';

// Disable X-Frame-Options and CSP headers for iframe support
ini_set('session.cookie_samesite', 'None');
ini_set('session.cookie_secure', '0');
`;

      fs.writeFileSync(configPath, config);
      console.log('✅ config.inc.php creado correctamente');
    } catch (error) {
      console.error('❌ Error creando config.inc.php:', error.message);
      throw error;
    }
  }

  /**
   * Crea un script router PHP para modificar cabeceras HTTP
   */
  createRouterScript() {
    const routerPath = path.join(this.phpMyAdminPath, 'koko-router.php');
    const routerContent = `<?php
/**
 * Router personalizado para Koko Browser
 * Permite cargar phpMyAdmin en iframe eliminando restricciones X-Frame-Options
 */

// Eliminar cabeceras que bloquean iframe
header_remove('X-Frame-Options');
header('X-Frame-Options: ALLOWALL');

// Permitir CORS desde el mismo origen
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Obtener la URI solicitada
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $uri;

// Si es un archivo estático que existe, servirlo
if ($uri !== '/' && file_exists($file) && !is_dir($file)) {
    return false; // PHP built-in server servirá el archivo
}

// Para rutas de phpMyAdmin, incluir index.php
if ($uri === '/' || $uri === '/index.php') {
    require __DIR__ . '/index.php';
} else {
    // Intentar servir el archivo solicitado
    if (file_exists($file)) {
        return false;
    } else {
        // Si no existe, redirigir a index.php
        require __DIR__ . '/index.php';
    }
}
?>`;

    fs.writeFileSync(routerPath, routerContent, 'utf8');
    console.log(`✅ [PhpMyAdmin] Router script creado: ${routerPath}`);
    return routerPath;
  }

  /**
   * Inicia el servidor PHP con phpMyAdmin
   */
  async start() {
    try {
      // Verificar instalación de PHP
      if (!this.isPhpInstalled()) {
        throw new Error('PHP no está instalado. Por favor, descarga PHP portable y colócalo en resources/php/');
      }

      // Verificar instalación de phpMyAdmin
      if (!this.isPhpMyAdminInstalled()) {
        throw new Error('phpMyAdmin no está instalado. Por favor, descarga phpMyAdmin y colócalo en resources/phpmyadmin/');
      }

      // Si ya está corriendo, devolver la URL
      if (this.isRunning && this.phpProcess) {
        return {
          success: true,
          url: `http://localhost:${this.phpPort}`,
          port: this.phpPort
        };
      }

      // Configurar PHP y phpMyAdmin
      this.configurePhpIni();
      this.createPhpMyAdminConfig();

      // Buscar puerto disponible
      this.phpPort = await this.findAvailablePort(8888);
      console.log(`🔍 Puerto disponible encontrado: ${this.phpPort}`);

      // Crear archivo router para modificar cabeceras
      const routerPath = this.createRouterScript();

      // Iniciar servidor PHP con router personalizado
      return new Promise((resolve, reject) => {
        const args = [
          '-S', `localhost:${this.phpPort}`,
          '-t', this.phpMyAdminPath,
          '-c', this.phpPath,
          routerPath
        ];

        console.log(`🐘 Iniciando PHP: ${this.phpExe} ${args.join(' ')}`);

        this.phpProcess = spawn(this.phpExe, args, {
          cwd: this.phpMyAdminPath,
          windowsHide: true
        });

        // Capturar salida
        this.phpProcess.stdout.on('data', (data) => {
          console.log(`[PHP] ${data.toString()}`);
        });

        this.phpProcess.stderr.on('data', (data) => {
          const output = data.toString();
          console.log(`[PHP] ${output}`);
          
          // Detectar cuando el servidor está listo
          if (output.includes('Development Server') || output.includes('started')) {
            this.isRunning = true;
            console.log(`✅ Servidor PHP iniciado en http://localhost:${this.phpPort}`);
            resolve({
              success: true,
              url: `http://localhost:${this.phpPort}`,
              port: this.phpPort
            });
          }
        });

        this.phpProcess.on('error', (error) => {
          console.error('❌ Error iniciando PHP:', error.message);
          this.isRunning = false;
          reject(error);
        });

        this.phpProcess.on('exit', (code) => {
          console.log(`⚠️ Servidor PHP terminado con código: ${code}`);
          this.isRunning = false;
          this.phpProcess = null;
        });

        // Timeout de 5 segundos
        setTimeout(() => {
          if (!this.isRunning) {
            this.stop();
            reject(new Error('Timeout: El servidor PHP no pudo iniciarse'));
          }
        }, 5000);
      });
    } catch (error) {
      console.error('❌ Error en start():', error.message);
      throw error;
    }
  }

  /**
   * Detiene el servidor PHP
   */
  stop() {
    return new Promise((resolve) => {
      if (this.phpProcess) {
        console.log('🛑 Deteniendo servidor PHP...');
        
        this.phpProcess.once('exit', () => {
          this.phpProcess = null;
          this.isRunning = false;
          console.log('✅ Servidor PHP detenido');
          resolve({ success: true });
        });

        // Forzar cierre en Windows
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', this.phpProcess.pid, '/f', '/t']);
        } else {
          this.phpProcess.kill('SIGTERM');
        }

        // Timeout de seguridad
        setTimeout(() => {
          if (this.phpProcess) {
            this.phpProcess.kill('SIGKILL');
          }
          this.phpProcess = null;
          this.isRunning = false;
          resolve({ success: true });
        }, 3000);
      } else {
        this.isRunning = false;
        resolve({ success: true });
      }
    });
  }

  /**
   * Obtiene el estado del servidor
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      phpInstalled: this.isPhpInstalled(),
      phpMyAdminInstalled: this.isPhpMyAdminInstalled(),
      url: this.isRunning ? `http://localhost:${this.phpPort}` : null,
      port: this.phpPort
    };
  }
}

export default PhpMyAdminManager;
