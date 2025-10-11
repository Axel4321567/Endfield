// Tipos globales para la API de Electron en el renderer

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  speed: number;
  timeRemaining: number;
}

export interface ProcessInfo {
  pid: number;
}

export interface LaunchOptions {
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface AppConfig {
  updateChannel?: string;
  browserPath?: string;
  [key: string]: any;
}

export interface ElectronAPI {
  // Versión y configuración
  getAppVersion(): Promise<string>;
  getConfig(): Promise<AppConfig>;
  setConfig(config: Partial<AppConfig>): Promise<void>;
  getSystemInfo(): Promise<{ username: string; homedir: string; platform: string; }>;
  getFileVersion(filePath: string): Promise<string | null>;

  // Gestión de archivos
  downloadFile(url: string, onProgress: (progress: DownloadProgress) => void): Promise<string>;
  validateFileIntegrity(filePath: string, expectedHash: string): Promise<boolean>;
  deleteFile(filePath: string): Promise<void>;
  fileExists(filePath: string): Promise<boolean>;

  // Gestión de procesos
  launchProcess(executablePath: string, options?: LaunchOptions): Promise<ProcessInfo>;
  terminateProcess(pid: number, force?: boolean): Promise<boolean>;
  isProcessRunning(pid: number): Promise<boolean>;

  // Actualizaciones
  installUpdate(filePath: string): Promise<void>;
  cancelDownload(): Promise<void>;

  // Navegador
  isBrowserRunning(): Promise<boolean>;
  closeBrowser(): Promise<void>;

  // Dependencias
  checkDependencyUpdates(): Promise<{
    mariadb?: { hasUpdate: boolean; version: string; downloadUrl: string };
    heidisql?: { hasUpdate: boolean; version: string; downloadUrl: string };
  }>;
  updateDependency(dependency: 'mariadb' | 'heidisql', downloadUrl: string): Promise<void>;

  // Logs
  writeLog(level: 'info' | 'warn' | 'error', message: string): Promise<void>;
  getLogs(lines?: number): Promise<string[]>;
  onLogEntry(callback: (logEntry: { timestamp: string; level: string; message: string }) => void): void;
  removeAllListeners(): void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}