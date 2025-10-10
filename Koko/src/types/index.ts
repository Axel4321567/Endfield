export type SidebarOption = 'dashboard' | 'koko-web' | 'discord' | null;

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
    };
  }
}