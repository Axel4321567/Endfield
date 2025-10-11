export class FileUtils {
  /**
   * Convierte bytes a formato legible
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Convierte velocidad de descarga a formato legible
   */
  static formatSpeed(bytesPerSecond: number): string {
    return `${this.formatFileSize(bytesPerSecond)}/s`;
  }

  /**
   * Convierte tiempo en segundos a formato legible
   */
  static formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Genera un nombre de archivo único agregando timestamp
   */
  static generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, '');
    
    return `${nameWithoutExtension}_${timestamp}.${extension}`;
  }

  /**
   * Extrae la extensión de un archivo
   */
  static getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Valida si un archivo es ejecutable de Windows
   */
  static isExecutableFile(fileName: string): boolean {
    const executableExtensions = ['exe', 'msi', 'bat', 'cmd'];
    const extension = this.getFileExtension(fileName);
    return executableExtensions.includes(extension);
  }

  /**
   * Valida si un archivo es un installer de Electron
   */
  static isElectronInstaller(fileName: string): boolean {
    const extension = this.getFileExtension(fileName);
    return extension === 'exe' && fileName.includes('Setup');
  }

  /**
   * Construye una ruta segura concatenando partes
   */
  static joinPath(...parts: string[]): string {
    return parts
      .map((part, index) => {
        if (index === 0) {
          return part.replace(/[/\\]+$/, '');
        }
        return part.replace(/^[/\\]+/, '').replace(/[/\\]+$/, '');
      })
      .join('/');
  }

  /**
   * Obtiene el directorio padre de una ruta
   */
  static getParentDirectory(filePath: string): string {
    return filePath.replace(/[/\\][^/\\]*$/, '');
  }

  /**
   * Obtiene solo el nombre del archivo de una ruta completa
   */
  static getFileName(filePath: string): string {
    return filePath.split(/[/\\]/).pop() || '';
  }

  /**
   * Normaliza separadores de ruta para Windows
   */
  static normalizePath(filePath: string): string {
    return filePath.replace(/\//g, '\\');
  }

  /**
   * Convierte una ruta a formato Unix (para URLs)
   */
  static toUnixPath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  /**
   * Valida si una ruta es absoluta
   */
  static isAbsolutePath(filePath: string): boolean {
    // Windows: C:\ o \\server\share
    return /^[a-zA-Z]:[\\/]/.test(filePath) || /^\\\\/.test(filePath);
  }

  /**
   * Sanitiza un nombre de archivo removiendo caracteres inválidos
   */
  static sanitizeFileName(fileName: string): string {
    // Remover caracteres no válidos para nombres de archivo en Windows
    return fileName.replace(/[<>:"/\\|?*]/g, '_').trim();
  }

  /**
   * Calcula el porcentaje de progreso
   */
  static calculateProgress(current: number, total: number): number {
    if (total === 0) return 0;
    return Math.min(100, Math.max(0, (current / total) * 100));
  }

  /**
   * Estima el tiempo restante basado en velocidad actual
   */
  static estimateTimeRemaining(downloaded: number, total: number, speed: number): number {
    if (speed === 0) return Infinity;
    const remaining = total - downloaded;
    return remaining / speed;
  }

  /**
   * Crea un delay/pausa
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry con backoff exponencial
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        // Backoff exponencial
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }
}