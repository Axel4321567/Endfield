import { useState, useCallback, useEffect, useRef } from 'react';
import type { Tab, TabsManager } from '../types';
import { useSessionManager } from './useSessionManager';

export type { Tab } from '../types';

export interface TabManagerState {
  tabs: Tab[];
  activeTabId: string | null;
}

export const useTabs = (): TabsManager => {
  const sessionManager = useSessionManager();
  const [state, setState] = useState<TabManagerState>({
    tabs: [],
    activeTabId: null
  });
  const [isSessionRestored, setIsSessionRestored] = useState(false);
  const lastSavedStateRef = useRef<string | null>(null);

  // Restaurar sesión al inicializar
  useEffect(() => {
    if (!isSessionRestored) {
      console.log('🔄 Inicializando sistema de pestañas con sesiones...');
      const restoredSession = sessionManager.restoreSession();
      
      if (restoredSession && restoredSession.tabs.length > 0) {
        console.log('✅ Restaurando pestañas desde sesión:', restoredSession.tabs);
        
        // Convertir las pestañas de sesión a pestañas completas
        const restoredTabs: Tab[] = restoredSession.tabs.map(sessionTab => ({
          id: sessionTab.id,
          title: sessionTab.title,
          url: sessionTab.url,
          favicon: undefined,
          isLoading: false,
          canGoBack: false,
          canGoForward: false,
          history: sessionTab.url ? [sessionTab.url] : [],
          historyIndex: sessionTab.url ? 0 : -1
        }));

        setState({
          tabs: restoredTabs,
          activeTabId: restoredSession.activeTabId
        });
      } else {
        console.log('🆕 No hay sesión previa, comenzando con pestaña vacía por defecto');
        // Crear pestaña por defecto vacía (sin URL para mostrar SpeedDial)
        const defaultTab: Tab = {
          id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: 'Nueva pestaña',
          url: '', // Vacía para mostrar SpeedDial
          favicon: undefined,
          isLoading: false,
          canGoBack: false,
          canGoForward: false,
          history: [],
          historyIndex: -1
        };

        setState({
          tabs: [defaultTab],
          activeTabId: defaultTab.id
        });
      }
      
      setIsSessionRestored(true);
    }
  }, [isSessionRestored, sessionManager]);

  // Guardar sesión cuando cambian las pestañas (con debounce para YouTube y prevención de bucles)
  useEffect(() => {
    if (isSessionRestored && state.tabs.length > 0) {
      // Crear hash del estado actual para evitar guardado duplicado
      const currentStateHash = JSON.stringify({
        tabs: state.tabs.map(tab => ({ id: tab.id, url: tab.url, title: tab.title })),
        activeTabId: state.activeTabId
      });
      
      // Solo guardar si el estado ha cambiado realmente
      if (lastSavedStateRef.current === currentStateHash) {
        console.log('⏭️ Estado sin cambios, omitiendo guardado de sesión');
        return;
      }
      
      // Debounce para YouTube: evitar guardado excesivo durante playlist
      const isYouTubeTab = state.tabs.some(tab => tab.url.includes('youtube.com/watch'));
      
      if (isYouTubeTab) {
        console.log('🎵 YouTube detectado - guardado con delay para evitar spam');
        const timeoutId = setTimeout(() => {
          if (lastSavedStateRef.current !== currentStateHash) {
            console.log('💾 Guardando sesión YouTube (delayed)...');
            sessionManager.updateSession(state.tabs, state.activeTabId);
            lastSavedStateRef.current = currentStateHash;
          }
        }, 2000); // 2 segundos de delay para YouTube
        
        return () => clearTimeout(timeoutId);
      } else {
        console.log('💾 Guardando sesión automáticamente...');
        sessionManager.updateSession(state.tabs, state.activeTabId);
        lastSavedStateRef.current = currentStateHash;
      }
    }
  }, [state.tabs, state.activeTabId, isSessionRestored, sessionManager]);

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