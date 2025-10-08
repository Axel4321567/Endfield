export type SidebarOption = 'dashboard' | 'koko-web' | null;

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
