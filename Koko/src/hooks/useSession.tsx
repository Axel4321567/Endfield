import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback } from 'react';

// Tipos para el sistema de sesiones
export interface SessionState {
  id: string;
  component: ReactNode;
  isActive: boolean;
  lastAccessed: number;
  preserveState: boolean;
}

export interface SessionManager {
  sessions: Map<string, SessionState>;
  activeSessionId: string | null;
  createSession: (id: string, component: ReactNode, preserveState?: boolean) => void;
  activateSession: (id: string) => void;
  destroySession: (id: string) => void;
  getActiveSession: () => SessionState | null;
  getAllSessions: () => SessionState[];
  isSessionActive: (id: string) => boolean;
}

// Context para el SessionManager
const SessionContext = createContext<SessionManager | null>(null);

// Hook para usar el SessionManager
export const useSession = (): SessionManager => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession debe usarse dentro de un SessionProvider');
  }
  return context;
};

// Provider del SessionManager
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [sessions] = useState<Map<string, SessionState>>(new Map());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const createSession = useCallback((id: string, component: ReactNode, preserveState = true) => {
    console.log(`📦 Creando sesión: ${id}`);
    
    const sessionState: SessionState = {
      id,
      component,
      isActive: false,
      lastAccessed: Date.now(),
      preserveState
    };
    
    sessions.set(id, sessionState);
  }, [sessions]);

  const activateSession = useCallback((id: string) => {
    console.log(`🎯 Activando sesión: ${id}`);
    
    // Desactivar sesión anterior
    if (activeSessionId && sessions.has(activeSessionId)) {
      const prevSession = sessions.get(activeSessionId)!;
      prevSession.isActive = false;
    }
    
    // Activar nueva sesión
    if (sessions.has(id)) {
      const session = sessions.get(id)!;
      session.isActive = true;
      session.lastAccessed = Date.now();
      setActiveSessionId(id);
    } else {
      console.warn(`⚠️ Sesión no encontrada: ${id}`);
    }
  }, [activeSessionId, sessions]);

  const destroySession = useCallback((id: string) => {
    console.log(`🗑️ Destruyendo sesión: ${id}`);
    
    if (sessions.has(id)) {
      sessions.delete(id);
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    }
  }, [activeSessionId, sessions]);

  const getActiveSession = useCallback((): SessionState | null => {
    if (activeSessionId && sessions.has(activeSessionId)) {
      return sessions.get(activeSessionId)!;
    }
    return null;
  }, [activeSessionId, sessions]);

  const getAllSessions = useCallback((): SessionState[] => {
    return Array.from(sessions.values());
  }, [sessions]);

  const isSessionActive = useCallback((id: string): boolean => {
    return activeSessionId === id;
  }, [activeSessionId]);

  const sessionManager: SessionManager = {
    sessions,
    activeSessionId,
    createSession,
    activateSession,
    destroySession,
    getActiveSession,
    getAllSessions,
    isSessionActive
  };

  return (
    <SessionContext.Provider value={sessionManager}>
      {children}
    </SessionContext.Provider>
  );
};

export default SessionProvider;