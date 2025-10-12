import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
import https from 'https';
import { app } from 'electron';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

// URLs de descarga para MariaDB (versión portable ZIP)
const MARIADB_DOWNLOAD_URLS = {
  windows: 'https://archive.mariadb.org/mariadb-10.11.10/winx64-packages/mariadb-10.11.10-winx64.zip',
  fallback: 'https://downloads.mariadb.org/f/mariadb-10.6.19/winx64-packages/mariadb-10.6.19-winx64.zip'
};

const INSTALLER_FILENAME = 'mariadb-portable.zip';
const RESOURCES_PATH = path.join(__dirname, '..', '..', 'resources', 'mariadb');
const INSTALLER_PATH = path.join(RESOURCES_PATH, INSTALLER_FILENAME);
const INSTALL_DIR = path.join(RESOURCES_PATH, 'server');

/**
 * Descargar un archivo desde una URL
 */
async function downloadFile(url, destinationPath, progressCallback = null) {
  return new Promise((resolve, reject) => {
    console.log(`🔽 [DatabaseManager] Descargando desde: ${url}`);
    
    // Crear directorio si no existe
    const dir = path.dirname(destinationPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const file = fs.createWriteStream(destinationPath);
    
    const request = https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Manejar redirecciones
        file.close();
        return downloadFile(response.headers.location, destinationPath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(destinationPath, () => {}); // Eliminar archivo parcial
        return reject(new Error(`Error de descarga: HTTP ${response.statusCode}`));
      }
      
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      let lastProgress = -1;
      
      console.log(`📦 [DatabaseManager] Tamaño del archivo: ${Math.round(totalSize / 1024 / 1024)}MB`);
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const progress = totalSize ? Math.round((downloadedSize / totalSize) * 100) : 0;
        
        // Solo mostrar progreso cuando cambie en incrementos de 5%
        if (progress !== lastProgress && progress % 5 === 0) {
          const progressData = {
            progress: progress,
            phase: `Descargando: ${Math.round(downloadedSize / 1024 / 1024)}MB/${Math.round(totalSize / 1024 / 1024)}MB`
          };
          console.log(`📥 [DatabaseManager] Progreso: ${progress}% (${Math.round(downloadedSize / 1024 / 1024)}MB/${Math.round(totalSize / 1024 / 1024)}MB)`);
          
          // Enviar evento a la interfaz si tenemos callback
          if (progressCallback) {
            progressCallback(progressData);
          }
          
          lastProgress = progress;
        }
      });
      
      response.pipe(file);
    });
    
    file.on('finish', () => {
      file.close();
      
      // Validar que el archivo se descargó correctamente
      const stats = fs.statSync(destinationPath);
      if (stats.size < 1024 * 1024) { // Si es menor a 1MB, probablemente es un error
        fs.unlink(destinationPath, () => {});
        return reject(new Error('Archivo descargado parece estar incompleto o corrupto'));
      }
      
      console.log(`✅ [DatabaseManager] Descarga completada: ${destinationPath} (${Math.round(stats.size / 1024 / 1024)}MB)`);
      resolve(destinationPath);
    });
    
    request.on('error', (err) => {
      file.close();
      fs.unlink(destinationPath, () => {}); // Eliminar archivo parcial
      reject(new Error(`Error de red: ${err.message}`));
    });
    
    file.on('error', (err) => {
      fs.unlink(destinationPath, () => {}); // Eliminar archivo parcial
      reject(new Error(`Error escribiendo archivo: ${err.message}`));
    });
    
    // Timeout de 5 minutos
    request.setTimeout(300000, () => {
      request.abort();
      file.close();
      fs.unlink(destinationPath, () => {});
      reject(new Error('Timeout: La descarga tardó demasiado'));
    });
  });
}

/**
 * Descargar el instalador de MariaDB si no existe
 */
