/**
 * 🗄️ Servicio de Base de Datos
 * Maneja la comunicación con MariaDB y HeidiSQL a través de Electron IPC
 */

// Tipos para el estado de la base de datos
export interface DatabaseStatus {
  success: boolean;
  status: 'running' | 'stopped' | 'installing' | 'error' | 'unknown';
  installed: boolean;
  version?: string;
  uptime?: number;
  error?: string;
}

export interface DatabaseInfo {
  success: boolean;
  status: string;
  installed: boolean;
  version: string;
  port: number;
  host: string;
  database: string;
  uptime?: number;
  error?: string;
}

export interface DatabaseResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface DiagnosticIssue {
  type: string;
  message: string;
  solution: string;
}

export interface DiagnosticResult {
  success: boolean;
  issues: DiagnosticIssue[];
  error?: string;
}

/**
 * Servicio principal para gestionar la base de datos MariaDB
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private statusCache: DatabaseStatus | null = null;
  private statusCacheTime = 0;
  private readonly CACHE_DURATION = 15000; // 15 segundos - mayor que el autoRefresh de 10s
  private pendingStatusRequest: Promise<DatabaseStatus> | null = null;

  private constructor() {}

  /**
   * Obtener instancia singleton del servicio
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Verificar si las APIs de Electron están disponibles
   */
  private checkElectronAPI(): boolean {
    return typeof window !== 'undefined' && 
           !!window.electronAPI && 
           !!window.electronAPI.database;
  }

  /**
   * Instalar MariaDB en el sistema
   */
  public async installMariaDB(): Promise<DatabaseResult> {
    if (!this.checkElectronAPI()) {
      return { success: false, error: 'APIs de Electron no disponibles' };
    }

    try {
      console.log('🔧 [DatabaseService] Iniciando instalación de MariaDB...');
      const result = await window.electronAPI!.database!.install();
      
      if (result.success) {
        console.log('✅ [DatabaseService] MariaDB instalado correctamente');
        this.clearStatusCache();
      } else {
        console.error('❌ [DatabaseService] Error en instalación:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ [DatabaseService] Error en instalación:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Ejecutar diagnósticos del sistema para detectar problemas
   */
  public async runDiagnostics(): Promise<DiagnosticResult> {
    if (!this.checkElectronAPI()) {
      return { 
        success: false, 
        issues: [],
        error: 'APIs de Electron no disponibles'
      };
    }

    try {
      console.log('🔍 [DatabaseService] Ejecutando diagnósticos...');
      const result = await window.electronAPI!.database!.runDiagnostics();
      return result;
    } catch (error) {
      console.error('❌ [DatabaseService] Error en diagnósticos:', error);
      return { 
        success: false, 
        issues: [],
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Iniciar el servicio de MariaDB
   */
  public async startService(): Promise<DatabaseResult> {
    if (!this.checkElectronAPI()) {
      return { success: false, error: 'APIs de Electron no disponibles' };
    }

    try {
      console.log('▶️ [DatabaseService] Iniciando servicio MariaDB...');
      const result = await window.electronAPI!.database!.start();
      
      if (result.success) {
        console.log('✅ [DatabaseService] Servicio iniciado correctamente');
        this.clearStatusCache();
      } else {
        console.error('❌ [DatabaseService] Error al iniciar servicio:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ [DatabaseService] Error al iniciar servicio:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Detener el servicio de MariaDB
   */
  public async stopService(): Promise<DatabaseResult> {
    if (!this.checkElectronAPI()) {
      return { success: false, error: 'APIs de Electron no disponibles' };
    }

    try {
      console.log('⏹️ [DatabaseService] Deteniendo servicio MariaDB...');
      const result = await window.electronAPI!.database!.stop();
      
      if (result.success) {
        console.log('✅ [DatabaseService] Servicio detenido correctamente');
        this.clearStatusCache();
      } else {
        console.error('❌ [DatabaseService] Error al detener servicio:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ [DatabaseService] Error al detener servicio:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtener el estado actual del servicio MariaDB con cache
   */
  public async getStatus(useCache = true): Promise<DatabaseStatus> {
    if (!this.checkElectronAPI()) {
      return { 
        success: false, 
        status: 'error', 
        installed: false,
        error: 'APIs de Electron no disponibles'
      };
    }

    // Usar cache si está disponible y es reciente
    if (useCache && this.statusCache && 
        (Date.now() - this.statusCacheTime) < this.CACHE_DURATION) {
      return this.statusCache;
    }

    // Si ya hay una petición pendiente, esperarla
    if (this.pendingStatusRequest) {
      return this.pendingStatusRequest;
    }

    // Crear nueva petición
    this.pendingStatusRequest = this.fetchStatus();
    
    try {
      const result = await this.pendingStatusRequest;
      return result;
    } finally {
      // Limpiar la petición pendiente
      this.pendingStatusRequest = null;
    }
  }

  /**
   * Método privado para hacer la consulta real del estado
   */
  private async fetchStatus(): Promise<DatabaseStatus> {
    try {
      console.log('📊 [Database] Obteniendo estado del servicio...');
      
      // Verificar que la API esté disponible
      if (!window.electronAPI?.database?.getStatus) {
        throw new Error('API de base de datos no disponible');
      }
      
      const result = await window.electronAPI.database.getStatus();
      
      // Validar que el resultado no sea undefined o null
      if (!result) {
        throw new Error('La API retornó un resultado vacío');
      }
      
      // Asegurar que el resultado tenga la estructura correcta
      const validatedResult: DatabaseStatus = {
        success: result.success ?? false,
        status: result.status || 'unknown',
        installed: result.installed ?? false,
        error: result.error || undefined,
        version: result.version || undefined,
        uptime: result.uptime || undefined
      };
      
      // Actualizar cache
      this.statusCache = validatedResult;
      this.statusCacheTime = Date.now();
      
      return validatedResult;
    } catch (error) {
      console.error('❌ [DatabaseService] Error al obtener estado:', error);
      const errorResult: DatabaseStatus = { 
        success: false, 
        status: 'error', 
        installed: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
      
      // Cache también los errores por un corto tiempo
      this.statusCache = errorResult;
      this.statusCacheTime = Date.now();
      
      return errorResult;
    }
  }

  /**
   * Abrir HeidiSQL para gestión visual de la base de datos
   */
  public async openHeidiSQL(): Promise<DatabaseResult> {
    if (!this.checkElectronAPI()) {
      return { success: false, error: 'APIs de Electron no disponibles' };
    }

    try {
      console.log('🖥️ [DatabaseService] Abriendo HeidiSQL...');
      const result = await window.electronAPI!.database!.openHeidiSQL();
      
      if (result.success) {
        console.log('✅ [DatabaseService] HeidiSQL abierto correctamente');
      } else {
        console.error('❌ [DatabaseService] Error al abrir HeidiSQL:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ [DatabaseService] Error al abrir HeidiSQL:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtener información completa de la base de datos
   */
  public async getInfo(): Promise<DatabaseInfo> {
    if (!this.checkElectronAPI()) {
      return { 
        success: false, 
        status: 'error', 
        installed: false,
        version: 'N/A',
        port: 3306,
        host: 'localhost',
        database: 'KokoDB',
        error: 'APIs de Electron no disponibles'
      };
    }

    try {
      console.log('ℹ️ [DatabaseService] Obteniendo información completa...');
      const result = await window.electronAPI!.database!.getInfo();
      return result;
    } catch (error) {
      console.error('❌ [DatabaseService] Error al obtener información:', error);
      return { 
        success: false, 
        status: 'error', 
        installed: false,
        version: 'N/A',
        port: 3306,
        host: 'localhost',
        database: 'KokoDB',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Limpiar el cache de estado
   */
  private clearStatusCache(): void {
    this.statusCache = null;
    this.statusCacheTime = 0;
    this.pendingStatusRequest = null;
  }

  /**
   * Verificar si la base de datos está lista para usar
   */
  public async isReady(): Promise<boolean> {
    const status = await this.getStatus();
    return status.success && status.installed && status.status === 'running';
  }

  /**
   * Verificar si MariaDB está instalado
   */
  public async isInstalled(): Promise<boolean> {
    const status = await this.getStatus();
    return status.success && status.installed;
  }

  /**
   * Obtener estado simple para UI (string)
   */
  public async getSimpleStatus(): Promise<string> {
    const status = await this.getStatus();
    
    if (!status.success) {
      return 'Error';
    }
    
    if (!status.installed) {
      return 'No instalado';
    }
    
    switch (status.status) {
      case 'running':
        return 'Ejecutándose';
      case 'stopped':
        return 'Detenido';
      case 'installing':
        return 'Instalando...';
      case 'error':
        return 'Error';
      default:
        return 'Desconocido';
    }
  }
}

// Exportar instancia singleton
export const databaseService = DatabaseService.getInstance();
export default databaseService;