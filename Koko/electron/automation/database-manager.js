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

// URLs de descarga para MariaDB
const MARIADB_DOWNLOAD_URLS = {
  windows: 'https://archive.mariadb.org/mariadb-10.11.10/winx64-packages/mariadb-10.11.10-winx64.msi',
  fallback: 'https://downloads.mariadb.org/f/mariadb-10.6.19/winx64-packages/mariadb-10.6.19-winx64.msi'
};

const INSTALLER_FILENAME = 'mariadb-installer.msi';
const RESOURCES_PATH = path.join(__dirname, '..', '..', 'resources', 'mariadb');
const INSTALLER_PATH = path.join(RESOURCES_PATH, INSTALLER_FILENAME);

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
 * Clase principal para manejar la base de datos MariaDB
 */
class DatabaseManager {
  constructor() {
    this.serviceName = 'KokoDB';
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
   * Obtiene la ruta del ejecutable de HeidiSQL
   */
  getHeidiSQLPath() {
    return path.join(this.getResourcesPath(), 'heidisql', 'heidisql.exe');
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
   * Instala MariaDB usando el instalador descargado
   */
  async install() {
    if (this.isInstalling) {
      return { success: false, message: 'Instalación ya en progreso' };
    }

    this.isInstalling = true;
    
    try {
      console.log('🔧 [DatabaseManager] Iniciando instalación de MariaDB...');
      
      // Ejecutar diagnósticos primero
      const diagnostics = await this.runDiagnostics();
      if (!diagnostics.success) {
        // Solo admin es crítico, puerto puede estar en uso por MariaDB
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

      // Asegurar que tenemos el instalador (descarga automática si es necesario)
      console.log('📦 [DatabaseManager] Verificando instalador de MariaDB...');
      const installerPath = await ensureMariaDBInstaller(this.progressCallback);
      
      console.log(`🚀 [DatabaseManager] Ejecutando instalador: ${installerPath}`);
      
      // Configurar parámetros de instalación silenciosa
      const installArgs = [
        '/i',
        `"${installerPath}"`,
        '/quiet',
        '/norestart',
        'SERVICENAME=MariaDB',
        'PORT=3306',
        'PASSWORD=koko123',
        'UTF8=1'
      ];
      
      const result = await this.executeInstaller('msiexec', installArgs);
      
      if (result.success) {
        console.log('✅ [DatabaseManager] MariaDB instalado correctamente');
        
        // Verificar que el servicio esté disponible
        const serviceCheck = await this.checkServiceExists();
        if (serviceCheck) {
          return { 
            success: true, 
            message: 'MariaDB instalado y configurado correctamente' 
          };
        } else {
          return { 
            success: false, 
            message: 'Instalación completada pero el servicio no está disponible' 
          };
        }
      } else {
        throw new Error(result.error || 'Error en la instalación');
      }
      
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
   * Verifica si MariaDB está instalado como servicio
   */
  async isMariaDBInstalled() {
    try {
      const { stdout } = await execAsync('sc query MariaDB');
      return stdout.includes('MariaDB');
    } catch (error) {
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
   * Abre HeidiSQL con la configuración preconfigurada
   */
  async openHeidiSQL() {
    try {
      console.log('🖥️ [DatabaseManager] Abriendo HeidiSQL...');
      
      const heidiPath = this.getHeidiSQLPath();

      if (!fs.existsSync(heidiPath)) {
        throw new Error('HeidiSQL no encontrado');
      }

      // Abrir HeidiSQL
      const heidiProcess = spawn(heidiPath, [], {
        detached: true,
        stdio: 'ignore'
      });

      heidiProcess.unref();

      console.log('✅ [DatabaseManager] HeidiSQL abierto exitosamente');
      return { success: true, message: 'HeidiSQL abierto exitosamente' };

    } catch (error) {
      console.error('❌ [DatabaseManager] Error abriendo HeidiSQL:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Ejecuta un instalador con argumentos específicos
   */
  async executeInstaller(command, args) {
    return new Promise((resolve, reject) => {
      console.log(`� [DatabaseManager] Ejecutando: ${command} ${args.join(' ')}`);
      
      const child = spawn(command, args, {
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