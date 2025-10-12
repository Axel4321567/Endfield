import React, { useState, useEffect, useRef } from 'react';
import { databaseService } from '../../services/DatabaseService';
import { useLogger } from '../../contexts/LogsContext';
import { useMariaDB } from '../../hooks/useMariaDB';
import { usePhp } from '../../hooks/usePhp';
import { usePhpMyAdmin } from '../../hooks/usePhpMyAdmin';
import { useSearchProxy } from '../../hooks/useSearchProxy';
import { useChromium } from '../../hooks/useChromium';
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
  const searchProxy = useSearchProxy();
  const chromium = useChromium();
  
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
      searchProxy.loadStatus();
      chromium.loadStatus();
    }
  }, [mariadb, php, phpMyAdmin, searchProxy, chromium, addLog]);

  // Auto-refresh cada 10 segundos
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      mariadb.loadStatus();
      php.loadStatus();
      phpMyAdmin.loadStatus();
      searchProxy.loadStatus();
      chromium.loadStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, mariadb, php, phpMyAdmin, searchProxy, chromium]);

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

      {/* Tabla MySQL unificada */}
      <div className="database-manager__mysql-table">
        <div className="database-manager__table-header">
          <h3>Lista de Servicios</h3>
        </div>
        
        <table className="database-manager__table">
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {/* Fila MariaDB */}
            <tr>
              <td className="database-manager__service-name">
                <span className="database-manager__service-icon">🗄️</span>
                MariaDB
              </td>
              <td>
                {mariadb.status?.installed ? (
                  <div className={`database-manager__status-badge database-manager__status-badge--${mariadb.status.status === 'running' ? 'running' : 'stopped'}`}>
                    {mariadb.status.status === 'running' ? '🟢 EJECUTÁNDOSE' : '🔴 DETENIDO'}
                  </div>
                ) : (
                  <div className="database-manager__status-badge database-manager__status-badge--stopped">
                    🔴 NO INSTALADO
                  </div>
                )}
              </td>
              <td className="database-manager__actions">
                {mariadb.status?.installed ? (
                  <>
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
                      title="Desinstalar MariaDB"
                    >
                      🗑️ Desinstalar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={mariadb.install}
                    disabled={mariadb.loading}
                    className="database-manager__btn database-manager__btn--install"
                  >
                    {mariadb.downloadProgress 
                      ? `📥 ${mariadb.downloadProgress.progress}%`
                      : mariadb.loading 
                        ? '⏳ Instalando...' 
                        : '📥 Instalar'
                    }
                  </button>
                )}
              </td>
            </tr>
            
            {/* Fila PHP */}
            <tr>
              <td className="database-manager__service-name">
                <span className="database-manager__service-icon">🐘</span>
                PHP
              </td>
              <td>
                <div className={`database-manager__status-badge database-manager__status-badge--${php.installed ? 'running' : 'stopped'}`}>
                  {php.installed ? '🟢 INSTALADO' : '🔴 NO INSTALADO'}
                </div>
              </td>
              <td className="database-manager__actions">
                {!php.installed ? (
                  <button
                    onClick={php.install}
                    disabled={php.loading}
                    className="database-manager__btn database-manager__btn--install"
                  >
                    {php.loading ? '⏳ Instalando...' : '📥 Instalar'}
                  </button>
                ) : (
                  <button
                    onClick={php.uninstall}
                    disabled={php.loading}
                    className="database-manager__btn database-manager__btn--uninstall"
                    title="Desinstalar PHP"
                  >
                    🗑️ Desinstalar
                  </button>
                )}
              </td>
            </tr>
            
            {/* Fila phpMyAdmin */}
            <tr>
              <td className="database-manager__service-name">
                <span className="database-manager__service-icon">🌐</span>
                phpMyAdmin
              </td>
              <td>
                <div className={`database-manager__status-badge database-manager__status-badge--${phpMyAdmin.installed ? 'running' : 'stopped'}`}>
                  {phpMyAdmin.installed ? '🟢 INSTALADO' : '🔴 NO INSTALADO'}
                </div>
              </td>
              <td className="database-manager__actions">
                {!phpMyAdmin.installed ? (
                  <button
                    onClick={phpMyAdmin.install}
                    disabled={phpMyAdmin.loading}
                    className="database-manager__btn database-manager__btn--install"
                  >
                    {phpMyAdmin.downloadProgress 
                      ? `📥 ${phpMyAdmin.downloadProgress.progress}%`
                      : phpMyAdmin.loading 
                        ? '⏳ Instalando...' 
                        : '📥 Instalar'
                    }
                  </button>
                ) : (
                  <button
                    onClick={phpMyAdmin.uninstall}
                    disabled={phpMyAdmin.loading}
                    className="database-manager__btn database-manager__btn--uninstall"
                    title="Desinstalar phpMyAdmin"
                  >
                    🗑️ Desinstalar
                  </button>
                )}
              </td>
            </tr>
            
            {/* Fila Search Proxy */}
            <tr>
              <td className="database-manager__service-name">
                <span className="database-manager__service-icon">🔍</span>
                Search Proxy
              </td>
              <td>
                <div className={`database-manager__status-badge database-manager__status-badge--${searchProxy.running ? 'running' : 'stopped'}`}>
                  {searchProxy.running ? '� EJECUTÁNDOSE' : '�🔴 DETENIDO'}
                </div>
              </td>
              <td className="database-manager__actions">
                {!searchProxy.running ? (
                  <button
                    onClick={searchProxy.start}
                    disabled={searchProxy.loading}
                    className="database-manager__btn database-manager__btn--start"
                  >
                    {searchProxy.loading ? '⏳ Iniciando...' : '▶️ Iniciar'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={searchProxy.stop}
                      disabled={searchProxy.loading}
                      className="database-manager__btn database-manager__btn--stop"
                    >
                      {searchProxy.loading ? '⏳ Deteniendo...' : '⏹️ Detener'}
                    </button>
                    <button
                      onClick={searchProxy.restart}
                      disabled={searchProxy.loading}
                      className="database-manager__btn database-manager__btn--install"
                      title="Reiniciar Search Proxy"
                    >
                      🔄 Reiniciar
                    </button>
                  </>
                )}
              </td>
            </tr>
            
            {/* Fila Chromium */}
            <tr>
              <td className="database-manager__service-name">
                <span className="database-manager__service-icon">🌐</span>
                Chromium
              </td>
              <td>
                <div className={`database-manager__status-badge database-manager__status-badge--${chromium.installed ? 'running' : 'stopped'}`}>
                  {chromium.installed ? '� INSTALADO' : '�🔴 NO INSTALADO'}
                </div>
              </td>
              <td className="database-manager__actions">
                {!chromium.installed ? (
                  <button
                    onClick={chromium.download}
                    disabled={chromium.loading}
                    className="database-manager__btn database-manager__btn--install"
                  >
                    {chromium.downloadProgress 
                      ? `📥 ${chromium.downloadProgress.progress}%`
                      : chromium.loading 
                        ? '⏳ Descargando...' 
                        : '📥 Descargar'
                    }
                  </button>
                ) : (
                  <>
                    <button
                      onClick={chromium.verify}
                      disabled={chromium.loading}
                      className="database-manager__btn database-manager__btn--start"
                      title="Verificar integridad de Chromium"
                    >
                      {chromium.loading ? '⏳ Verificando...' : '✓ Verificar'}
                    </button>
                    <button
                      onClick={chromium.uninstall}
                      disabled={chromium.loading}
                      className="database-manager__btn database-manager__btn--uninstall"
                      title="Desinstalar Chromium"
                    >
                      🗑️ Desinstalar
                    </button>
                  </>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
    </div>
  );
};

export default DatabaseManager;
