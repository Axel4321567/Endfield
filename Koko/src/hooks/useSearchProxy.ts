import { useState, useCallback } from 'react';
import { useLogger } from '../contexts/LogsContext';

/**
 * 🔍 Hook personalizado para gestionar Search Proxy (FastAPI)
 * Maneja estado, inicio, detención y eliminación del servicio
 */
export const useSearchProxy = () => {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [port, setPort] = useState<number>(8001);
  
  const { addLog: globalAddLog } = useLogger();
  
  const addLog = useCallback((message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    globalAddLog(message, level, 'database');
  }, [globalAddLog]);

  // Cargar estado del Search Proxy
  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await (window as any).electron.ipcRenderer.invoke('search-proxy-status');
      
      if (result.success) {
        setRunning(result.running);
        setPort(result.port || 8001);
      } else {
        setRunning(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      setRunning(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Iniciar Search Proxy
  const start = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('🚀 Iniciando Search Proxy...', 'info');
      
      const result = await (window as any).electron.ipcRenderer.invoke('search-proxy-start');
      
      if (result.success) {
        setRunning(true);
        addLog(`✅ Search Proxy iniciado en puerto ${result.port || 8001}`, 'success');
      } else {
        throw new Error(result.error || 'Error al iniciar Search Proxy');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error al iniciar Search Proxy: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // Detener Search Proxy
  const stop = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('⏹️ Deteniendo Search Proxy...', 'info');
      
      const result = await (window as any).electron.ipcRenderer.invoke('search-proxy-stop');
      
      if (result.success) {
        setRunning(false);
        addLog('✅ Search Proxy detenido', 'success');
      } else {
        throw new Error(result.error || 'Error al detener Search Proxy');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error al detener Search Proxy: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // Reiniciar Search Proxy
  const restart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('🔄 Reiniciando Search Proxy...', 'info');
      
      await stop();
      // Esperar un momento antes de reiniciar
      await new Promise(resolve => setTimeout(resolve, 1000));
      await start();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error al reiniciar Search Proxy: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addLog, start, stop]);

  return {
    running,
    loading,
    error,
    port,
    loadStatus,
    start,
    stop,
    restart
  };
};
