import { useState } from 'react';

interface SessionTab {
  id: string;
  url: string;
  title: string;
  isActive: boolean;
}

interface BrowserSession {
  tabs: SessionTab[];
  activeTabId: string | null;
  timestamp: number;
}

const SESSION_STORAGE_KEY = 'koko-browser-session';

export const useSessionManager = () => {
  const [session, setSession] = useState<BrowserSession | null>(null);

  // Cargar sesión desde localStorage
  const loadSession = (): BrowserSession | null => {
    try {
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsedSession: BrowserSession = JSON.parse(savedSession);
        console.log('📂 Sesión cargada desde localStorage:', parsedSession);
        return parsedSession;
      }
    } catch (error) {
      console.error('❌ Error al cargar sesión:', error);
    }
    return null;
  };

  // Guardar sesión en localStorage
  const saveSession = (sessionData: BrowserSession) => {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      console.log('💾 Sesión guardada en localStorage:', sessionData);
    } catch (error) {
      console.error('❌ Error al guardar sesión:', error);
    }
  };

  // Crear sesión por defecto
  const createDefaultSession = (): BrowserSession => {
    console.log('🆕 Creando sesión por defecto con Google');
    return {
      tabs: [
        {
          id: `tab-${Date.now()}`,
          url: 'https://www.google.com',
          title: 'Google',
          isActive: true
        }
      ],
      activeTabId: `tab-${Date.now()}`,
      timestamp: Date.now()
    };
  };

  // Actualizar sesión actual
  const updateSession = (tabs: any[], activeTabId: string | null) => {
    const sessionTabs: SessionTab[] = tabs.map(tab => ({
      id: tab.id,
      url: tab.url || 'about:blank',
      title: tab.title || 'Nueva pestaña',
      isActive: tab.id === activeTabId
    }));

    const newSession: BrowserSession = {
      tabs: sessionTabs,
      activeTabId,
      timestamp: Date.now()
    };

    setSession(newSession);
    saveSession(newSession);
  };

  // Restaurar sesión al inicializar
  const restoreSession = () => {
    const savedSession = loadSession();
    
    if (savedSession && savedSession.tabs.length > 0) {
      console.log('🔄 Restaurando sesión guardada...');
      setSession(savedSession);
      return savedSession;
    } else {
      console.log('🆕 No hay sesión guardada, creando sesión por defecto...');
      const defaultSession = createDefaultSession();
      setSession(defaultSession);
      saveSession(defaultSession);
      return defaultSession;
    }
  };

  // Limpiar sesión
  const clearSession = () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setSession(null);
      console.log('🗑️ Sesión limpiada');
    } catch (error) {
      console.error('❌ Error al limpiar sesión:', error);
    }
  };

  // Verificar si hay cambios en las pestañas
  const hasChanges = (currentTabs: any[], currentActiveTabId: string | null): boolean => {
    if (!session) return true;
    
    if (session.tabs.length !== currentTabs.length) return true;
    if (session.activeTabId !== currentActiveTabId) return true;
    
    return session.tabs.some((sessionTab, index) => {
      const currentTab = currentTabs[index];
      return sessionTab.url !== currentTab?.url || sessionTab.title !== currentTab?.title;
    });
  };

  return {
    session,
    restoreSession,
    updateSession,
    clearSession,
    hasChanges,
    loadSession,
    saveSession
  };
};