async function ensureMariaDBInstaller(progressCallback = null) {
  try {
    console.log(`📦 [DatabaseManager] Verificando instalador de MariaDB...`);
    
    // Verificar si el instalador ya existe
    if (fs.existsSync(INSTALLER_PATH)) {
      const stats = fs.statSync(INSTALLER_PATH);
      console.log(`✅ [DatabaseManager] Instalador encontrado: ${INSTALLER_PATH} (${Math.round(stats.size / 1024 / 1024)}MB)`);
      return INSTALLER_PATH;
    }
    
    console.log(`⚠️ [DatabaseManager] Instalador no encontrado, descargando...`);
    
    // Intentar descargar desde la URL principal
    try {
      console.log(`🌐 [DatabaseManager] Intentando descarga desde servidor principal...`);
      await downloadFile(MARIADB_DOWNLOAD_URLS.windows, INSTALLER_PATH, progressCallback);
      return INSTALLER_PATH;
    } catch (error) {
      console.log(`❌ [DatabaseManager] Fallo descarga principal: ${error.message}`);
      console.log(`🌐 [DatabaseManager] Intentando descarga desde servidor alternativo...`);
      
      // Limpiar archivo parcial si existe
      if (fs.existsSync(INSTALLER_PATH)) {
        fs.unlinkSync(INSTALLER_PATH);
      }
      
      // Intentar con URL de fallback
      await downloadFile(MARIADB_DOWNLOAD_URLS.fallback, INSTALLER_PATH, progressCallback);
      return INSTALLER_PATH;
    }
    
  } catch (error) {
    console.error(`❌ [DatabaseManager] Error descargando instalador:`, error);
    
    // Limpiar archivo parcial si existe
    if (fs.existsSync(INSTALLER_PATH)) {
      fs.unlinkSync(INSTALLER_PATH);
    }
    
    throw new Error(`No se pudo descargar el instalador de MariaDB: ${error.message}`);
  }
}

/**
 * Extraer archivo ZIP usando PowerShell
 */
async function extractZip(zipPath, destinationPath) {
  console.log(`📦 [DatabaseManager] Extrayendo ZIP: ${zipPath} -> ${destinationPath}`);
  
  // Crear directorio de destino si no existe
  if (!fs.existsSync(destinationPath)) {
    fs.mkdirSync(destinationPath, { recursive: true });
  }
  
  // Usar PowerShell para extraer (más rápido y confiable que bibliotecas de Node)
  const extractCmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destinationPath}' -Force"`;
  
  try {
    await execAsync(extractCmd);
    console.log(`✅ [DatabaseManager] Extracción completada`);
    return true;
  } catch (error) {
    console.error(`❌ [DatabaseManager] Error al extraer ZIP:`, error);
    throw new Error(`No se pudo extraer MariaDB: ${error.message}`);
  }
}

/**
 * Clase principal para manejar la base de datos MariaDB
 */
