const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class AppLauncher {
  constructor() {
    this.browserProcess = null;
    this.mariaDBProcess = null;
    this.heidisqlProcess = null;
  }

  /**
   * Lanza Koko Browser
   */
  async launchBrowser(options = {}) {
    try {
      const browserPath = await this.findBrowserExecutable();
      
      if (!browserPath) {
        throw new Error('No se encontró Koko Browser. Asegúrate de que esté instalado correctamente.');
      }

      const args = options.args || [];
      const workingDir = options.workingDirectory || path.dirname(browserPath);

      this.browserProcess = spawn(browserPath, args, {
        cwd: workingDir,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, ...options.environment }
      });

      this.browserProcess.unref();

      return new Promise((resolve, reject) => {
        this.browserProcess.on('error', (error) => {
          reject(new Error(`Error iniciando Koko Browser: ${error.message}`));
        });

        this.browserProcess.on('spawn', () => {
          console.log(`Koko Browser iniciado (PID: ${this.browserProcess.pid})`);
          resolve({
            pid: this.browserProcess.pid,
            isRunning: true,
            startTime: new Date()
          });
        });
      });
    } catch (error) {
      throw new Error(`Error lanzando Koko Browser: ${error.message}`);
    }
  }

  /**
   * Busca el ejecutable de Koko Browser
   */
  async findBrowserExecutable() {
    const possiblePaths = [
      // Ruta relativa desde el launcher
      path.join(__dirname, '../../..', 'Koko', 'dist-electron', 'win-unpacked', 'KokoBrowser.exe'),
      path.join(__dirname, '../../..', 'KokoBrowser', 'KokoBrowser.exe'),
      
      // Rutas de instalación comunes
      'C:/Program Files/Koko Browser/KokoBrowser.exe',
      'C:/Program Files (x86)/Koko Browser/KokoBrowser.exe',
      
      // Ruta en AppData del usuario
      path.join(require('os').homedir(), 'AppData/Local/Programs/Koko Browser/KokoBrowser.exe'),
      
      // Rutas en el directorio actual
      './KokoBrowser/KokoBrowser.exe',
      '../KokoBrowser/KokoBrowser.exe',
      './Koko/dist-electron/win-unpacked/KokoBrowser.exe',
      '../Koko/dist-electron/win-unpacked/KokoBrowser.exe'
    ];

    for (const browserPath of possiblePaths) {
      try {
        await fs.access(browserPath);
        console.log(`Koko Browser encontrado en: ${browserPath}`);
        return browserPath;
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Lanza MariaDB como servicio local
   */
  async launchMariaDB(options = {}) {
    try {
      const mariadbPath = await this.findMariaDBExecutable();
      
      if (!mariadbPath) {
        console.warn('MariaDB no encontrado, continuando sin base de datos local');
        return null;
      }

      const args = options.args || ['--console', '--skip-grant-tables'];
      const workingDir = path.dirname(mariadbPath);

      this.mariaDBProcess = spawn(mariadbPath, args, {
        cwd: workingDir,
        detached: true,
        stdio: 'ignore'
      });

      this.mariaDBProcess.unref();

      return new Promise((resolve, reject) => {
        this.mariaDBProcess.on('error', (error) => {
          console.warn(`MariaDB no se pudo iniciar: ${error.message}`);
          resolve(null);
        });

        this.mariaDBProcess.on('spawn', () => {
          console.log(`MariaDB iniciado (PID: ${this.mariaDBProcess.pid})`);
          resolve({
            pid: this.mariaDBProcess.pid,
            isRunning: true,
            startTime: new Date()
          });
        });
      });
    } catch (error) {
      console.warn(`Error iniciando MariaDB: ${error.message}`);
      return null;
    }
  }

  /**
   * Busca el ejecutable de MariaDB
   */
  async findMariaDBExecutable() {
    const possiblePaths = [
      // Rutas relativas
      './MariaDB/bin/mysqld.exe',
      '../MariaDB/bin/mysqld.exe',
      './mysql/bin/mysqld.exe',
      
      // Rutas de instalación comunes
      'C:/Program Files/MariaDB/bin/mysqld.exe',
      'C:/Program Files (x86)/MariaDB/bin/mysqld.exe',
      'C:/MariaDB/bin/mysqld.exe',
      
      // Instalaciones portables
      path.join(process.cwd(), 'MariaDB', 'bin', 'mysqld.exe'),
      path.join(__dirname, '../../..', 'MariaDB', 'bin', 'mysqld.exe')
    ];

    for (const dbPath of possiblePaths) {
      try {
        await fs.access(dbPath);
        return dbPath;
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Lanza HeidiSQL
   */
  async launchHeidiSQL(options = {}) {
    try {
      const heidisqlPath = await this.findHeidiSQLExecutable();
      
      if (!heidisqlPath) {
        console.warn('HeidiSQL no encontrado');
        return null;
      }

      const args = options.args || [];

      this.heidisqlProcess = spawn(heidisqlPath, args, {
        detached: true,
        stdio: 'ignore'
      });

      this.heidisqlProcess.unref();

      return new Promise((resolve, reject) => {
        this.heidisqlProcess.on('error', (error) => {
          console.warn(`HeidiSQL no se pudo iniciar: ${error.message}`);
          resolve(null);
        });

        this.heidisqlProcess.on('spawn', () => {
          console.log(`HeidiSQL iniciado (PID: ${this.heidisqlProcess.pid})`);
          resolve({
            pid: this.heidisqlProcess.pid,
            isRunning: true,
            startTime: new Date()
          });
        });
      });
    } catch (error) {
      console.warn(`Error iniciando HeidiSQL: ${error.message}`);
      return null;
    }
  }

  /**
   * Busca el ejecutable de HeidiSQL
   */
  async findHeidiSQLExecutable() {
    const possiblePaths = [
      // Rutas relativas
      './HeidiSQL/heidisql.exe',
      '../HeidiSQL/heidisql.exe',
      
      // Rutas de instalación comunes
      'C:/Program Files/HeidiSQL/heidisql.exe',
      'C:/Program Files (x86)/HeidiSQL/heidisql.exe',
      
      // Instalaciones portables
      path.join(process.cwd(), 'HeidiSQL', 'heidisql.exe'),
      path.join(__dirname, '../../..', 'HeidiSQL', 'heidisql.exe')
    ];

    for (const sqlPath of possiblePaths) {
      try {
        await fs.access(sqlPath);
        return sqlPath;
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Lanza toda la suite de Koko (Browser + dependencias)
   */
  async launchKokoSuite(options = {}) {
    const results = {
      browser: null,
      mariadb: null,
      heidisql: null,
      success: false
    };

    try {
      // Iniciar MariaDB primero (si está disponible)
      if (options.includeMariaDB !== false) {
        results.mariadb = await this.launchMariaDB();
        if (results.mariadb) {
          // Esperar un poco para que MariaDB se inicie completamente
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Iniciar Koko Browser
      results.browser = await this.launchBrowser(options.browserOptions);

      // Iniciar HeidiSQL (opcional)
      if (options.includeHeidiSQL) {
        results.heidisql = await this.launchHeidiSQL();
      }

      results.success = results.browser !== null;
      return results;
    } catch (error) {
      throw new Error(`Error lanzando Koko Suite: ${error.message}`);
    }
  }

  /**
   * Verifica si un proceso está ejecutándose
   */
  async isProcessRunning(pid) {
    try {
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        return new Promise((resolve) => {
          exec(`tasklist /FI "PID eq ${pid}"`, (error, stdout) => {
            resolve(!error && stdout.includes(pid.toString()));
          });
        });
      } else {
        process.kill(pid, 0);
        return true;
      }
    } catch {
      return false;
    }
  }

  /**
   * Termina un proceso específico
   */
  async terminateProcess(pid, force = false) {
    try {
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        const signal = force ? '/F' : '/T';
        exec(`taskkill ${signal} /PID ${pid}`, (error) => {
          if (error) {
            console.error(`Error terminando proceso ${pid}: ${error.message}`);
          }
        });
      } else {
        process.kill(pid, force ? 'SIGKILL' : 'SIGTERM');
      }
      return true;
    } catch (error) {
      console.error(`Error terminando proceso: ${error.message}`);
      return false;
    }
  }

  /**
   * Cierra todos los procesos de Koko
   */
  async shutdownKokoSuite() {
    const processes = [
      { name: 'Browser', process: this.browserProcess },
      { name: 'MariaDB', process: this.mariaDBProcess },
      { name: 'HeidiSQL', process: this.heidisqlProcess }
    ];

    for (const { name, process } of processes) {
      if (process && process.pid) {
        try {
          await this.terminateProcess(process.pid);
          console.log(`${name} cerrado correctamente`);
        } catch (error) {
          console.warn(`Error cerrando ${name}: ${error.message}`);
        }
      }
    }

    // Limpiar referencias
    this.browserProcess = null;
    this.mariaDBProcess = null;
    this.heidisqlProcess = null;
  }
}

module.exports = AppLauncher;

// Uso directo desde línea de comandos
if (require.main === module) {
  const launcher = new AppLauncher();
  
  launcher.launchKokoSuite({
    includeMariaDB: true,
    includeHeidiSQL: false
  })
  .then((results) => {
    console.log('Koko Suite iniciado:', results);
    
    // Cerrar el launcher después de iniciar el navegador
    setTimeout(() => {
      process.exit(0);
    }, 3000);
  })
  .catch((error) => {
    console.error('Error iniciando Koko Suite:', error);
    process.exit(1);
  });
}