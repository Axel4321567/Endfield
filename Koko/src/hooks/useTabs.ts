import { useState, useCallback } from 'react';
import type { Tab, TabsManager } from '../types';

export type { Tab } from '../types';

export interface TabManagerState {
  tabs: Tab[];
  activeTabId: string | null;
}

export const useTabs = (): TabsManager => {
  const [state, setState] = useState<TabManagerState>({
    tabs: [],
    activeTabId: null
  });

  const createNewTab = useCallback((url: string = '', title: string = 'Nueva pestaña') => {
    const newTab: Tab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      url,
      favicon: undefined,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      history: url ? [url] : [],
      historyIndex: url ? 0 : -1
    };

    setState(prev => ({
      tabs: [...prev.tabs, newTab],
      activeTabId: newTab.id
    }));

    return newTab.id;
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setState(prev => {
      const newTabs = prev.tabs.filter(tab => tab.id !== tabId);
      let newActiveTabId = prev.activeTabId;

      // Si cerramos la pestaña activa, seleccionar otra
      if (prev.activeTabId === tabId) {
        if (newTabs.length > 0) {
          const closedTabIndex = prev.tabs.findIndex(tab => tab.id === tabId);
          const nextIndex = Math.min(closedTabIndex, newTabs.length - 1);
          newActiveTabId = newTabs[nextIndex]?.id || null;
        } else {
          newActiveTabId = null;
        }
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveTabId
      };
    });
  }, []);

  const switchTab = useCallback((tabId: string) => {
    setState(prev => ({
      ...prev,
      activeTabId: tabId
    }));
  }, []);

  const updateTab = useCallback((tabId: string, updates: Partial<Tab>) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => 
        tab.id === tabId ? { ...tab, ...updates } : tab
      )
    }));
  }, []);

  const navigateTab = useCallback((tabId: string, url: string, title?: string) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => {
        if (tab.id === tabId) {
          const newHistory = [...tab.history.slice(0, tab.historyIndex + 1), url];
          return {
            ...tab,
            url,
            title: title || tab.title,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            canGoBack: newHistory.length > 1,
            canGoForward: false,
            isLoading: true
          };
        }
        return tab;
      })
    }));
  }, []);

  const goBack = useCallback((tabId: string) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => {
        if (tab.id === tabId && tab.canGoBack) {
          const newIndex = tab.historyIndex - 1;
          return {
            ...tab,
            url: tab.history[newIndex],
            historyIndex: newIndex,
            canGoBack: newIndex > 0,
            canGoForward: true,
            isLoading: true
          };
        }
        return tab;
      })
    }));
  }, []);

  const goForward = useCallback((tabId: string) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => {
        if (tab.id === tabId && tab.canGoForward) {
          const newIndex = tab.historyIndex + 1;
          return {
            ...tab,
            url: tab.history[newIndex],
            historyIndex: newIndex,
            canGoBack: true,
            canGoForward: newIndex < tab.history.length - 1,
            isLoading: true
          };
        }
        return tab;
      })
    }));
  }, []);

  const refreshTab = useCallback((tabId: string) => {
    setState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => 
        tab.id === tabId ? { ...tab, isLoading: true } : tab
      )
    }));
  }, []);

  const getActiveTab = useCallback(() => {
    return state.tabs.find(tab => tab.id === state.activeTabId) || null;
  }, [state.tabs, state.activeTabId]);

  return {
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    activeTab: getActiveTab(),
    createNewTab,
    closeTab,
    switchTab,
    updateTab,
    navigateTab,
    goBack,
    goForward,
    refreshTab
  };
};