class DatabaseManager {
  constructor() {
    this.serviceName = 'MariaDB';
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
   * Obtiene la ruta de recursos según el entorno
   */
  getResourcesPath() {
    // En desarrollo
    if (process.env.NODE_ENV === 'development') {
      return path.join(process.cwd(), 'resources');
    }
    // En producción
    return path.join(process.resourcesPath, 'resources');
  }

  /**
   * Obtiene la ruta de instalación de MariaDB
   */
  getMariaDBPath() {
    const appDataPath = path.join(os.homedir(), 'AppData', 'Local', 'KokoBrowser');
    return path.join(appDataPath, 'mariadb');
  }

  /**
   * Diagnostica problemas comunes antes de la instalación
   */
  async runDiagnostics() {
    console.log('🔍 [DatabaseManager] Ejecutando diagnósticos...');
    const issues = [];

    try {
      // 1. Verificar permisos de administrador
      try {
        await execAsync('net session', { timeout: 5000 });
        console.log('✅ [Diagnóstico] Permisos de administrador: OK');
      } catch (error) {
        issues.push({
          type: 'admin',
          message: 'Se requieren permisos de administrador',
          solution: 'Ejecutar Koko Browser como administrador'
        });
      }

      // 2. Verificar puerto 3306 y si MariaDB está funcionando
      try {
        const { stdout } = await execAsync('netstat -ano | findstr :3306', { timeout: 5000 });
        if (stdout.trim()) {
          // Puerto en uso, verificar si es MariaDB
          const mariadbStatus = await this.getMariaDBStatus();
          if (mariadbStatus.success && mariadbStatus.installed && mariadbStatus.status === 'running') {
            console.log('✅ [Diagnóstico] Puerto 3306: Usado por MariaDB (OK)');
          } else {
            // Puerto usado por otro servicio
            issues.push({
              type: 'port',
              message: 'Puerto 3306 está en uso por otro servicio',
              solution: 'Detener otros servicios MySQL/MariaDB'
            });
          }
        } else {
          console.log('✅ [Diagnóstico] Puerto 3306: Disponible');
        }
      } catch (error) {
        console.log('✅ [Diagnóstico] Puerto 3306: Disponible');
      }

      return { success: issues.length === 0, issues };
    } catch (error) {
      console.error('❌ [Diagnóstico] Error general:', error);
      return { 
        success: false, 
        issues: [{ 
          type: 'general', 
          message: 'Error en diagnósticos', 
          solution: 'Reintentar como administrador' 
        }] 
      };
    }
  }

  /**
   * Instala MariaDB portable (versión ZIP)
   */
  async install() {
    if (this.isInstalling) {
      return { success: false, message: 'Instalación ya en progreso' };
    }

    this.isInstalling = true;
    
    try {
      console.log('🔧 [DatabaseManager] Iniciando instalación de MariaDB portable...');
      
      // Ejecutar diagnósticos primero
      const diagnostics = await this.runDiagnostics();
      if (!diagnostics.success) {
        const criticalIssues = diagnostics.issues.filter(issue => 
          issue.type === 'admin'
        );
        
        if (criticalIssues.length > 0) {
          throw new Error(`Problemas críticos: ${criticalIssues.map(i => i.message).join(', ')}`);
        }
      }
      
      // Verificar si ya está instalado
      const isInstalled = await this.isMariaDBInstalled();
      if (isInstalled) {
        console.log('✅ [DatabaseManager] MariaDB ya está instalado');
        return { success: true, message: 'MariaDB ya está instalado' };
      }

      // Descargar ZIP portable
      console.log('📦 [DatabaseManager] Descargando MariaDB portable...');
      const zipPath = await ensureMariaDBInstaller(this.progressCallback);
      
      if (this.progressCallback) {
        this.progressCallback({ progress: 50, phase: 'Extrayendo archivos...' });
      }
      
      // Extraer ZIP a resources/mariadb/server
      console.log(`� [DatabaseManager] Extrayendo a: ${INSTALL_DIR}`);
      await extractZip(zipPath, INSTALL_DIR);
      
      if (this.progressCallback) {
        this.progressCallback({ progress: 70, phase: 'Configurando MariaDB...' });
      }
      
      // Buscar la carpeta extraída (usualmente mariadb-10.x.x-winx64)
      const extractedFolders = fs.readdirSync(INSTALL_DIR).filter(item => {
        const fullPath = path.join(INSTALL_DIR, item);
        return fs.statSync(fullPath).isDirectory() && item.startsWith('mariadb');
      });
      
      if (extractedFolders.length === 0) {
        throw new Error('No se encontró la carpeta de MariaDB extraída');
      }
      
      const mariadbFolder = path.join(INSTALL_DIR, extractedFolders[0]);
      console.log(`✅ [DatabaseManager] MariaDB extraído en: ${mariadbFolder}`);
      
      // Mover contenido de la subcarpeta al directorio principal
      console.log(`🔄 [DatabaseManager] Moviendo archivos al directorio principal...`);
      const files = fs.readdirSync(mariadbFolder);
      let movedCount = 0;
      let errorCount = 0;
      
      for (const file of files) {
        const srcPath = path.join(mariadbFolder, file);
        const destPath = path.join(INSTALL_DIR, file);
        
        try {
          // Si el destino ya existe, eliminarlo primero
          if (fs.existsSync(destPath)) {
            console.log(`🗑️ [DatabaseManager] Eliminando ${file} existente...`);
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
          console.log(`✅ [DatabaseManager] Movido: ${file}`);
        } catch (error) {
          errorCount++;
          console.error(`❌ [DatabaseManager] Error moviendo ${file}:`, error.message);
        }
      }
      
      console.log(`📊 [DatabaseManager] Resumen: ${movedCount} archivos movidos, ${errorCount} errores`);
      
      // Eliminar carpeta original (intentar, no es crítico si falla)
      try {
        fs.rmSync(mariadbFolder, { recursive: true, force: true });
        console.log(`✅ [DatabaseManager] Carpeta temporal eliminada`);
      } catch (rmError) {
        console.warn(`⚠️ [DatabaseManager] No se pudo eliminar carpeta temporal (no crítico):`, rmError.message);
      }
      
      if (this.progressCallback) {
        this.progressCallback({ progress: 80, phase: 'Instalando servicio...' });
      }
      
      // Instalar como servicio de Windows
      const mysqldPath = path.join(INSTALL_DIR, 'bin', 'mysqld.exe');
      const dataDir = path.join(INSTALL_DIR, 'data');
      
      // Verificar que mysqld.exe existe
      if (!fs.existsSync(mysqldPath)) {
        throw new Error(`No se encontró mysqld.exe en: ${mysqldPath}`);
      }
      console.log(`✅ [DatabaseManager] mysqld.exe encontrado: ${mysqldPath}`);
      
      // Crear directorio data si no existe
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`📁 [DatabaseManager] Directorio data creado: ${dataDir}`);
      }
      
      // Verificar si la base de datos ya está inicializada
      const mysqlDir = path.join(dataDir, 'mysql');
      const isInitialized = fs.existsSync(mysqlDir) && fs.readdirSync(mysqlDir).length > 0;
      
      if (!isInitialized) {
        // Inicializar base de datos usando mysql_install_db.exe (herramienta correcta para Windows)
        console.log('🔧 [DatabaseManager] Inicializando base de datos con mysql_install_db...');
        const mysqlInstallDb = path.join(INSTALL_DIR, 'bin', 'mysql_install_db.exe');
        
        if (!fs.existsSync(mysqlInstallDb)) {
          throw new Error(`No se encontró mysql_install_db.exe en: ${mysqlInstallDb}`);
        }
        
        try {
          const initCmd = `"${mysqlInstallDb}" --datadir="${dataDir}" --password=""`;
          console.log(`📋 [DatabaseManager] Comando: ${initCmd}`);
          const initResult = await execAsync(initCmd);
          console.log(`✅ [DatabaseManager] Base de datos inicializada:`, initResult.stdout || initResult.stderr || 'OK');
        } catch (initError) {
          console.error(`❌ [DatabaseManager] Error al inicializar:`, initError.message);
          throw new Error(`No se pudo inicializar la base de datos: ${initError.message}`);
        }
      } else {
        console.log(`✅ [DatabaseManager] Base de datos ya inicializada (directorio mysql/ existe y contiene archivos)`);
      }
      
      // Instalar servicio
      console.log('🔧 [DatabaseManager] Instalando servicio MariaDB...');
      try {
        const installCmd = `"${mysqldPath}" --install MariaDB`;
        console.log(`📋 [DatabaseManager] Comando: ${installCmd}`);
        const installResult = await execAsync(installCmd);
        console.log(`✅ [DatabaseManager] Servicio instalado:`, installResult.stdout || 'OK');
      } catch (serviceError) {
        console.error(`❌ [DatabaseManager] Error al instalar servicio:`, serviceError.message);
        // Verificar si el servicio ya existe
        try {
          await execAsync('sc query MariaDB');
          console.log(`⚠️ [DatabaseManager] El servicio MariaDB ya existe`);
        } catch {
          throw new Error(`No se pudo instalar el servicio: ${serviceError.message}`);
        }
      }
      
      if (this.progressCallback) {
        this.progressCallback({ progress: 100, phase: 'Instalación completada' });
      }
      
      console.log('✅ [DatabaseManager] MariaDB portable instalado correctamente');
      return { 
        success: true, 
        message: 'MariaDB instalado correctamente' 
      };
      
    } catch (error) {
      console.error('❌ [DatabaseManager] Error en instalación:', error);
      return { 
        success: false, 
        message: error.message || 'Error desconocido durante la instalación'
      };
    } finally {
      this.isInstalling = false;
    }
  }

