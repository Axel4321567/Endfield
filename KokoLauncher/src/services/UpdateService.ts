export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  speed: number;
  timeRemaining: number;
}

export interface UpdateProgress {
  phase: 'checking' | 'downloading' | 'validating' | 'installing' | 'complete' | 'error';
  message: string;
  progress?: DownloadProgress;
  error?: string;
}

export class UpdateService {
  private static downloadInProgress = false;
  private static progressCallback?: (progress: UpdateProgress) => void;

  /**
   * Descarga e instala una actualización desde la URL especificada
   */
  static async downloadAndInstallUpdate(
    downloadUrl: string,
    expectedHash: string = '',
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<void> {
    this.progressCallback = onProgress;
    this.downloadInProgress = true;

    try {
      this.notifyProgress({
        phase: 'downloading',
        message: 'Iniciando descarga de Koko Browser...'
      });

      // Usar la API de Electron para descargar el archivo
      const downloadPath = await window.electronAPI?.downloadFile(downloadUrl, (progress: DownloadProgress) => {
        this.notifyProgress({
          phase: 'downloading',
          message: `Descargando Koko Browser... ${progress.percentage.toFixed(1)}%`,
          progress
        });
      });

      if (!downloadPath) {
        throw new Error('Error descargando archivo');
      }

      this.notifyProgress({
        phase: 'downloading',
        message: 'Descarga completada'
      });

      // Validar integridad si se proporciona hash
      if (expectedHash) {
        this.notifyProgress({
          phase: 'validating',
          message: 'Validando integridad del archivo...'
        });

        const isValid = await window.electronAPI?.validateFileIntegrity(downloadPath, expectedHash);
        if (!isValid) {
          throw new Error('El archivo descargado está corrupto');
        }
      }

      // Instalar la actualización
      this.notifyProgress({
        phase: 'installing',
        message: 'Instalando Koko Browser...'
      });

      await window.electronAPI?.installUpdate(downloadPath);

      this.notifyProgress({
        phase: 'complete',
        message: 'Koko Browser instalado exitosamente'
      });

      // Limpiar archivo temporal
      await window.electronAPI?.deleteFile(downloadPath);

    } catch (error) {
      this.notifyProgress({
        phase: 'error',
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw error;
    } finally {
      this.downloadInProgress = false;
      this.progressCallback = undefined;
    }
  }

  /**
   * Descarga una actualización sin instalarla
   */
  static async downloadUpdate(
    downloadUrl: string,
    expectedHash: string = '',
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<string> {
    this.progressCallback = onProgress;
    this.downloadInProgress = true;

    try {
      this.notifyProgress({
        phase: 'downloading',
        message: 'Iniciando descarga...'
      });

      // Usar la API de Electron para descargar el archivo
      const downloadPath = await window.electronAPI?.downloadFile(downloadUrl, (progress: DownloadProgress) => {
        this.notifyProgress({
          phase: 'downloading',
          message: `Descargando... ${progress.percentage.toFixed(1)}%`,
          progress
        });
      });

      if (!downloadPath) {
        throw new Error('Error descargando archivo');
      }

      this.notifyProgress({
        phase: 'downloading',
        message: 'Descarga completada'
      });

      // Validar integridad si se proporciona hash
      if (expectedHash) {
        this.notifyProgress({
          phase: 'validating',
          message: 'Validando integridad del archivo...'
        });

        const isValid = await window.electronAPI?.validateFileIntegrity(downloadPath, expectedHash);
        if (!isValid) {
          throw new Error('El archivo descargado está corrupto');
        }
      }

      return downloadPath;

    } catch (error) {
      this.notifyProgress({
        phase: 'error',
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw error;
    } finally {
      this.downloadInProgress = false;
    }
  }

  /**
   * Instala una actualización descargada
   */
  static async installUpdate(filePath: string): Promise<void> {
    try {
      this.notifyProgress({
        phase: 'installing',
        message: 'Preparando instalación...'
      });

      // Verificar si Koko Browser está ejecutándose
      const isBrowserRunning = await window.electronAPI?.isBrowserRunning();
      
      if (isBrowserRunning) {
        this.notifyProgress({
          phase: 'installing',
          message: 'Cerrando Koko Browser...'
        });
        
        await window.electronAPI?.closeBrowser();
        
        // Esperar a que se cierre completamente
        await this.waitForBrowserClose();
      }

      this.notifyProgress({
        phase: 'installing',
        message: 'Instalando actualización...'
      });

      // Ejecutar el instalador
      await window.electronAPI?.installUpdate(filePath);

      this.notifyProgress({
        phase: 'complete',
        message: 'Actualización instalada exitosamente'
      });

    } catch (error) {
      this.notifyProgress({
        phase: 'error',
        message: 'Error en la instalación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw error;
    }
  }

  /**
   * Cancela una descarga en progreso
   */
  static async cancelDownload(): Promise<void> {
    if (this.downloadInProgress) {
      await window.electronAPI?.cancelDownload();
      this.downloadInProgress = false;
      
      this.notifyProgress({
        phase: 'error',
        message: 'Descarga cancelada por el usuario'
      });
    }
  }

  /**
   * Verifica si hay una descarga en progreso
   */
  static isDownloadInProgress(): boolean {
    return this.downloadInProgress;
  }

  /**
   * Actualiza completamente el navegador (descarga + instalación)
   */
  static async updateBrowser(
    downloadUrl: string,
    expectedHash: string,
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<void> {
    try {
      // Descargar actualización
      const downloadPath = await this.downloadUpdate(downloadUrl, expectedHash, onProgress);
      
      // Instalar actualización
      await this.installUpdate(downloadPath);
      
      // Limpiar archivo temporal
      await window.electronAPI?.deleteFile(downloadPath);
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Espera a que Koko Browser se cierre completamente
   */
  private static async waitForBrowserClose(): Promise<void> {
    const maxWaitTime = 30000; // 30 segundos
    const checkInterval = 1000; // 1 segundo
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
      const isRunning = await window.electronAPI?.isBrowserRunning();
      if (!isRunning) {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }
    
    throw new Error('Timeout esperando que Koko Browser se cierre');
  }

  /**
   * Notifica el progreso a los listeners
   */
  private static notifyProgress(progress: UpdateProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Obtiene información sobre actualizaciones de dependencias (MariaDB, HeidiSQL)
   */
  static async checkDependencyUpdates(): Promise<{
    mariadb?: { hasUpdate: boolean; version: string; downloadUrl: string };
    heidisql?: { hasUpdate: boolean; version: string; downloadUrl: string };
  }> {
    try {
      return await window.electronAPI?.checkDependencyUpdates() || {};
    } catch (error) {
      console.error('Error checking dependency updates:', error);
      return {};
    }
  }

  /**
   * Actualiza una dependencia específica
   */
  static async updateDependency(
    dependency: 'mariadb' | 'heidisql',
    downloadUrl: string,
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<void> {
    this.progressCallback = onProgress;
    
    try {
      this.notifyProgress({
        phase: 'downloading',
        message: `Descargando ${dependency}...`
      });

      await window.electronAPI?.updateDependency(dependency, downloadUrl);
      
      this.notifyProgress({
        phase: 'complete',
        message: `${dependency} actualizado exitosamente`
      });
    } catch (error) {
      this.notifyProgress({
        phase: 'error',
        message: `Error actualizando ${dependency}`,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw error;
    }
  }
}