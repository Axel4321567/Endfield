const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class UpdateApplier {
  constructor() {
    this.installationPath = null;
    this.backupPath = null;
  }

  /**
   * Aplica una actualización descargada
   */
  async applyUpdate(updateFilePath, targetPath = null) {
    try {
      // Determinar ruta de instalación
      this.installationPath = targetPath || await this.getBrowserInstallPath();
      
      if (!this.installationPath) {
        throw new Error('No se pudo determinar la ruta de instalación de Koko Browser');
      }

      // Crear backup de la versión actual
      await this.createBackup();

      // Verificar si el navegador está ejecutándose
      const isRunning = await this.isBrowserRunning();
      if (isRunning) {
        await this.closeBrowser();
        
        // Esperar a que se cierre completamente
        await this.waitForBrowserClose();
      }

      // Ejecutar instalador
      await this.runInstaller(updateFilePath);

      // Verificar instalación
      await this.verifyInstallation();

      // Limpiar archivos temporales
      await this.cleanup(updateFilePath);

      return true;
    } catch (error) {
      // Intentar restaurar backup en caso de error
      await this.restoreBackup();
      throw new Error(`Error aplicando actualización: ${error.message}`);
    }
  }

  /**
   * Obtiene la ruta de instalación de Koko Browser
   */
  async getBrowserInstallPath() {
    const possiblePaths = [
      path.join(process.cwd(), '../Koko'),
      path.join(process.cwd(), '../KokoBrowser'),
      'C:/Program Files/Koko Browser',
      'C:/Program Files (x86)/Koko Browser',
      path.join(require('os').homedir(), 'AppData/Local/Programs/Koko Browser')
    ];

    for (const browserPath of possiblePaths) {
      try {
        const executablePath = path.join(browserPath, 'KokoBrowser.exe');
        await fs.access(executablePath);
        return browserPath;
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Crea un backup de la instalación actual
   */
  async createBackup() {
    if (!this.installationPath) return;

    try {
      this.backupPath = `${this.installationPath}_backup_${Date.now()}`;
      
      // Copiar archivos principales
      const executablePath = path.join(this.installationPath, 'KokoBrowser.exe');
      const backupExecutablePath = path.join(this.backupPath, 'KokoBrowser.exe');
      
      await fs.mkdir(this.backupPath, { recursive: true });
      await fs.copyFile(executablePath, backupExecutablePath);
      
      console.log(`Backup creado en: ${this.backupPath}`);
    } catch (error) {
      console.warn(`No se pudo crear backup: ${error.message}`);
    }
  }

  /**
   * Restaura el backup en caso de error
   */
  async restoreBackup() {
    if (!this.backupPath || !this.installationPath) return;

    try {
      const backupExecutablePath = path.join(this.backupPath, 'KokoBrowser.exe');
      const executablePath = path.join(this.installationPath, 'KokoBrowser.exe');
      
      await fs.copyFile(backupExecutablePath, executablePath);
      console.log('Backup restaurado exitosamente');
    } catch (error) {
      console.error(`Error restaurando backup: ${error.message}`);
    }
  }

  /**
   * Verifica si Koko Browser está ejecutándose
   */
  async isBrowserRunning() {
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        exec('tasklist /FI "IMAGENAME eq KokoBrowser.exe"', (error, stdout) => {
          resolve(!error && stdout.includes('KokoBrowser.exe'));
        });
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Cierra Koko Browser
   */
  async closeBrowser() {
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        exec('taskkill /IM KokoBrowser.exe /T', (error) => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Espera a que Koko Browser se cierre completamente
   */
  async waitForBrowserClose(maxWait = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const isRunning = await this.isBrowserRunning();
      if (!isRunning) {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Timeout esperando que Koko Browser se cierre');
  }

  /**
   * Ejecuta el instalador de la actualización
   */
  async runInstaller(installerPath) {
    return new Promise((resolve, reject) => {
      // Argumentos para instalación silenciosa
      const args = ['/S', '/D=' + this.installationPath];
      
      const installerProcess = spawn(installerPath, args, {
        detached: true,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      installerProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      installerProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      installerProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Instalador ejecutado exitosamente');
          resolve();
        } else {
          reject(new Error(`Instalador falló con código ${code}: ${errorOutput}`));
        }
      });

      installerProcess.on('error', (error) => {
        reject(new Error(`Error ejecutando instalador: ${error.message}`));
      });

      // Timeout de 5 minutos para la instalación
      setTimeout(() => {
        installerProcess.kill('SIGTERM');
        reject(new Error('Timeout de instalación'));
      }, 300000);
    });
  }

  /**
   * Verifica que la instalación fue exitosa
   */
  async verifyInstallation() {
    try {
      const executablePath = path.join(this.installationPath, 'KokoBrowser.exe');
      await fs.access(executablePath);
      
      // Verificar que el archivo sea ejecutable
      const stats = await fs.stat(executablePath);
      if (stats.size === 0) {
        throw new Error('El archivo ejecutable está corrupto');
      }
      
      console.log('Instalación verificada exitosamente');
    } catch (error) {
      throw new Error(`Verificación de instalación falló: ${error.message}`);
    }
  }

  /**
   * Limpia archivos temporales y backup
   */
  async cleanup(installerPath) {
    try {
      // Eliminar instalador temporal
      await fs.unlink(installerPath);
      
      // Eliminar backup después de un tiempo
      if (this.backupPath) {
        setTimeout(async () => {
          try {
            await fs.rmdir(this.backupPath, { recursive: true });
            console.log('Backup limpiado');
          } catch (error) {
            console.warn(`No se pudo limpiar backup: ${error.message}`);
          }
        }, 300000); // 5 minutos
      }
    } catch (error) {
      console.warn(`Error en cleanup: ${error.message}`);
    }
  }

  /**
   * Actualiza archivos de configuración adicionales
   */
  async updateConfigFiles(newVersion) {
    try {
      const configPath = path.join(__dirname, '../../resources/config/update.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      
      config.version = newVersion;
      config.lastUpdate = new Date().toISOString();
      
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      console.log('Archivos de configuración actualizados');
    } catch (error) {
      console.warn(`Error actualizando configuración: ${error.message}`);
    }
  }

  /**
   * Rollback a la versión anterior
   */
  async rollback() {
    try {
      await this.restoreBackup();
      console.log('Rollback completado');
    } catch (error) {
      throw new Error(`Error en rollback: ${error.message}`);
    }
  }
}

module.exports = UpdateApplier;