export type SidebarOption = 'dashboard' | 'koko-web' | 'discord' | 'database' | null;

export interface SidebarItem {
  id: SidebarOption;
  label: string;
  icon?: string;
}

// Definir tipos para tabs
export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  history: string[];
  historyIndex: number;
}

export interface TabsManager {
  tabs: Tab[];
  activeTabId: string | null;
  activeTab: Tab | null;
  createNewTab: (url?: string, title?: string) => string;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  navigateTab: (tabId: string, url: string, title?: string) => void;
  goBack: (tabId: string) => void;
  goForward: (tabId: string) => void;
  refreshTab: (tabId: string) => void;
}

// Tipos globales para Electron API (compartidos por toda la aplicación)
declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      webview: {
        navigate: (url: string) => Promise<void>;
        goBack: () => Promise<void>;
        goForward: () => Promise<void>;
        reload: () => Promise<void>;
      };
      app: {
        quit: () => Promise<void>;
        closeWindow: () => Promise<void>;
        minimize: () => Promise<void>;
        getStatus: () => Promise<any>;
      };
      navigation: {
        openBrowserTab: (url: string) => Promise<{
          success: boolean;
          method: 'external-window' | 'internal-webview';
          url: string;
        }>;
        openExternalPage: (url: string) => Promise<{
          success: boolean;
          method: 'external-window' | 'internal-webview';
          url: string;
          windowId?: number;
          reason: string;
        }>;
        createNewTab: (url: string, title?: string) => Promise<{
          success: boolean;
          url: string;
          title?: string;
        }>;
        onNavigateInWebview: (callback: (event: any, url: string) => void) => void;
        removeNavigateInWebviewListener: () => void;
        onCreateNewTab: (callback: (event: any, url: string, title?: string) => void) => void;
        removeCreateNewTabListener: () => void;
      };
      utils: {
        openExternal: (url: string) => Promise<void>;
        showDevTools: () => Promise<void>;
      };
      // APIs para streaming (ya existentes)
      streaming?: {
        isStreamingService: (url: string) => boolean;
        optimize: (url: string) => Promise<{ success: boolean; optimized: boolean }>;
      };
      // APIs específicas para Discord
      discord?: {
        reload: () => Promise<{ success: boolean }>;
        getStatus: () => Promise<{ connected: boolean; user?: any; guilds?: number }>;
        setSettings: (settings: any) => Promise<{ success: boolean }>;
        getSettings: () => Promise<any>;
        injectCSS: (css: string) => Promise<{ success: boolean }>;
        optimize: () => Promise<{ success: boolean }>;
        onStatusChange: (callback: (event: any, status: any) => void) => void;
        removeStatusChangeListener: () => void;
        onNotification: (callback: (event: any, notification: any) => void) => void;
        removeNotificationListener: () => void;
      };
      // APIs para gestión de base de datos (MariaDB + HeidiSQL)
      database?: {
        install: () => Promise<{ success: boolean; message?: string; error?: string }>;
        start: () => Promise<{ success: boolean; message?: string; error?: string }>;
        stop: () => Promise<{ success: boolean; message?: string; error?: string }>;
        getStatus: () => Promise<{ 
          success: boolean; 
          status: 'running' | 'stopped' | 'installing' | 'error' | 'unknown';
          installed: boolean;
          version?: string;
          serviceName?: string;
          uptime?: number;
          error?: string;
        }>;
        openHeidiSQL: () => Promise<{ success: boolean; message?: string; error?: string }>;
        getInfo: () => Promise<{
          success: boolean;
          status: string;
          installed: boolean;
          version: string;
          port: number;
          host: string;
          database: string;
          uptime?: number;
          error?: string;
        }>;
        runDiagnostics: () => Promise<{
          success: boolean;
          issues: Array<{
            type: string;
            message: string;
            solution: string;
          }>;
          error?: string;
        }>;
        // Listeners para eventos de progreso
        onDownloadProgress: (callback: (progressData: { progress: number; phase: string }) => void) => void;
        removeDownloadProgressListener: () => void;
      };
      // APIs para Auto-Updater de Electron
      autoUpdater?: {
        checkForUpdates: () => Promise<{ success: boolean; message: string }>;
        installUpdate: () => Promise<{ success: boolean }>;
        onUpdateAvailable: (callback: (info: {
          version: string;
          releaseDate?: string;
          releaseNotes?: string;
        }) => void) => void;
        onDownloadProgress: (callback: (progress: {
          percent: number;
          transferred: number;
          total: number;
        }) => void) => void;
        onUpdateDownloaded: (callback: (info: {
          version: string;
          releaseDate?: string;
        }) => void) => void;
        onUpdateNotAvailable: (callback: (info: {
          version: string;
        }) => void) => void;
        onError: (callback: (error: {
          message: string;
          stack?: string;
        }) => void) => void;
        removeAllListeners: () => void;
      };
    };
  }
}