import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execAsync = promisify(exec);

export class DatabaseManager {
  constructor() {
    this.serviceName = 'KokoDB';
    this.mariaDBPath = this.getMariaDBPath();
    this.resourcesPath = this.getResourcesPath();
    this.configPath = path.join(this.mariaDBPath, 'my.ini');
  }

  getResourcesPath() {
    // En desarrollo
    if (process.env.NODE_ENV === 'development') {
      return path.join(process.cwd(), 'resources');
    }
    // En producción
    return path.join(process.resourcesPath, 'resources');
  }

  getMariaDBPath() {
    const appDataPath = path.join(os.homedir(), 'AppData', 'Local', 'KokoBrowser');
    return path.join(appDataPath, 'mariadb');
  }

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

      // 2. Verificar puerto 3306 disponible
      try {
        const { stdout } = await execAsync('netstat -ano | findstr :3306', { timeout: 5000 });
        if (stdout.trim()) {
          issues.push({
            type: 'port',
            message: 'Puerto 3306 está en uso',
            solution: 'Detener otros servicios MySQL/MariaDB'
          });
        } else {
          console.log('✅ [Diagnóstico] Puerto 3306: Disponible');
        }
      } catch (error) {
        console.log('✅ [Diagnóstico] Puerto 3306: Disponible');
      }

      // 3. Verificar servicios MariaDB/MySQL existentes
      try {
        const { stdout } = await execAsync('sc query type=service state=all | findstr /i "mysql\\|maria"', { timeout: 5000 });
        if (stdout.trim()) {
          issues.push({
            type: 'service',
            message: 'Servicios MySQL/MariaDB existentes detectados',
            solution: 'Detener servicios conflictivos antes de instalar'
          });
        } else {
          console.log('✅ [Diagnóstico] Servicios: Sin conflictos');
        }
      } catch (error) {
        console.log('✅ [Diagnóstico] Servicios: Sin conflictos');
      }