  /**
   * Desinstala MariaDB del sistema
   */
  /**
   * Desinstala MariaDB portable (elimina servicio y archivos)
   */
  async uninstall() {
    try {
      console.log('🗑️ [DatabaseManager] Iniciando desinstalación de MariaDB portable...');
      
      // Verificar si está instalado
      const isInstalled = await this.isMariaDBInstalled();
      if (!isInstalled) {
        console.log('⚠️ [DatabaseManager] MariaDB no está instalado');
        return { success: false, message: 'MariaDB no está instalado' };
      }

      // Paso 1: Detener el servicio si está ejecutándose
      const status = await this.getMariaDBStatus();
      if (status.isRunning) {
        console.log('⏹️ [DatabaseManager] Deteniendo servicio MariaDB...');
        try {
          await execAsync('net stop MariaDB');
          console.log('✅ [DatabaseManager] Servicio detenido');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.warn('⚠️ [DatabaseManager] Error al detener servicio:', error.message);
        }
      }

      // Paso 2: Eliminar el servicio de Windows
      console.log('�️ [DatabaseManager] Eliminando servicio de Windows...');
      try {
        // Primero intentar desinstalar con mysqld
        const mysqldPath = path.join(INSTALL_DIR, 'bin', 'mysqld.exe');
        if (fs.existsSync(mysqldPath)) {
          await execAsync(`"${mysqldPath}" --remove MariaDB`);
          console.log('✅ [DatabaseManager] Servicio desinstalado con mysqld');
        }
      } catch (error) {
        console.warn('⚠️ [DatabaseManager] mysqld --remove falló, intentando sc delete...', error.message);
        try {
          await execAsync('sc delete MariaDB');
          console.log('✅ [DatabaseManager] Servicio eliminado con sc delete');
        } catch (scError) {
          console.warn('⚠️ [DatabaseManager] sc delete falló:', scError.message);
        }
      }
      
      // Esperar a que el servicio se elimine completamente
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Paso 3: Eliminar archivos de instalación
      const installDir = INSTALL_DIR;
      if (fs.existsSync(installDir)) {
        console.log(`🗑️ [DatabaseManager] Eliminando archivos de instalación: ${installDir}`);
        try {
          fs.rmSync(installDir, { recursive: true, force: true });
          console.log('✅ [DatabaseManager] Archivos eliminados');
        } catch (fsError) {
          console.error(`❌ [DatabaseManager] Error al eliminar archivos:`, fsError.message);
          throw new Error(`No se pudieron eliminar los archivos: ${fsError.message}`);
        }
      }
      
      // Paso 4: Eliminar el archivo ZIP descargado
      const zipPath = INSTALLER_PATH;
      if (fs.existsSync(zipPath)) {
        console.log(`🗑️ [DatabaseManager] Eliminando instalador: ${zipPath}`);
        try {
          fs.unlinkSync(zipPath);
          console.log('✅ [DatabaseManager] Instalador eliminado');
        } catch (error) {
          console.warn('⚠️ [DatabaseManager] No se pudo eliminar instalador:', error.message);
        }
      }
      
      // Verificar que se desinstaló
      const stillInstalled = await this.isMariaDBInstalled();
      if (stillInstalled) {
        throw new Error('La desinstalación parece haber fallado');
      }
      
      console.log('✅ [DatabaseManager] MariaDB desinstalado correctamente');
      return { 
        success: true, 
        message: 'MariaDB desinstalado correctamente' 
      };
      
    } catch (error) {
      console.error('❌ [DatabaseManager] Error en desinstalación:', error);
      return { 
        success: false, 
        message: error.message || 'Error desconocido durante la desinstalación'
      };
    }
  }

