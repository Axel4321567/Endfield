import React, { useState, useEffect, useRef } from 'react';
import { databaseService } from '../../services/DatabaseService';
import { useLogger } from '../../contexts/LogsContext';
import { useMariaDB } from '../../hooks/useMariaDB';
import { usePhp } from '../../hooks/usePhp';
import { usePhpMyAdmin } from '../../hooks/usePhpMyAdmin';
import './DatabaseManager.css';

interface DatabaseManagerProps {
  className?: string;
  onNavigate?: (option: string) => void;
}

/**
 * 🗄️ Componente refactorizado para gestión de MariaDB, PHP y phpMyAdmin
 * Utiliza hooks modulares para cada servicio
 */
export const DatabaseManager: React.FC<DatabaseManagerProps> = ({ className }) => {
  // Hooks modulares para cada servicio
  const mariadb = useMariaDB();
  const php = usePhp();
  const phpMyAdmin = usePhpMyAdmin();
  
  // Estados locales de UI
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showSystemState, setShowSystemState] = useState(false);
  const [showPhpState, setShowPhpState] = useState(false);
  const [showPhpMyAdminState, setShowPhpMyAdminState] = useState(false);
  
  // Referencia para logs iniciales
  const hasLoggedInit = useRef(false);
  const { addLog } = useLogger();

  // Log inicial y carga de estados
  useEffect(() => {
    if (!hasLoggedInit.current) {
      addLog('🗄️ Gestor de base de datos iniciado', 'info', 'database');
      hasLoggedInit.current = true;
      
      // Cargar estados iniciales
      mariadb.loadStatus();
      php.loadStatus();
      phpMyAdmin.loadStatus();
    }
  }, [mariadb, php, phpMyAdmin, addLog]);

  // Auto-refresh cada 10 segundos
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      mariadb.loadStatus();
      php.loadStatus();
      phpMyAdmin.loadStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, mariadb, php, phpMyAdmin]);

  // Helper functions
  const getDebugStatusColor = () => {
    if (!mariadb.status) return 'gray';
    
    switch (mariadb.status.status) {
      case 'running':
        return 'running';
      case 'stopped':
        return 'stopped';
      case 'installing':
        return 'installing';
      case 'error':
        return 'red';
      default:
        return 'unknown';
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    return `${minutes}m`;
  };

  return (
    <div className={`database-manager ${className || ''}`}>
      <div className="database-manager__header">
        <h2 className="database-manager__title">
          🗄️ Gestión de Base de Datos
        </h2>
        <div className="database-manager__controls">
          <button
            onClick={() => {
              addLog('🔄 Forzando actualización de estado...', 'info', 'database');
              databaseService.clearStatusCache();
              mariadb.loadStatus();
              php.loadStatus();
              phpMyAdmin.loadStatus();
            }}
            disabled={mariadb.loading || php.loading || phpMyAdmin.loading}
            className="database-manager__refresh-btn"
            title="Actualizar estado"
          >
            🔄
          </button>
          <button
            onClick={mariadb.runDiagnostics}
            disabled={mariadb.loading}
            className="database-manager__diagnostics-btn"
            title="Ejecutar diagnósticos"
          >
            🔍
          </button>
          <button
            onClick={async () => {
              if (window.electronAPI?.utils?.showDevTools) {
                try {
                  await window.electronAPI.utils.showDevTools();
                  addLog('🔧 DevTools abiertas', 'success', 'database');
                } catch (error) {
                  addLog('❌ Error abriendo DevTools', 'error', 'database');
                }
              } else {
                addLog('❌ DevTools no disponibles', 'error', 'database');
              }
            }}
            disabled={mariadb.loading}
            className="database-manager__diagnostics-btn"
            title="Abrir DevTools (F12)"
          >
            🔧
          </button>
          <label className="database-manager__auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-actualizar
          </label>
        </div>
      </div>

      {/* Mostrar errores de MariaDB */}
      {mariadb.error && (
        <div className="database-manager__error">
          ❌ {mariadb.error}
          <button onClick={() => mariadb.loadStatus()}>✕</button>
        </div>
      )}

      {/* Mostrar errores de PHP */}
      {php.error && (
        <div className="database-manager__error">
          ❌ PHP: {php.error}
          <button onClick={() => php.loadStatus()}>✕</button>
        </div>
      )}

      {/* Panel de diagnósticos */}
      {showDiagnostics && mariadb.diagnostics && (
        <div className="database-manager__diagnostics">
          <div className="database-manager__diagnostics-header">
            <h3>🔍 Diagnósticos del Sistema</h3>
            <button 
              onClick={() => setShowDiagnostics(false)}
              className="database-manager__close-btn"
            >
              ✕
            </button>
          </div>
          
          {mariadb.diagnostics.success ? (
            <div className="database-manager__diagnostics-success">
              ✅ No se encontraron problemas críticos
            </div>
          ) : (
            <div className="database-manager__diagnostics-issues">
              {mariadb.diagnostics.issues.map((issue, index) => (
                <div 
                  key={index} 
                  className={`database-manager__diagnostic-issue database-manager__diagnostic-issue--${issue.type}`}
                >
                  <div className="database-manager__issue-type">
                    {issue.type === 'admin' && '🔐'}
                    {issue.type === 'port' && '🔌'}
                    {issue.type === 'service' && '⚙️'}
                    {issue.type === 'disk' && '💾'}
                    {issue.type === 'general' && '⚠️'}
                    <strong>{issue.message}</strong>
                  </div>
                  <div className="database-manager__issue-solution">
                    💡 {issue.solution}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Barra de progreso de descarga */}
      {mariadb.downloadProgress && (
        <div className="database-manager__progress">
          <div className="database-manager__progress-header">
            <span className="database-manager__progress-text">
              {mariadb.downloadProgress.phase}
            </span>
            <span className="database-manager__progress-percent">
              {mariadb.downloadProgress.progress}%
            </span>
          </div>
          <div className="database-manager__progress-bar">
            <div 
              className="database-manager__progress-fill"
              style={{ width: `${mariadb.downloadProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Panel de MariaDB */}
      <div className="database-manager__debug">
        <div className="database-manager__debug-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h3>🗄️ MariaDB</h3>
            
            {/* MariaDB Status y botones integrados en el header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {mariadb.status?.installed ? (
                <>
                  <div className={`database-manager__status-badge database-manager__status-badge--${mariadb.status.status === 'running' ? 'running' : 'stopped'}`}>
                    {mariadb.status.status === 'running' ? '🟢 Ejecutándose' : '🔴 Detenido'}
                  </div>
                  
                  {mariadb.status.status === 'stopped' && (
                    <button
                      onClick={mariadb.start}
                      disabled={mariadb.loading}
                      className="database-manager__btn database-manager__btn--start"
                    >
                      {mariadb.loading ? '⏳ Iniciando...' : '▶️ Iniciar'}
                    </button>
                  )}

                  {mariadb.status.status === 'running' && (
                    <button
                      onClick={mariadb.stop}
                      disabled={mariadb.loading}
                      className="database-manager__btn database-manager__btn--stop"
                    >
                      {mariadb.loading ? '⏳ Deteniendo...' : '⏹️ Detener'}
                    </button>
                  )}

                  <button
                    onClick={mariadb.uninstall}
                    disabled={mariadb.loading}
                    className="database-manager__btn database-manager__btn--uninstall"
                    title="Desinstalar MariaDB del sistema"
                  >
                    {mariadb.loading ? '⏳ Desinstalando...' : '🗑️ Desinstalar'}
                  </button>
                </>
              ) : (
                <>
                  <div className="database-manager__status-badge database-manager__status-badge--stopped">
                    🔴 No instalado
                  </div>
                  <button
                    onClick={mariadb.install}
                    disabled={mariadb.loading}
                    className="database-manager__btn database-manager__btn--install"
                  >
                    {mariadb.downloadProgress 
                      ? `📥 ${mariadb.downloadProgress.phase} (${mariadb.downloadProgress.progress}%)`
                      : mariadb.loading 
                        ? '⏳ Instalando...' 
                        : '📥 Instalar'
                    }
                  </button>
                </>
              )}
              
              <button 
                className="database-manager__help-toggle"
                onClick={() => setShowSystemState(!showSystemState)}
              >
                {showSystemState ? '▼' : '▶'}
              </button>
            </div>
          </div>
        </div>
        {showSystemState && (
        <>
        <div className="database-manager__debug-grid">
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Instalado:</span>
            <span className={`database-manager__debug-value ${mariadb.status?.installed ? 'database-manager__debug-value--success' : 'database-manager__debug-value--error'}`}>
              {mariadb.status?.installed ? '✅ Sí' : '❌ No'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Estado:</span>
            <span className={`database-manager__debug-value database-manager__debug-value--${getDebugStatusColor()}`}>
              {mariadb.status?.status || 'desconocido'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">API:</span>
            <span className={`database-manager__debug-value ${mariadb.status?.success ? 'database-manager__debug-value--success' : 'database-manager__debug-value--error'}`}>
              {mariadb.status?.success ? '✅ Conectada' : '❌ Error'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Versión:</span>
            <span className="database-manager__debug-value database-manager__debug-value--neutral">
              {mariadb.status?.version || 'N/A'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Cargando:</span>
            <span className={`database-manager__debug-value ${mariadb.loading ? 'database-manager__debug-value--warning' : 'database-manager__debug-value--neutral'}`}>
              {mariadb.loading ? '⏳ Sí' : '✅ No'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Servicio:</span>
            <span className="database-manager__debug-value database-manager__debug-value--neutral">
              {mariadb.status?.serviceName || 'MariaDB'}
            </span>
          </div>
        </div>

        {mariadb.info && mariadb.info.success && (
          <div className="database-manager__info" style={{ marginTop: '0.5rem' }}>
            <div className="database-manager__info-grid">
              <div className="database-manager__info-item">
                <span className="database-manager__info-label">Host:</span>
                <span className="database-manager__info-value">{mariadb.info.host}</span>
              </div>
              <div className="database-manager__info-item">
                <span className="database-manager__info-label">Puerto:</span>
                <span className="database-manager__info-value">{mariadb.info.port}</span>
              </div>
              <div className="database-manager__info-item">
                <span className="database-manager__info-label">Base de datos:</span>
                <span className="database-manager__info-value">{mariadb.info.database}</span>
              </div>
              <div className="database-manager__info-item">
                <span className="database-manager__info-label">Tiempo activo:</span>
                <span className="database-manager__info-value">{formatUptime(mariadb.info.uptime)}</span>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* Panel de PHP */}
      <div className="database-manager__debug">
        <div className="database-manager__debug-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h3>🐘 PHP</h3>
            
            {/* PHP Status y botones integrados en el header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className={`database-manager__status-badge database-manager__status-badge--${php.installed ? 'running' : 'stopped'}`}>
                {php.installed ? '🟢 Instalado' : '🔴 No instalado'}
              </div>
              
              {!php.installed && (
                <button
                  onClick={php.install}
                  disabled={php.loading}
                  className="database-manager__btn database-manager__btn--install"
                >
                  {php.loading ? '⏳ Instalando...' : '📥 Instalar'}
                </button>
              )}

              {php.installed && (
                <button
                  onClick={php.uninstall}
                  disabled={php.loading}
                  className="database-manager__btn database-manager__btn--uninstall"
                  title="Desinstalar PHP"
                >
                  {php.loading ? '⏳ Desinstalando...' : '🗑️ Desinstalar'}
                </button>
              )}
              
              <button 
                className="database-manager__help-toggle"
                onClick={() => setShowPhpState(!showPhpState)}
              >
                {showPhpState ? '▼' : '▶'}
              </button>
            </div>
          </div>
        </div>
        {showPhpState && (
        <>
        <div className="database-manager__debug-grid">
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Instalado:</span>
            <span className={`database-manager__debug-value ${php.installed ? 'database-manager__debug-value--success' : 'database-manager__debug-value--error'}`}>
              {php.installed ? '✅ Sí' : '❌ No'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Versión:</span>
            <span className="database-manager__debug-value database-manager__debug-value--neutral">
              {php.version || 'N/A'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Path:</span>
            <span className="database-manager__debug-value database-manager__debug-value--neutral" title={php.path || 'N/A'}>
              {php.path ? php.path.substring(php.path.lastIndexOf('\\') + 1) : 'N/A'}
            </span>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Barra de progreso de phpMyAdmin */}
      {phpMyAdmin.downloadProgress && (
        <div className="database-manager__progress">
          <div className="database-manager__progress-header">
            <span className="database-manager__progress-text">
              {phpMyAdmin.downloadProgress.phase}
            </span>
            <span className="database-manager__progress-percent">
              {phpMyAdmin.downloadProgress.progress}%
            </span>
          </div>
          <div className="database-manager__progress-bar">
            <div 
              className="database-manager__progress-fill"
              style={{ width: `${phpMyAdmin.downloadProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Panel de phpMyAdmin */}
      <div className="database-manager__debug">
        <div className="database-manager__debug-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h3>🌐 phpMyAdmin</h3>
            
            {/* phpMyAdmin Status y botones integrados en el header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className={`database-manager__status-badge database-manager__status-badge--${phpMyAdmin.installed ? 'running' : 'stopped'}`}>
                {phpMyAdmin.installed ? '🟢 Instalado' : '🔴 No instalado'}
              </div>
              
              {!phpMyAdmin.installed && (
                <button
                  onClick={phpMyAdmin.install}
                  disabled={phpMyAdmin.loading}
                  className="database-manager__btn database-manager__btn--install"
                >
                  {phpMyAdmin.downloadProgress 
                    ? `📥 ${phpMyAdmin.downloadProgress.phase} (${phpMyAdmin.downloadProgress.progress}%)`
                    : phpMyAdmin.loading 
                      ? '⏳ Instalando...' 
                      : '📥 Instalar'
                  }
                </button>
              )}

              {phpMyAdmin.installed && (
                <button
                  onClick={phpMyAdmin.uninstall}
                  disabled={phpMyAdmin.loading}
                  className="database-manager__btn database-manager__btn--uninstall"
                  title="Desinstalar phpMyAdmin"
                >
                  {phpMyAdmin.loading ? '⏳ Desinstalando...' : '🗑️ Desinstalar'}
                </button>
              )}
              
              <button 
                className="database-manager__help-toggle"
                onClick={() => setShowPhpMyAdminState(!showPhpMyAdminState)}
              >
                {showPhpMyAdminState ? '▼' : '▶'}
              </button>
            </div>
          </div>
        </div>
        {showPhpMyAdminState && (
        <>
        <div className="database-manager__debug-grid">
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Instalado:</span>
            <span className={`database-manager__debug-value ${phpMyAdmin.installed ? 'database-manager__debug-value--success' : 'database-manager__debug-value--error'}`}>
              {phpMyAdmin.installed ? '✅ Sí' : '❌ No'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Versión:</span>
            <span className="database-manager__debug-value database-manager__debug-value--neutral">
              {phpMyAdmin.version || 'N/A'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Path:</span>
            <span className="database-manager__debug-value database-manager__debug-value--neutral" title={phpMyAdmin.path || 'N/A'}>
              {phpMyAdmin.path ? phpMyAdmin.path.substring(phpMyAdmin.path.lastIndexOf('\\') + 1) : 'N/A'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Config:</span>
            <span className="database-manager__debug-value database-manager__debug-value--neutral" title={phpMyAdmin.configPath || 'N/A'}>
              {phpMyAdmin.configPath ? '✅ Configurado' : '❌ No configurado'}
            </span>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default DatabaseManager;
