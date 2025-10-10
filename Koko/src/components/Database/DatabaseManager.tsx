import React, { useState, useEffect, useCallback, useRef } from 'react';
import { databaseService } from '../../services/DatabaseService';
import type { DatabaseStatus, DatabaseInfo, DiagnosticResult } from '../../services/DatabaseService';
import { useLogger } from '../../contexts/LogsContext';
import './DatabaseManager.css';

interface DatabaseManagerProps {
  className?: string;
}

/**
 * 🗄️ Componente para gestión de MariaDB y HeidiSQL
 * Permite instalar, iniciar, detener y monitorear la base de datos
 */
export const DatabaseManager: React.FC<DatabaseManagerProps> = ({ className }) => {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [info, setInfo] = useState<DatabaseInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ progress: number; phase: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  // Usar el sistema global de logs
  const { addLog: globalAddLog } = useLogger();
  const hasLoggedInit = useRef(false);
  const isInitializing = useRef(false);
  const isMounted = useRef(true); // Inicializar como true desde el principio
  
  // Función helper para logs de database con useCallback
  const addLog = useCallback((message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    globalAddLog(message, level, 'database');
  }, [globalAddLog]);

  // Función para cargar estado - definida antes de los useEffect
  const loadStatus = useCallback(async (forceRefresh = false) => {
    console.log('🚀 [React] === INICIANDO loadStatus ===');
    console.log('🚀 [React] forceRefresh:', forceRefresh);
    console.log('🚀 [React] isInitializing.current:', isInitializing.current);
    console.log('🚀 [React] isMounted.current:', isMounted.current);
    
    // Forzar isMounted a true para el botón manual
    if (forceRefresh) {
      console.log('🔧 [React] Forzando isMounted a true para refresh manual');
      isMounted.current = true;
    }
    
    // Prevenir múltiples llamadas simultáneas
    if (isInitializing.current || !isMounted.current) {
      console.log('⚠️ [React] Saliendo temprano - isInitializing o no mounted');
      return;
    }
    
    try {
      console.log('✅ [React] Continuando con loadStatus...');
      isInitializing.current = true;
      setLoading(true);
      addLog('📊 Cargando estado de la base de datos...', 'info');
      setError(null);

      console.log('📞 [React] Llamando a databaseService.getStatus...');
      // Obtener estado sin cache si es forzado
      const statusResult = await databaseService.getStatus(!forceRefresh);
      
      console.log('🔍 [React] === RESPUESTA DE DatabaseService ===');
      console.log('🔍 [React] statusResult:', statusResult);
      console.log('🔍 [React] Tipo:', typeof statusResult);
      console.log('🔍 [React] JSON:', JSON.stringify(statusResult, null, 2));
      
      if (!statusResult || !isMounted.current) {
        throw new Error('No se pudo obtener el estado de la base de datos');
      }
      
      setStatus(statusResult);

      // Log detallado del estado recibido
      addLog(`🔍 Estado detallado recibido:`, 'info');
      addLog(`  - success: ${statusResult.success}`, 'info');
      addLog(`  - installed: ${statusResult.installed}`, 'info');
      addLog(`  - status: ${statusResult.status}`, 'info');
      addLog(`  - version: ${statusResult.version || 'no disponible'}`, 'info');
      addLog(`  - serviceName: ${statusResult.serviceName || 'no disponible'}`, 'info');
      addLog(`  - error: ${statusResult.error || 'ninguno'}`, 'info');

      if (statusResult.success) {
        addLog(`✅ Estado cargado: ${statusResult.status} (Instalado: ${statusResult.installed ? 'Sí' : 'No'})`, 'success');
      } else {
        const errorMsg = statusResult.error || 'Error desconocido al obtener estado';
        addLog(`❌ Error al cargar estado: ${errorMsg}`, 'error');
      }

      // Si está instalado, obtener información
      if (statusResult.success && statusResult.installed && isMounted.current) {
        const infoResult = await databaseService.getInfo();
        if (isMounted.current) {
          setInfo(infoResult);
        }
      }
    } catch (err) {
      if (isMounted.current) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        addLog(`❌ Error en loadStatus: ${errorMessage}`, 'error');
        setError(errorMessage);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      isInitializing.current = false;
    }
  }, [addLog]);

  // Actualizar estado cada 10 segundos si autoRefresh está activo
  useEffect(() => {
    if (!autoRefresh || !isMounted.current) return;

    const interval = setInterval(async () => {
      if (!isMounted.current || isInitializing.current) return;
      
      try {
        // Usar cache en auto-refresh para reducir logs
        const newStatus = await databaseService.getStatus(true);
        
        if (isMounted.current) {
          setStatus(newStatus);
          
          if (newStatus.success && newStatus.installed) {
            const newInfo = await databaseService.getInfo();
            if (isMounted.current) {
              setInfo(newInfo);
            }
          }
        }
      } catch (err) {
        // Solo log de errores en auto-refresh
        console.error('Error silencioso en auto-refresh:', err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Cargar estado inicial - solo una vez
  useEffect(() => {
    console.log('🚀 [React] useEffect inicial ejecutándose...');
    console.log('🚀 [React] Estableciendo estado inicial...');
    
    // Asegurar que el componente esté marcado como montado
    isMounted.current = true;
    console.log('✅ [React] isMounted establecido a true');
    
    // Log inicial si no se ha hecho
    if (!hasLoggedInit.current) {
      addLog('🗄️ Gestor de base de datos iniciado', 'info');
      hasLoggedInit.current = true;
      
      // Cargar estado inicial solo la primera vez
      console.log('🚀 [React] Cargando estado inicial...');
      loadStatus();
    }
    
    // Cleanup function - SOLO al desmontar realmente
    return () => {
      console.log('🧹 [React] Componente desmontándose - estableciendo isMounted a false');
      isMounted.current = false;
    };
  }, []); // Sin dependencias para evitar re-renders

  // Configurar listener para progreso de descarga
  useEffect(() => {
    if (window.electronAPI?.database?.onDownloadProgress) {
      window.electronAPI.database.onDownloadProgress((progressData) => {
        setDownloadProgress(progressData);
        addLog(`📥 ${progressData.phase} - ${progressData.progress}%`, 'info');
      });
    }

    // Cleanup listener on unmount
    return () => {
      if (window.electronAPI?.database?.removeDownloadProgressListener) {
        window.electronAPI.database.removeDownloadProgressListener();
      }
    };
  }, [addLog]);

  const handleInstall = async () => {
    try {
      setLoading(true);
      setError(null);
      setDiagnostics(null);
      setDownloadProgress({ progress: 0, phase: 'Iniciando instalación...' });
      addLog('🔧 Iniciando proceso de instalación de MariaDB...', 'info');
      
      // Ejecutar diagnósticos primero
      addLog('🔍 Ejecutando diagnósticos del sistema...');
      setDownloadProgress({ progress: 10, phase: 'Ejecutando diagnósticos...' });
      const diagResult = await databaseService.runDiagnostics();
      setDiagnostics(diagResult);
      
      if (!diagResult.success) {
        addLog('⚠️ Se encontraron problemas en los diagnósticos', 'warn');
        diagResult.issues.forEach(issue => {
          addLog(`❌ ${issue.type.toUpperCase()}: ${issue.message}`);
        });
        
        const criticalIssues = diagResult.issues.filter(issue => 
          issue.type === 'admin' || issue.type === 'port'
        );
        
        if (criticalIssues.length > 0) {
          const errorMsg = `Problemas críticos: ${criticalIssues.map(i => i.message).join(', ')}`;
          setError(errorMsg);
          setShowDiagnostics(true);
          addLog(`🚫 Instalación cancelada: ${errorMsg}`);
          setDownloadProgress(null);
          return;
        }
      } else {
        addLog('✅ Diagnósticos completados: { success: true, issues: [] }', 'success');
      }
      
      setDownloadProgress({ progress: 20, phase: 'Descargando MariaDB...' });
      addLog('📦 Descargando e instalando MariaDB...', 'info');
      const result = await databaseService.installMariaDB();
      
      if (result.success) {
        setDownloadProgress({ progress: 100, phase: 'Instalación completada' });
        addLog('✅ MariaDB instalado exitosamente', 'success');
        addLog('🔄 Recargando estado en 2 segundos...');
        setTimeout(() => {
          loadStatus();
          setDownloadProgress(null);
        }, 2000);
      } else {
        const errorMsg = result.error || 'Error en la instalación';
        setError(errorMsg);
        setShowDiagnostics(true);
        addLog(`❌ Error en instalación: ${errorMsg}`);
        setDownloadProgress(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Excepción durante instalación: ${errorMessage}`);
      setDownloadProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostics = async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('🔍 Ejecutando diagnósticos del sistema...');
      
      const result = await databaseService.runDiagnostics();
      setDiagnostics(result);
      setShowDiagnostics(true);
      
      if (result.success) {
        addLog('✅ Diagnósticos completados: No se encontraron problemas críticos');
      } else {
        addLog('⚠️ Diagnósticos completados: Se encontraron problemas');
        result.issues.forEach(issue => {
          addLog(`❌ ${issue.type.toUpperCase()}: ${issue.message}`);
          addLog(`💡 Solución: ${issue.solution}`);
        });
        setError('Se encontraron problemas en el sistema');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error en diagnósticos: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('▶️ Iniciando servicio MariaDB...');
      
      const result = await databaseService.startService();
      
      if (result.success) {
        addLog('✅ Servicio MariaDB iniciado exitosamente');
        addLog('🔄 Recargando estado en 2 segundos...');
        setTimeout(() => loadStatus(), 2000);
      } else {
        const errorMsg = result.error || 'Error al iniciar servicio';
        setError(errorMsg);
        addLog(`❌ Error al iniciar servicio: ${errorMsg}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Excepción al iniciar servicio: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('⏹️ Deteniendo servicio MariaDB...');
      
      const result = await databaseService.stopService();
      
      if (result.success) {
        addLog('✅ Servicio MariaDB detenido exitosamente');
        addLog('🔄 Recargando estado en 2 segundos...');
        setTimeout(() => loadStatus(), 2000);
      } else {
        const errorMsg = result.error || 'Error al detener servicio';
        setError(errorMsg);
        addLog(`❌ Error al detener servicio: ${errorMsg}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Excepción al detener servicio: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenHeidiSQL = async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('🖥️ Abriendo HeidiSQL...');
      
      const result = await databaseService.openHeidiSQL();
      
      if (result.success) {
        addLog('✅ HeidiSQL abierto exitosamente');
      } else {
        const errorMsg = result.error || 'Error al abrir HeidiSQL';
        setError(errorMsg);
        addLog(`❌ Error al abrir HeidiSQL: ${errorMsg}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Excepción al abrir HeidiSQL: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!status) return 'gray';
    
    switch (status.status) {
      case 'running':
        return 'green';
      case 'stopped':
        return 'orange';
      case 'installing':
        return 'blue';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getDebugStatusColor = () => {
    if (!status) return 'gray';
    
    switch (status.status) {
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

  const getStatusText = () => {
    if (!status) return 'Cargando...';
    
    if (!status.installed) return 'No instalado';
    
    switch (status.status) {
      case 'running':
        return 'Ejecutándose';
      case 'stopped':
        return 'Detenido';
      case 'installing':
        return 'Instalando...';
      case 'error':
        return 'Error';
      default:
        return 'Estado desconocido';
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
              console.log('🔄 [React] === BOTÓN ACTUALIZAR PRESIONADO ===');
              addLog('🔄 Forzando actualización de estado...', 'info');
              console.log('🗑️ [React] Limpiando cache del servicio...');
              databaseService.clearStatusCache();
              console.log('📞 [React] Llamando a loadStatus(true)...');
              loadStatus(true);
            }}
            disabled={loading}
            className="database-manager__refresh-btn"
            title="Actualizar estado"
          >
            🔄
          </button>
          <button
            onClick={runDiagnostics}
            disabled={loading}
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
                  addLog('🔧 DevTools abiertas', 'success');
                } catch (error) {
                  addLog('❌ Error abriendo DevTools', 'error');
                }
              } else {
                addLog('❌ DevTools no disponibles', 'error');
              }
            }}
            disabled={loading}
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

      {error && (
        <div className="database-manager__error">
          ❌ {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {showDiagnostics && diagnostics && (
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
          
          {diagnostics.success ? (
            <div className="database-manager__diagnostics-success">
              ✅ No se encontraron problemas críticos
            </div>
          ) : (
            <div className="database-manager__diagnostics-issues">
              {diagnostics.issues.map((issue, index) => (
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

      <div className="database-manager__status">
        <div className="database-manager__status-indicator">
          <div 
            className={`database-manager__status-dot database-manager__status-dot--${getStatusColor()}`}
          />
          <span className="database-manager__status-text">
            {getStatusText()}
          </span>
        </div>
        
        {status?.version && (
          <div className="database-manager__version">
            Versión: {status.version}
          </div>
        )}
      </div>

      {info && info.success && (
        <div className="database-manager__info">
          <div className="database-manager__info-grid">
            <div className="database-manager__info-item">
              <span className="database-manager__info-label">Host:</span>
              <span className="database-manager__info-value">{info.host}</span>
            </div>
            <div className="database-manager__info-item">
              <span className="database-manager__info-label">Puerto:</span>
              <span className="database-manager__info-value">{info.port}</span>
            </div>
            <div className="database-manager__info-item">
              <span className="database-manager__info-label">Base de datos:</span>
              <span className="database-manager__info-value">{info.database}</span>
            </div>
            <div className="database-manager__info-item">
              <span className="database-manager__info-label">Tiempo activo:</span>
              <span className="database-manager__info-value">{formatUptime(info.uptime)}</span>
            </div>
          </div>
        </div>
      )}

      {downloadProgress && (
        <div className="database-manager__progress">
          <div className="database-manager__progress-header">
            <span className="database-manager__progress-text">
              {downloadProgress.phase}
            </span>
            <span className="database-manager__progress-percent">
              {downloadProgress.progress}%
            </span>
          </div>
          <div className="database-manager__progress-bar">
            <div 
              className="database-manager__progress-fill"
              style={{ width: `${downloadProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Debug Panel - Diseño mejorado */}
      <div className="database-manager__debug">
        <div className="database-manager__debug-header">
          <h3>🔍 Estado del Sistema</h3>
        </div>
        <div className="database-manager__debug-grid">
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Instalado:</span>
            <span className={`database-manager__debug-value ${status?.installed ? 'database-manager__debug-value--success' : 'database-manager__debug-value--error'}`}>
              {status?.installed ? '✅ Sí' : '❌ No'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Estado:</span>
            <span className={`database-manager__debug-value database-manager__debug-value--${getDebugStatusColor()}`}>
              {status?.status || 'desconocido'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">API:</span>
            <span className={`database-manager__debug-value ${status?.success ? 'database-manager__debug-value--success' : 'database-manager__debug-value--error'}`}>
              {status?.success ? '✅ Conectada' : '❌ Error'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Versión:</span>
            <span className="database-manager__debug-value database-manager__debug-value--neutral">
              {status?.version || 'N/A'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Cargando:</span>
            <span className={`database-manager__debug-value ${loading ? 'database-manager__debug-value--warning' : 'database-manager__debug-value--neutral'}`}>
              {loading ? '⏳ Sí' : '✅ No'}
            </span>
          </div>
          <div className="database-manager__debug-item">
            <span className="database-manager__debug-label">Servicio:</span>
            <span className="database-manager__debug-value database-manager__debug-value--neutral">
              {status?.serviceName || 'MariaDB'}
            </span>
          </div>
        </div>
      </div>

      <div className="database-manager__actions">
        {/* Panel unificado de estado y controles */}
        {status?.installed && (
          <div className="database-manager__control-panel">
            <div className="database-manager__status-section">
              <div className="database-manager__status-card database-manager__status-card--detected">
                <div className="database-manager__status-card-header">
                  <h3 className="database-manager__status-card-title">
                    ✅ MariaDB Detectado
                  </h3>
                  <div className={`database-manager__status-badge database-manager__status-badge--${status.status === 'running' ? 'running' : 'stopped'}`}>
                    {status.status === 'running' ? '🟢 Ejecutándose' : '🔴 Detenido'}
                  </div>
                </div>
                <div className="database-manager__status-card-content">
                  <div className="database-manager__status-card-item">
                    <span className="database-manager__status-card-label">Versión:</span>
                    <span className="database-manager__status-card-value">{status.version || 'No detectada'}</span>
                  </div>
                  <div className="database-manager__status-card-item">
                    <span className="database-manager__status-card-label">Servicio:</span>
                    <span className="database-manager__status-card-value">{status.serviceName || 'MariaDB'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="database-manager__controls-section">
              <div className="database-manager__controls-grid">
                {status.status === 'stopped' && (
                  <button
                    onClick={handleStart}
                    disabled={loading}
                    className="database-manager__btn database-manager__btn--start"
                  >
                    {loading ? '⏳ Iniciando...' : '▶️ Iniciar Servicio'}
                  </button>
                )}

                {status.status === 'running' && (
                  <button
                    onClick={handleStop}
                    disabled={loading}
                    className="database-manager__btn database-manager__btn--stop"
                  >
                    {loading ? '⏳ Deteniendo...' : '⏹️ Detener Servicio'}
                  </button>
                )}

                <button
                  onClick={handleOpenHeidiSQL}
                  disabled={loading}
                  className="database-manager__btn database-manager__btn--heidisql"
                >
                  {loading ? '⏳ Abriendo...' : '🖥️ Abrir HeidiSQL'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botón de instalación cuando no está instalado */}
        {!status?.installed && (
          <div className="database-manager__install-section">
            <button
              onClick={handleInstall}
              disabled={loading}
              className="database-manager__btn database-manager__btn--install"
            >
              {downloadProgress 
                ? `📥 ${downloadProgress.phase} (${downloadProgress.progress}%)`
                : loading 
                  ? '⏳ Instalando...' 
                  : '� Instalar MariaDB'
              }
            </button>
          </div>
        )}
      </div>

      <div className="database-manager__help">
        <div 
          className="database-manager__help-header"
          onClick={() => setShowHelp(!showHelp)}
        >
          <h3>💡 Información</h3>
          <button className="database-manager__help-toggle">
            {showHelp ? '▲' : '▼'}
          </button>
        </div>
        {showHelp && (
          <ul className="database-manager__help-content">
            <li>
              <strong>MariaDB:</strong> Base de datos MySQL compatible con almacenamiento local
            </li>
            <li>
              <strong>HeidiSQL:</strong> Interfaz visual para gestión de base de datos
            </li>
            <li>
              <strong>Puerto 3306:</strong> Puerto estándar para conexiones MySQL/MariaDB
            </li>
            <li>
              <strong>KokoDB:</strong> Base de datos principal de la aplicación
            </li>
          </ul>
        )}
      </div>
    </div>
  );
};

export default DatabaseManager;