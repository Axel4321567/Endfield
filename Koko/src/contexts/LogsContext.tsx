import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'success';
  message: string;
  section: 'dashboard' | 'koko-web' | 'discord' | 'database' | 'extras' | 'system';
}

interface LogsContextType {
  logs: LogEntry[];
  addLog: (message: string, level?: LogEntry['level'], section?: LogEntry['section']) => void;
  clearLogs: (section?: LogEntry['section']) => void;
  getLogsBySection: (section: LogEntry['section']) => LogEntry[];
  terminalOpen: boolean;
  setTerminalOpen: (open: boolean) => void;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export const useLogger = () => {
  const context = useContext(LogsContext);
  if (!context) {
    throw new Error('useLogger debe usarse dentro de LogsProvider');
  }
  return context;
};

interface LogsProviderProps {
  children: ReactNode;
}

export const LogsProvider: React.FC<LogsProviderProps> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [terminalOpen, setTerminalOpen] = useState(false);

  const addLog = (
    message: string, 
    level: LogEntry['level'] = 'info',
    section: LogEntry['section'] = 'system'
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newLog: LogEntry = {
      id,
      timestamp,
      level,
      message,
      section
    };

    setLogs(prev => [...prev, newLog]);
    console.log(`[${section.toUpperCase()}] ${message}`);
  };

  const clearLogs = (section?: LogEntry['section']) => {
    if (section) {
      setLogs(prev => prev.filter(log => log.section !== section));
      addLog(`🗑️ Logs de ${section} limpiados`, 'info', 'system');
    } else {
      setLogs([]);
      addLog('🗑️ Todos los logs limpiados', 'info', 'system');
    }
  };

  const getLogsBySection = (section: LogEntry['section']) => {
    return logs.filter(log => log.section === section || log.section === 'system');
  };

  const value: LogsContextType = {
    logs,
    addLog,
    clearLogs,
    getLogsBySection,
    terminalOpen,
    setTerminalOpen
  };

  return (
    <LogsContext.Provider value={value}>
      {children}
    </LogsContext.Provider>
  );
};

export default LogsProvider;