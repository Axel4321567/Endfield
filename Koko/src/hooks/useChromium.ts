import { useState, useCallback } from 'react';
import { useLogger } from '../contexts/LogsContext';

/**
 * 🌐 Hook personalizado para gestionar Chromium
 * Maneja descarga, instalación, verificación y desinstalación de Chromium
 */
export const useChromium = () => {
  const [installed, setInstalled] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ progress: number; phase: string } | null>(null);
  
  const { addLog: globalAddLog } = useLogger();
  
  const addLog = useCallback((message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    globalAddLog(message, level, 'database');
  }, [globalAddLog]);

  // Cargar estado de Chromium
  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      addLog('📊 Verificando estado de Chromium...', 'info');
      setError(null);

      const result = await (window as any).electron.ipcRenderer.invoke('chromium-status');
      
      if (result.success) {
        setInstalled(result.installed);
        setVersion(result.version);
        setPath(result.path);
        
        if (result.installed) {
          addLog(`✅ Chromium instalado - Versión: ${result.version}`, 'success');
        } else {
          addLog('ℹ️ Chromium no está instalado', 'info');
        }
      } else {
        throw new Error(result.error || 'Error al obtener estado de Chromium');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error al verificar Chromium: ${errorMessage}`, 'error');
      setInstalled(false);
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // Descargar e instalar Chromium
  const download = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setDownloadProgress({ progress: 0, phase: 'Iniciando descarga...' });
      addLog('📥 Iniciando descarga de Chromium...', 'info');
      
      // Configurar listener para progreso de descarga
      const progressHandler = (_event: any, progress: { progress: number; phase: string }) => {
        setDownloadProgress(progress);
        addLog(`📦 ${progress.phase} (${progress.progress}%)`, 'info');
      };
      
      (window as any).electron.ipcRenderer.on('chromium-download-progress', progressHandler);
      
      try {
        const result = await (window as any).electron.ipcRenderer.invoke('chromium-download');
        
        if (result.success) {
          addLog('✅ Chromium descargado e instalado exitosamente', 'success');
          addLog(`📂 Ubicación: ${result.path}`, 'info');
          addLog(`🔖 Versión: ${result.version}`, 'info');
          
          // Actualizar estado inmediatamente con los datos de la respuesta
          console.log('🔄 [useChromium] Actualizando estado local con:', {
            installed: true,
            version: result.version,
            path: result.path
          });
          
          setInstalled(true);
          setVersion(result.version);
          setPath(result.path);
          
          addLog('✅ Estado actualizado - Chromium instalado', 'success');
        } else {
          throw new Error(result.error || result.message || 'Error en la descarga');
        }
      } finally {
        // Limpiar listener
        (window as any).electron.ipcRenderer.removeListener('chromium-download-progress', progressHandler);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error al descargar Chromium: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
      setDownloadProgress(null);
    }
  }, [addLog, loadStatus]);

  // Verificar integridad de la instalación
  const verify = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('🔍 Verificando integridad de Chromium...', 'info');
      
      const result = await (window as any).electron.ipcRenderer.invoke('chromium-verify');
      
      if (result.success) {
        addLog('✅ Chromium verificado correctamente', 'success');
        addLog(`📊 Archivos verificados: ${result.filesChecked}`, 'info');
        return true;
      } else {
        addLog(`⚠️ Problemas encontrados: ${result.error}`, 'warn');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error al verificar Chromium: ${errorMessage}`, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // Desinstalar Chromium
  const uninstall = useCallback(async () => {
    if (!window.confirm('⚠️ ¿Estás seguro de que deseas desinstalar Chromium?\n\nEsto eliminará todos los archivos descargados.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      addLog('🗑️ Desinstalando Chromium...', 'info');
      
      const result = await (window as any).electron.ipcRenderer.invoke('chromium-uninstall');
      
      if (result.success) {
        addLog('✅ Chromium desinstalado exitosamente', 'success');
        setInstalled(false);
        setVersion(null);
        setPath(null);
        await loadStatus();
      } else {
        throw new Error(result.error || result.message || 'Error al desinstalar');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error al desinstalar Chromium: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addLog, loadStatus]);

  // Limpiar caché de Chromium
  const clearCache = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('🧹 Limpiando caché de Chromium...', 'info');
      
      const result = await (window as any).electron.ipcRenderer.invoke('chromium-clear-cache');
      
      if (result.success) {
        addLog(`✅ Caché limpiado: ${result.bytesCleared} bytes liberados`, 'success');
      } else {
        throw new Error(result.error || 'Error al limpiar caché');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error al limpiar caché: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  return {
    installed,
    version,
    path,
    loading,
    error,
    downloadProgress,
    loadStatus,
    download,
    verify,
    uninstall,
    clearCache
  };
};
