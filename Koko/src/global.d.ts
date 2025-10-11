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
  discord: DiscordAPI;
  [key: string]: any;
}

interface Window {
  electronAPI?: ElectronAPI;
}
