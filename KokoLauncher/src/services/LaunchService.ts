export interface LaunchOptions {
  workingDirectory?: string;
  args?: string[];
  environment?: Record<string, string>;
}

export interface ProcessInfo {
  pid: number;
  isRunning: boolean;
  startTime: Date;
}

export class LaunchService {
  private static currentBrowserProcess: ProcessInfo | null = null;

  /**
   * Lanza Koko Browser con las opciones especificadas
   * Si no está instalado, lo descarga automáticamente
   */
  static async launchBrowser(options: LaunchOptions = {}): Promise<ProcessInfo> {
    try {
      // Verificar si ya hay una instancia ejecutándose
      if (this.currentBrowserProcess?.isRunning) {
        const isStillRunning = await window.electronAPI?.isProcessRunning(this.currentBrowserProcess.pid);
        if (isStillRunning) {
          throw new Error('Koko Browser ya está en ejecución');
        } else {
          this.currentBrowserProcess = null;
        }
      }

      // Obtener la ruta de instalación de Koko Browser
      let browserPath = await this.getBrowserExecutablePath();
      
      // Si no existe, intentar descargarlo
      if (!browserPath) {
        throw new Error('Koko Browser no está instalado. Usa el botón "Actualizar" para descargarlo.');
      }

      // Lanzar el proceso
      const processInfo = await window.electronAPI?.launchProcess(browserPath, {
        args: options.args || [],
        cwd: options.workingDirectory,
        env: options.environment
      });

      if (!processInfo) {
        throw new Error('Error iniciando Koko Browser');
      }

      this.currentBrowserProcess = {
        pid: processInfo.pid,
        isRunning: true,
        startTime: new Date()
      };

      return this.currentBrowserProcess;
    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Cierra la instancia actual de Koko Browser
   */
  static async closeBrowser(force: boolean = false): Promise<void> {
    if (!this.currentBrowserProcess) {
      return;
    }

    try {
      const success = await window.electronAPI?.terminateProcess(
        this.currentBrowserProcess.pid, 
        force
      );

      if (success) {
        this.currentBrowserProcess = null;
      } else {
        throw new Error('No se pudo cerrar Koko Browser');
      }
    } catch (error) {
      throw new Error(`Error cerrando Koko Browser: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Verifica si Koko Browser está ejecutándose
   */
  static async isBrowserRunning(): Promise<boolean> {
    if (!this.currentBrowserProcess) {
      return false;
    }

    try {
      const isRunning = await window.electronAPI?.isProcessRunning(this.currentBrowserProcess.pid);
      
      if (!isRunning) {
        this.currentBrowserProcess = null;
      }
      
      return isRunning || false;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene información del proceso actual de Koko Browser
   */
  static getCurrentBrowserProcess(): ProcessInfo | null {
    return this.currentBrowserProcess;
  }

  /**
   * Reinicia Koko Browser
   */
  static async restartBrowser(options: LaunchOptions = {}): Promise<ProcessInfo> {
    try {
      // Cerrar la instancia actual si existe
      if (await this.isBrowserRunning()) {
        await this.closeBrowser();
        
        // Esperar un poco antes de relanzar
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Lanzar nueva instancia
      return await this.launchBrowser(options);
    } catch (error) {
      throw new Error(`Error reiniciando Koko Browser: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene la ruta del ejecutable de Koko Browser
   */
  private static async getBrowserExecutablePath(): Promise<string | null> {
    try {
      // Intentar obtener la ruta desde configuración
      const config = await window.electronAPI?.getConfig();
      if (config?.browserPath) {
        const exists = await window.electronAPI?.fileExists(config.browserPath);
        if (exists) {
          return config.browserPath;
        }
      }

      // Rutas por defecto donde buscar Koko Browser (más completas)
      const systemInfo = await window.electronAPI?.getSystemInfo();
      const username = systemInfo?.username || 'User';
      
      const defaultPaths = [
        // Ruta real donde se instaló Koko Browser (prioritaria)
        `C:/Users/${username}/AppData/Local/Programs/Koko Browser/Koko Browser.exe`,
        // Rutas alternativas comunes
        `C:/Users/${username}/AppData/Local/Programs/Koko Browser/KokoBrowser.exe`,
        `C:/Users/${username}/AppData/Roaming/Koko Browser/Koko Browser.exe`,
        `C:/Users/${username}/AppData/Local/Koko Browser/Koko Browser.exe`,
        // Rutas de Program Files
        'C:/Program Files/Koko Browser/Koko Browser.exe',
        'C:/Program Files (x86)/Koko Browser/Koko Browser.exe',
        'C:/Program Files/Koko Browser/KokoBrowser.exe',
        'C:/Program Files (x86)/Koko Browser/KokoBrowser.exe',
        // Rutas alternativas
        'C:/Program Files/KokoBrowser/KokoBrowser.exe',
        'C:/Program Files (x86)/KokoBrowser/KokoBrowser.exe',
        // Rutas relativas al launcher
        '../Koko/dist-electron/win-unpacked/KokoBrowser.exe',
        './KokoBrowser/KokoBrowser.exe',
        './Koko Browser/KokoBrowser.exe'
      ];

      // Verificar cada ruta
      for (const path of defaultPaths) {
        try {
          const exists = await window.electronAPI?.fileExists(path);
          if (exists) {
            // Guardar la ruta encontrada en configuración para futuros usos
            await window.electronAPI?.setConfig({ browserPath: path });
            return path;
          }
        } catch (error) {
          console.log(`Error verificando ruta ${path}:`, error);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo ruta de Koko Browser:', error);
      return null;
    }
  }

  /**
   * Obtiene la versión real instalada de Koko Browser
   */
  static async getInstalledVersion(): Promise<string | null> {
    try {
      const browserPath = await this.getBrowserExecutablePath();
      if (!browserPath) {
        return null;
      }
      
      const version = await window.electronAPI?.getFileVersion(browserPath);
      if (version) {
        // Limpiar la versión (quitar espacios y caracteres extra)
        const cleanVersion = version.trim().replace(/[^0-9\.]/g, '');
        if (cleanVersion.match(/^\d+\.\d+(\.\d+)?(\.\d+)?$/)) {
          return cleanVersion;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo versión instalada:', error);
      return null;
    }
  }

  /**
   * Verifica si Koko Browser está instalado en el sistema
   */
  static async isBrowserInstalled(): Promise<boolean> {
    try {
      const browserPath = await this.getBrowserExecutablePath();
      return browserPath !== null;
    } catch (error) {
      console.error('Error verificando instalación de Koko Browser:', error);
      return false;
    }
  }

  /**
   * Establece una ruta personalizada para Koko Browser
   */
  static async setBrowserPath(path: string): Promise<void> {
    try {
      const exists = await window.electronAPI?.fileExists(path);
      if (!exists) {
        throw new Error('El archivo especificado no existe');
      }

      await window.electronAPI?.setConfig({ browserPath: path });
    } catch (error) {
      throw new Error(`Error estableciendo ruta del navegador: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Lanza MariaDB como servicio local
   */
  static async launchMariaDB(): Promise<ProcessInfo> {
    try {
      const mariadbPath = await this.getMariaDBPath();
      if (!mariadbPath) {
        throw new Error('MariaDB no está instalado o no se pudo encontrar');
      }

      const processInfo = await window.electronAPI?.launchProcess(mariadbPath, {
        args: ['--console'],
        cwd: mariadbPath.replace(/[^/\\]*$/, '')
      });

      if (!processInfo) {
        throw new Error('Error iniciando MariaDB');
      }

      return {
        pid: processInfo.pid,
        isRunning: true,
        startTime: new Date()
      };
    } catch (error) {
      throw new Error(`Error lanzando MariaDB: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Lanza HeidiSQL
   */
  static async launchHeidiSQL(): Promise<ProcessInfo> {
    try {
      const heidisqlPath = await this.getHeidiSQLPath();
      if (!heidisqlPath) {
        throw new Error('HeidiSQL no está instalado o no se pudo encontrar');
      }

      const processInfo = await window.electronAPI?.launchProcess(heidisqlPath);

      if (!processInfo) {
        throw new Error('Error iniciando HeidiSQL');
      }

      return {
        pid: processInfo.pid,
        isRunning: true,
        startTime: new Date()
      };
    } catch (error) {
      throw new Error(`Error lanzando HeidiSQL: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene la ruta de MariaDB
   */
  private static async getMariaDBPath(): Promise<string | null> {
    const defaultPaths = [
      './MariaDB/bin/mysqld.exe',
      '../MariaDB/bin/mysqld.exe',
      'C:/Program Files/MariaDB/bin/mysqld.exe'
    ];

    for (const path of defaultPaths) {
      const exists = await window.electronAPI?.fileExists(path);
      if (exists) {
        return path;
      }
    }

    return null;
  }

  /**
   * Obtiene la ruta de HeidiSQL
   */
  private static async getHeidiSQLPath(): Promise<string | null> {
    const defaultPaths = [
      './HeidiSQL/heidisql.exe',
      '../HeidiSQL/heidisql.exe',
      'C:/Program Files/HeidiSQL/heidisql.exe'
    ];

    for (const path of defaultPaths) {
      const exists = await window.electronAPI?.fileExists(path);
      if (exists) {
        return path;
      }
    }

    return null;
  }
}