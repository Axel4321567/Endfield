import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ChevronDown, ChevronUp, X, Download } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface LogViewerProps {
  logs: LogEntry[];
  isVisible: boolean;
  onToggle: () => void;
  onClear?: () => void;
  className?: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  isVisible,
  onToggle,
  onClear,
  className = ''
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');

  const filteredLogs = logs.filter(log => 
    filter === 'all' || log.level === filter
  );

  useEffect(() => {
    if (autoScroll && isVisible) {
      const logContainer = document.getElementById('log-container');
      if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }
  }, [logs, autoScroll, isVisible]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-300 border-red-400/50';
      case 'warn':
        return 'text-yellow-300 border-yellow-400/50';
      case 'info':
      default:
        return 'text-blue-300 border-blue-400/50';
    }
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-500/20 text-red-300';
      case 'warn':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'info':
      default:
        return 'bg-blue-500/20 text-blue-300';
    }
  };

  const exportLogs = () => {
    const logText = filteredLogs
      .map(log => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`)
      .join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koko-launcher-logs-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header del panel de logs */}
      <motion.div
        className="glass-container p-4 cursor-pointer"
        onClick={onToggle}
        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Terminal className="w-5 h-5 text-koko-400" />
            <span className="font-medium text-white">
              Logs del Sistema ({filteredLogs.length})
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {logs.length > 0 && (
              <span className="text-xs text-white/60">
                {logs.filter(l => l.level === 'error').length} errores, {' '}
                {logs.filter(l => l.level === 'warn').length} advertencias
              </span>
            )}
            {isVisible ? (
              <ChevronUp className="w-5 h-5 text-white/60" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white/60" />
            )}
          </div>
        </div>
      </motion.div>

      {/* Panel expandible de logs */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="glass-container mt-2 p-4 space-y-4">
              {/* Controles */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center space-x-3">
                  {/* Filtros */}
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-sm text-white"
                  >
                    <option value="all">Todos</option>
                    <option value="info">Info</option>
                    <option value="warn">Advertencias</option>
                    <option value="error">Errores</option>
                  </select>

                  {/* Auto scroll */}
                  <label className="flex items-center space-x-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="rounded"
                    />
                    <span>Auto scroll</span>
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Exportar logs */}
                  <button
                    onClick={exportLogs}
                    className="glass-button px-3 py-1 text-sm flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportar</span>
                  </button>

                  {/* Limpiar logs */}
                  {onClear && (
                    <button
                      onClick={onClear}
                      className="glass-button px-3 py-1 text-sm flex items-center space-x-2 text-red-300"
                    >
                      <X className="w-4 h-4" />
                      <span>Limpiar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Contenedor de logs */}
              <div
                id="log-container"
                className="bg-black/30 rounded-lg p-3 h-64 overflow-y-auto space-y-1 border border-white/10"
                style={{ fontFamily: 'Consolas, Monaco, monospace' }}
              >
                {filteredLogs.length === 0 ? (
                  <div className="text-center text-white/60 py-8">
                    <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No hay logs disponibles</p>
                  </div>
                ) : (
                  filteredLogs.map((log, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`log-entry ${getLevelColor(log.level)}`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-white/60 text-xs font-mono">
                          {log.timestamp}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelBadgeColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className="flex-1 text-sm">
                          {log.message}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LogViewer;