// Definiciones de tipos globales para Electron API

interface DiscordAPI {
  reload: () => Promise<{ success: boolean }>;
  getStatus: () => Promise<{ connected: boolean; user?: any; guilds?: number }>;
  setSettings: (settings: any) => Promise<{ success: boolean }>;
  getSettings: () => Promise<any>;
  injectCSS: (css: string) => Promise<{ success: boolean }>;
  optimize: () => Promise<{ success: boolean }>;
  saveToken: (token: string) => Promise<boolean>;
  getToken: () => Promise<string | null>;
  deleteToken: () => Promise<boolean>;
  onStatusChange: (callback: (...args: any[]) => void) => void;
  removeStatusChangeListener: () => void;
  onNotification: (callback: (...args: any[]) => void) => void;
  removeNotificationListener: () => void;
}

interface ElectronAPI {
  isElectron: boolean;
  discord: DiscordAPI;
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
    notifySidebarChange: () => Promise<{ success: boolean; message?: string; error?: string }>;
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
  searchProxy: {
    checkHealth: () => Promise<{
      success: boolean;
      data?: any;
      error?: string;
    }>;
    search: (query: string) => Promise<{
      success: boolean;
      query?: string;
      htmlLength?: number;
      message?: string;
      error?: string;
    }>;
    searchJson: (query: string) => Promise<{
      success: boolean;
      data?: any;
      error?: string;
    }>;
    show: (bounds?: { x: number; y: number; width: number; height: number }) => Promise<{
      success: boolean;
      error?: string;
    }>;
    hide: () => Promise<{
      success: boolean;
      error?: string;
    }>;
    navigate: (url: string) => Promise<{
      success: boolean;
      url?: string;
      error?: string;
    }>;
  };
  chromium: {
    getStatus: () => Promise<{
      success: boolean;
      installed: boolean;
      version?: string;
      path?: string;
      error?: string;
    }>;
    download: () => Promise<{
      success: boolean;
      version?: string;
      path?: string;
      error?: string;
    }>;
    launch: (url?: string) => Promise<{
      success: boolean;
      pid?: number;
      message?: string;
      error?: string;
    }>;
    close: () => Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }>;
    verify: () => Promise<{
      success: boolean;
      valid?: boolean;
      issues?: string[];
      error?: string;
    }>;
    uninstall: () => Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }>;
    clearCache: () => Promise<{
      success: boolean;
      bytesCleared?: number;
      message?: string;
      error?: string;
    }>;
    onDownloadProgress: (callback: (data: {
      phase: string;
      progress: number;
      message: string;
    }) => void) => () => void;
  };
  puppeteerBrowser: {
    open: (url: string) => Promise<{
      success: boolean;
      url?: string;
      message?: string;
      error?: string;
    }>;
    close: () => Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }>;
    getStatus: () => Promise<{
      success: boolean;
      isOpen: boolean;
      hasPage: boolean;
      hasBrowserView: boolean;
      currentUrl?: string | null;
    }>;
    show: () => Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }>;
    hide: () => Promise<{
      success: boolean;
      message?: string;
      error?: string;
    }>;
    // 🗂️ Sistema de múltiples tabs
    tabNavigate: (tabId: string, url: string) => Promise<{
      success: boolean;
      tabId?: string;
      url?: string;
      error?: string;
    }>;
    tabSwitch: (tabId: string) => Promise<{
      success: boolean;
      tabId?: string;
      currentUrl?: string | null;
      error?: string;
    }>;
    tabClose: (tabId: string) => Promise<{
      success: boolean;
      tabId?: string;
      error?: string;
    }>;
    tabGetUrl: (tabId: string) => Promise<{
      success: boolean;
      tabId?: string;
      url?: string | null;
      error?: string;
    }>;
  };
  [key: string]: any;
}

interface Window {
  electronAPI?: ElectronAPI;
}
