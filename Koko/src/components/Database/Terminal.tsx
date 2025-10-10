import React, { useState, useEffect, useRef } from 'react';
import './Terminal.css';

interface TerminalProps {
  isOpen: boolean;
  onToggle: () => void;
  logs: string[];
  onClear: () => void;
  className?: string;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'success';
  message: string;
}

export const Terminal: React.FC<TerminalProps> = ({ 
  isOpen, 
  onToggle, 
  logs, 
  onClear, 
  className 
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [height, setHeight] = useState(200);

  // Auto-scroll al final cuando se agregan nuevos logs
  useEffect(() => {
    if (terminalRef.current && isOpen) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const parseLog = (log: string): LogEntry => {
    const timestamp = new Date().toLocaleTimeString();
    
    // Determinar el nivel basado en el contenido
    let level: LogEntry['level'] = 'info';
    if (log.includes('❌') || log.includes('Error') || log.includes('error')) {
      level = 'error';
    } else if (log.includes('⚠️') || log.includes('Warning') || log.includes('warn')) {
      level = 'warn';
    } else if (log.includes('✅') || log.includes('success') || log.includes('Success')) {
      level = 'success';
    }

    return { timestamp, level, message: log };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newHeight = window.innerHeight - e.clientY - 20;
      setHeight(Math.max(100, Math.min(500, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!isOpen) {
    return (
      <div className={`terminal-collapsed ${className || ''}`}>
        <button 
          onClick={onToggle}
          className="terminal-toggle-btn"
          title="Abrir terminal"
        >
          📟 Terminal ({logs.length} logs)
        </button>
      </div>
    );
  }

  return (
    <div className={`terminal-container ${className || ''}`} style={{ height }}>
      {/* Resize handle */}
      <div 
        className="terminal-resize-handle"
        onMouseDown={handleMouseDown}
        title="Arrastrar para redimensionar"
      />
      
      {/* Header */}
      <div className="terminal-header">
        <div className="terminal-header-left">
          <span className="terminal-title">📟 Terminal de Base de Datos</span>
          <span className="terminal-count">({logs.length} logs)</span>
        </div>
        <div className="terminal-header-right">
          <button
            onClick={onClear}
            className="terminal-clear-btn"
            title="Limpiar logs"
          >
            🗑️
          </button>
          <button
            onClick={onToggle}
            className="terminal-minimize-btn"
            title="Minimizar terminal"
          >
            ➖
          </button>
        </div>
      </div>

      {/* Content */}
      <div 
        ref={terminalRef}
        className="terminal-content"
      >
        {logs.length === 0 ? (
          <div className="terminal-empty">
            <span className="terminal-empty-icon">💬</span>
            <span>No hay logs disponibles</span>
            <small>Los logs aparecerán aquí cuando se ejecuten operaciones</small>
          </div>
        ) : (
          logs.map((log, index) => {
            const parsedLog = parseLog(log);
            return (
              <div 
                key={index} 
                className={`terminal-line terminal-line--${parsedLog.level}`}
              >
                <span className="terminal-timestamp">
                  [{parsedLog.timestamp}]
                </span>
                <span className="terminal-message">
                  {parsedLog.message}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="terminal-footer">
        <div className="terminal-status">
          <span className="terminal-status-dot terminal-status-dot--active" />
          <span>Conectado - Logs en tiempo real</span>
        </div>
        <div className="terminal-actions">
          <button
            onClick={() => {
              if (terminalRef.current) {
                terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
              }
            }}
            className="terminal-scroll-btn"
            title="Ir al final"
          >
            ⬇️
          </button>
        </div>
      </div>
    </div>
  );
};

export default Terminal;