  /**
   * Verifica si MariaDB está instalado como servicio
   */
  async isMariaDBInstalled() {
    try {
      // Verificar si existe el directorio de instalación local
      const installDir = path.join(RESOURCES_PATH, 'server');
      const mariadbBin = path.join(installDir, 'bin', 'mysqld.exe');
      
      // Verificar si existe el ejecutable en resources
      const hasExecutable = fs.existsSync(mariadbBin);
      
      if (!hasExecutable) {
        console.log(`⚠️ [DatabaseManager] mysqld.exe no encontrado en: ${mariadbBin}`);
        return false;
      }
      
      // Verificar si el servicio está instalado
      try {
        const { stdout } = await execAsync('sc query MariaDB');
        const isServiceInstalled = stdout.includes('MariaDB');
        
        if (isServiceInstalled) {
          console.log(`✅ [DatabaseManager] MariaDB completamente instalado (ejecutable + servicio)`);
          return true;
        } else {
          console.log(`⚠️ [DatabaseManager] Ejecutable existe pero servicio no está instalado`);
          return false;
        }
      } catch (serviceError) {
        console.log(`⚠️ [DatabaseManager] Ejecutable existe pero servicio no está instalado`);
        return false;
      }
    } catch (error) {
      console.error(`❌ [DatabaseManager] Error verificando instalación:`, error.message);
      return false;
    }
  }