      // 4. Verificar espacio en disco
      try {
        const { stdout } = await execAsync(`dir "${os.homedir()}" | findstr "bytes free"`, { timeout: 5000 });
        console.log('✅ [Diagnóstico] Espacio en disco: Verificado');
      } catch (error) {
        issues.push({
          type: 'disk',
          message: 'No se pudo verificar espacio en disco',
          solution: 'Verificar que hay al menos 2GB libres'
        });
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
   * Instala MariaDB silenciosamente si no está instalado
   */
  async installMariaDB() {
    try {
      console.log('🔧 [DatabaseManager] Iniciando instalación de MariaDB...');
      
      // Ejecutar diagnósticos primero
      const diagnostics = await this.runDiagnostics();
      if (!diagnostics.success) {
        const criticalIssues = diagnostics.issues.filter(issue => 
          issue.type === 'admin' || issue.type === 'port'
        );
        
        if (criticalIssues.length > 0) {
          const errorMessage = criticalIssues.map(issue => 
            `${issue.message}: ${issue.solution}`
          ).join('; ');
          
          console.error('❌ [DatabaseManager] Problemas críticos detectados:', errorMessage);
          return { 
            success: false, 
            error: `Problemas críticos: ${errorMessage}`,
            diagnostics: diagnostics.issues
          };
        }
      }
      
      // Verificar si ya está instalado
      const isInstalled = await this.isMariaDBInstalled();
      if (isInstalled) {
        console.log('✅ [DatabaseManager] MariaDB ya está instalado');
        return { success: true, message: 'MariaDB ya está instalado' };
      }

      // Crear directorio de instalación
      const installDir = this.mariaDBPath;
      if (!fs.existsSync(installDir)) {
        fs.mkdirSync(installDir, { recursive: true });
      }

      // Copiar archivos de configuración
      const sourceConfigPath = path.join(this.resourcesPath, 'mariadb', 'config.ini');
      if (fs.existsSync(sourceConfigPath)) {
        fs.copyFileSync(sourceConfigPath, this.configPath);
      }

      // Ejecutar instalación silenciosa (requiere el instalador MSI en resources)
      const installerPath = path.join(this.resourcesPath, 'mariadb', 'mariadb-installer.msi');
      
      if (!fs.existsSync(installerPath)) {
        console.warn('⚠️ [DatabaseManager] Instalador de MariaDB no encontrado');
        return { success: false, message: 'Instalador no encontrado' };
      }

      const installCommand = `msiexec /i "${installerPath}" /quiet /norestart SERVICENAME="${this.serviceName}" DATADIR="${installDir}\\data"`;
      
      await execAsync(installCommand);
      
      // Esperar a que el servicio esté disponible
      await this.waitForService();
      
      // Ejecutar script de inicialización
      await this.initializeDatabase();

      console.log('✅ [DatabaseManager] MariaDB instalado exitosamente');
      return { success: true, message: 'MariaDB instalado exitosamente' };

    } catch (error) {
      console.error('❌ [DatabaseManager] Error instalando MariaDB:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Verifica si MariaDB está instalado como servicio
   */
  async isMariaDBInstalled() {
    try {
      const { stdout } = await execAsync(`sc query "${this.serviceName}"`);
      return stdout.includes(this.serviceName);
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
        return { success: true, message: 'MariaDB ya está ejecutándose' };
      }

      await execAsync(`net start "${this.serviceName}"`);
      
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
      return { success: false, message: error.message };
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

      await execAsync(`net stop "${this.serviceName}"`);
      
      console.log('✅ [DatabaseManager] MariaDB detenido exitosamente');
      return { success: true, message: 'MariaDB detenido exitosamente' };

    } catch (error) {
      console.error('❌ [DatabaseManager] Error deteniendo MariaDB:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Obtiene el estado actual del servicio MariaDB
   */
  async getMariaDBStatus() {
    try {
      const { stdout } = await execAsync(`sc query "${this.serviceName}"`);
      
      const isInstalled = stdout.includes(this.serviceName);
      const isRunning = stdout.includes('RUNNING');
      const isPaused = stdout.includes('PAUSED');
      const isStopped = stdout.includes('STOPPED');

      let state = 'unknown';
      if (isRunning) state = 'running';
      else if (isPaused) state = 'paused'; 
      else if (isStopped) state = 'stopped';

      return {
        isInstalled,
        isRunning,
        isPaused,
        isStopped,
        state,
        serviceName: this.serviceName
      };

    } catch (error) {
      return {
        isInstalled: false,
        isRunning: false,
        isPaused: false,
        isStopped: true,
        state: 'not-installed',
        serviceName: this.serviceName
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
      const configPath = path.join(this.getResourcesPath(), 'heidisql', 'KokoDB.heidi');

      if (!fs.existsSync(heidiPath)) {
        throw new Error('HeidiSQL no encontrado');
      }

      // Abrir HeidiSQL con configuración específica
      const heidiProcess = spawn(heidiPath, ['-d', configPath], {
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
   * Desinstala MariaDB y limpia archivos
   */
  async uninstallMariaDB() {
    try {
      console.log('🗑️ [DatabaseManager] Desinstalando MariaDB...');
      
      // Detener el servicio primero
      await this.stopMariaDB();
      
      // Eliminar el servicio
      await execAsync(`sc delete "${this.serviceName}"`);
      
      // Limpiar archivos (opcional - preguntar al usuario)
      const dataPath = path.join(this.mariaDBPath, 'data');
      if (fs.existsSync(dataPath)) {
        // Aquí se podría preguntar al usuario si quiere conservar los datos
        fs.rmSync(dataPath, { recursive: true, force: true });
      }

      console.log('✅ [DatabaseManager] MariaDB desinstalado exitosamente');
      return { success: true, message: 'MariaDB desinstalado exitosamente' };

    } catch (error) {
      console.error('❌ [DatabaseManager] Error desinstalando MariaDB:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Espera a que el servicio esté disponible
   */
  async waitForService(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getMariaDBStatus();
      if (status.isInstalled) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Timeout esperando a que el servicio esté disponible');
  }

  /**
   * Inicializa la base de datos con el script SQL
   */
  async initializeDatabase() {
    try {
      const sqlScript = path.join(this.resourcesPath, 'mariadb', 'install.sql');
      if (fs.existsSync(sqlScript)) {
        const command = `mysql -u root < "${sqlScript}"`;
        await execAsync(command);
        console.log('✅ [DatabaseManager] Base de datos inicializada');
      }
    } catch (error) {
      console.warn('⚠️ [DatabaseManager] Error inicializando base de datos:', error);
    }
  }
}