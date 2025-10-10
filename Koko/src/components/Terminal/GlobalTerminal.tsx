import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { useLogger, type LogEntry } from '../../contexts/LogsContext';
import './GlobalTerminal.css';

interface GlobalTerminalProps {
  currentSection: LogEntry['section'];
}

interface SectionIcon {
  [key: string]: string;
}

const sectionIcons: SectionIcon = {
  dashboard: '📊',
  database: '🗄️',
  discord: '💬',
  'koko-web': '🌐',
  system: '⚙️',
  default: '📟'
};

const GlobalTerminal: React.FC<GlobalTerminalProps> = memo(({ currentSection }) => {
  const [height, setHeight] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const lastSectionRef = useRef<LogEntry['section']>(currentSection);
  
  const { clearLogs, getLogsBySection, setTerminalOpen } = useLogger();

  // Memoize logs to prevent unnecessary re-renders
  const currentLogs = useMemo(() => {
    // Only recalculate if section changes or we force update
    if (lastSectionRef.current !== currentSection) {
      lastSectionRef.current = currentSection;
    }
    return getLogsBySection(currentSection);
  }, [currentSection, getLogsBySection]);

  // Memoize clear function
  const handleClearLogs = useCallback(() => {
    clearLogs(currentSection);
  }, [clearLogs, currentSection]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [currentLogs]);

  // Handle resize
  useEffect(() => {
    let animationFrameId: number;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // Cancelar frame anterior si existe
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      // Usar requestAnimationFrame para suavizar
      animationFrameId = requestAnimationFrame(() => {
        const terminal = terminalRef.current;
        if (!terminal) return;
        
        const terminalRect = terminal.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const maxHeight = viewportHeight * 0.8; // 80% de la pantalla
        const newHeight = Math.max(150, Math.min(maxHeight, terminalRect.bottom - e.clientY));
        
        setHeight(newHeight);
      });
    };

    const handleMouseUp = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: true });
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
      
      // Prevenir selección de texto durante resize
      if (terminalRef.current) {
        terminalRef.current.style.pointerEvents = 'none';
      }
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
      
      if (terminalRef.current) {
        terminalRef.current.style.pointerEvents = '';
      }
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
      
      if (terminalRef.current) {
        terminalRef.current.style.pointerEvents = '';
      }
    };
  }, [isResizing]);

  const handleScrollToBottom = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, []);

  const getLogLineClass = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'global-terminal__line--error';
      case 'warn':
        return 'global-terminal__line--warn';
      case 'success':
        return 'global-terminal__line--success';
      case 'info':
      default:
        return 'global-terminal__line--info';
    }
  };

  return (
    <div 
      ref={terminalRef}
            className={`global-terminal__container ${isResizing ? 'resizing' : ''}`} 
      style={{ height: `${height}px` }}
    >
      {/* Resize handle */}
      <div
        ref={resizeRef}
        className="global-terminal__resize-handle"
        onMouseDown={() => setIsResizing(true)}
      />

      {/* Header */}
      <div className="global-terminal__header">
        <div className="global-terminal__header-left">
          <span className="global-terminal__section-icon">
            {sectionIcons[currentSection] || sectionIcons.default}
          </span>
          <span className="global-terminal__title">
            {currentSection.charAt(0).toUpperCase() + currentSection.slice(1)} Terminal
          </span>
          {currentLogs.length > 0 && (
            <span className="global-terminal__count">
              {currentLogs.length} logs
            </span>
          )}
        </div>
        <div className="global-terminal__header-right">
          <button
            className="global-terminal__clear-btn"
            onClick={handleClearLogs}
            title="Clear logs"
          >
            🗑️
          </button>
          <button
            className="global-terminal__minimize-btn"
            onClick={() => setTerminalOpen(false)}
            title="Minimize terminal"
          >
            ➖
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="global-terminal__content"
      >
        {currentLogs.length === 0 ? (
          <div className="global-terminal__empty">
            <div className="global-terminal__empty-icon">
              {sectionIcons[currentSection] || sectionIcons.default}
            </div>
            <div>No logs for {currentSection}</div>
            <small>Logs will appear here as operations are performed</small>
          </div>
        ) : (
          currentLogs.map((log: LogEntry) => (
            <div
              key={log.id}
              className={`global-terminal__line ${getLogLineClass(log.level)}`}
            >
              <div className="global-terminal__message">
                [{log.timestamp}] {log.message}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="global-terminal__footer">
        <div className="global-terminal__status">
          <div className="global-terminal__status-dot global-terminal__status-dot--active" />
          <span>Terminal Active</span>
        </div>
        <div className="global-terminal__actions">
          {currentLogs.length > 0 && (
            <button
              className="global-terminal__scroll-btn"
              onClick={handleScrollToBottom}
              title="Scroll to bottom"
            >
              ⬇️
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

GlobalTerminal.displayName = 'GlobalTerminal';

export default GlobalTerminal;