  /**
   * Inicia el servicio de MariaDB
   */
  async startMariaDB() {
    try {
      console.log('🚀 [DatabaseManager] Iniciando servicio MariaDB...');
      
      const status = await this.getMariaDBStatus();
      if (status.isRunning) {
        console.log('✅ [DatabaseManager] MariaDB ya está ejecutándose');
        return { success: true, message: 'MariaDB ya está ejecutándose' };
      }

      try {
        await execAsync('net start MariaDB');
      } catch (cmdError) {
        // Si el error es que ya está iniciado, tratarlo como éxito
        if (cmdError.message.includes('ya ha sido iniciado') || 
            cmdError.message.includes('already been started')) {
          console.log('✅ [DatabaseManager] MariaDB ya estaba iniciado (detectado por comando)');
          return { success: true, message: 'MariaDB ya estaba iniciado' };
        }
        // Si es otro error, re-lanzarlo
        throw cmdError;
      }
      
      // Verificar que se inició correctamente
      await new Promise(resolve => setTimeout(resolve, 2000));
      const newStatus = await this.getMariaDBStatus();
      
      if (newStatus.isRunning) {
        console.log('✅ [DatabaseManager] MariaDB iniciado exitosamente');
        return { success: true, message: 'MariaDB iniciado exitosamente' };
      } else {
        throw new Error('El servicio no se pudo iniciar');
      }

    } catch (error) {
      console.error('❌ [DatabaseManager] Error iniciando MariaDB:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Detiene el servicio de MariaDB
   */
  async stopMariaDB() {
    try {
      console.log('🛑 [DatabaseManager] Deteniendo servicio MariaDB...');
      
      const status = await this.getMariaDBStatus();
      if (!status.isRunning) {
        return { success: true, message: 'MariaDB ya está detenido' };
      }

      await execAsync('net stop MariaDB');
      
      console.log('✅ [DatabaseManager] MariaDB detenido exitosamente');
      return { success: true, message: 'MariaDB detenido exitosamente' };

    } catch (error) {
      console.error('❌ [DatabaseManager] Error deteniendo MariaDB:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene el estado actual del servicio MariaDB
   */
  async getMariaDBStatus() {
    console.log('🔍 [DatabaseManager] === INICIANDO DETECCIÓN DE MARIADB ===');
    
    try {
      // Paso 1: Verificar si el servicio existe
      console.log('📋 [DatabaseManager] Paso 1: Verificando servicio MariaDB...');
      const { stdout: serviceCheck } = await execAsync('powershell "Get-Service MariaDB | Select-Object Name,Status"');
      
      console.log('� [DatabaseManager] Respuesta del servicio:', serviceCheck);
      
      let isInstalled = false;
      let isRunning = false;
      let version = 'Desconocida';
      
      // Verificar respuesta simple de PowerShell
      if (serviceCheck && serviceCheck.includes('MariaDB')) {
        isInstalled = true;
        isRunning = serviceCheck.includes('Running');
        console.log('✅ [DatabaseManager] Servicio MariaDB encontrado - Running:', isRunning);
      }
      
      // Paso 2: Intentar obtener la versión si está instalado
      if (isInstalled) {
        try {
          console.log('📋 [DatabaseManager] Paso 2: Obteniendo versión de MariaDB...');
          const { stdout: versionCheck } = await execAsync('mysql --version 2>NUL || mariadb --version 2>NUL || echo "version not found"');
          console.log('📄 [DatabaseManager] Respuesta de versión:', versionCheck);
          
          if (versionCheck && !versionCheck.includes('version not found')) {
            // Extraer número de versión
            const versionMatch = versionCheck.match(/(\d+\.\d+\.\d+)/);
            if (versionMatch) {
              version = versionMatch[1];
            }
          }
        } catch (versionError) {
          console.log('⚠️ [DatabaseManager] Error obteniendo versión:', versionError.message);
        }
      }
      
      const result = {
        isInstalled,
        isRunning,
        isPaused: false,
        isStopped: !isRunning,
        state: isRunning ? 'running' : (isInstalled ? 'stopped' : 'not-installed'),
        serviceName: 'MariaDB',
        version: version
      };
      
      console.log('🎯 [DatabaseManager] === RESULTADO FINAL ===', result);
      return result;
      
    } catch (error) {
      console.log('❌ [DatabaseManager] Error general:', error.message);
      return {
        isInstalled: false,
        isRunning: false,
        isPaused: false,
        isStopped: true,
        state: 'not-installed',
        serviceName: 'MariaDB',
        version: 'No detectada'
      };
    }
  }

  /**
   * Reinicia el servicio de MariaDB
   */
  async restartMariaDB() {
    try {
      console.log('🔄 [DatabaseManager] Reiniciando servicio MariaDB...');
      
      await this.stopMariaDB();
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await this.startMariaDB();

    } catch (error) {
      console.error('❌ [DatabaseManager] Error reiniciando MariaDB:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Ejecuta un instalador con argumentos específicos
   */
  async executeInstaller(command, args) {
    return new Promise((resolve, reject) => {
      // Escapar argumentos con espacios
      const escapedArgs = args.map(arg => {
        if (arg.includes(' ') && !arg.startsWith('"')) {
          return `"${arg}"`;
        }
        return arg;
      });
      
      console.log(`🚀 [DatabaseManager] Ejecutando: ${command} ${escapedArgs.join(' ')}`);
      
      const child = spawn(command, escapedArgs, {
        stdio: 'pipe',
        shell: true
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
        console.log(`📋 [Installer] ${data.toString().trim()}`);
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.log(`⚠️ [Installer] ${data.toString().trim()}`);
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          reject(new Error(`Instalación falló con código: ${code}. ${errorOutput}`));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Verifica si el servicio MariaDB existe
   */
  async checkServiceExists() {
    try {
      await execAsync('sc query MariaDB');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene información completa de la base de datos
   */
  async getInfo() {
    try {
      const status = await this.getMariaDBStatus();
      
      return {
        success: true,
        status: status.state,
        installed: status.isInstalled,
        version: 'MariaDB 10.11',
        port: 3306,
        host: 'localhost',
        database: 'KokoDB',
        message: `Servicio ${status.state}`
      };
      
    } catch (error) {
      return {
        success: false,
        status: 'error',
        installed: false,
        version: 'N/A',
        port: 3306,
        host: 'localhost',
        database: 'KokoDB',
        error: error.message
      };
    }
  }
}

export { DatabaseManager };
export default DatabaseManager;