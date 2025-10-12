import { useState, useCallback } from 'react';
import { databaseService } from '../services/DatabaseService';
import type { DatabaseStatus, DatabaseInfo, DiagnosticResult } from '../services/DatabaseService';
import { useLogger } from '../contexts/LogsContext';

/**
 * 🗄️ Hook personalizado para gestionar MariaDB
 * Maneja estado, instalación, inicio, detención y desinstalación
 */
export const useMariaDB = () => {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [info, setInfo] = useState<DatabaseInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ progress: number; phase: string } | null>(null);
  
  const { addLog: globalAddLog } = useLogger();
  
  const addLog = useCallback((message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    globalAddLog(message, level, 'database');
  }, [globalAddLog]);

  // Cargar estado de MariaDB
  const loadStatus = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      addLog('📊 Cargando estado de MariaDB...', 'info');
      setError(null);

      const statusResult = await databaseService.getStatus(!forceRefresh);
      
      if (!statusResult) {
        throw new Error('No se pudo obtener el estado de MariaDB');
      }
      
      setStatus(statusResult);

      if (statusResult.success) {
        addLog(`✅ Estado cargado: ${statusResult.status} (Instalado: ${statusResult.installed ? 'Sí' : 'No'})`, 'success');
      } else {
        const errorMsg = statusResult.error || 'Error desconocido al obtener estado';
        addLog(`❌ Error al cargar estado: ${errorMsg}`, 'error');
      }

      // Si está instalado, obtener información
      if (statusResult.success && statusResult.installed) {
        const infoResult = await databaseService.getInfo();
        if (infoResult.success) {
          setInfo(infoResult);
          addLog(`📊 Información de MariaDB cargada`, 'success');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error al cargar estado: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // Instalar MariaDB
  const install = useCallback(async () => {
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
        addLog('✅ Diagnósticos completados: sin problemas', 'success');
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
  }, [addLog, loadStatus]);

  // Iniciar servicio
  const start = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('🚀 Iniciando servicio de MariaDB...', 'info');
      
      const result = await databaseService.startService();
      
      if (result.success) {
        addLog('✅ Servicio iniciado correctamente', 'success');
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
  }, [addLog, loadStatus]);

  // Detener servicio
  const stop = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('⏹️ Deteniendo servicio de MariaDB...', 'info');
      
      const result = await databaseService.stopService();
      
      if (result.success) {
        addLog('✅ Servicio detenido correctamente', 'success');
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
  }, [addLog, loadStatus]);

  // Desinstalar
  const uninstall = useCallback(async () => {
    if (!window.confirm('⚠️ ¿Estás seguro de que deseas desinstalar MariaDB? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      addLog('🗑️ Desinstalando MariaDB...', 'info');
      
      const result = await databaseService.uninstallMariaDB();
      
      if (result.success) {
        addLog('✅ MariaDB desinstalado correctamente', 'success');
        setTimeout(() => loadStatus(), 2000);
      } else {
        const errorMsg = result.error || 'Error al desinstalar';
        setError(errorMsg);
        addLog(`❌ Error al desinstalar: ${errorMsg}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Excepción al desinstalar: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [addLog, loadStatus]);

  // Ejecutar diagnósticos
  const runDiagnostics = useCallback(async () => {
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
  }, [addLog]);

  return {
    // Estado
    status,
    info,
    loading,
    error,
    diagnostics,
    showDiagnostics,
    downloadProgress,
    // Acciones
    loadStatus,
    install,
    start,
    stop,
    uninstall,
    runDiagnostics,
    // Setters para UI
    setShowDiagnostics,
    setDownloadProgress,
  };
};
