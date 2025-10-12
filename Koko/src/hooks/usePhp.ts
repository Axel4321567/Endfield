import { useState, useCallback } from 'react';
import { useLogger } from '../contexts/LogsContext';

/**
 * 🐘 Hook personalizado para gestionar PHP
 * Maneja estado, instalación y configuración de PHP
 */
export const usePhp = () => {
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

  // Cargar estado de PHP
  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      addLog('📊 Cargando estado de PHP...', 'info');
      setError(null);

      const result = await (window as any).electron.ipcRenderer.invoke('php-status');
      
      if (result.success) {
        setInstalled(result.installed);
        setVersion(result.version);
        setPath(result.path);
        addLog('✅ Estado de PHP cargado', 'success');
      } else {
        throw new Error(result.error || 'Error al obtener estado de PHP');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error al cargar estado de PHP: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // Instalar PHP
  const install = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setDownloadProgress(null);
      addLog('🔧 Iniciando proceso de instalación de PHP...', 'info');
      
      // Configurar listener para progreso de instalación
      const progressHandler = (_event: any, progress: { progress: number; phase: string }) => {
        setDownloadProgress(progress);
        addLog(`📦 ${progress.phase} (${progress.progress}%)`, 'info');
      };
      
      (window as any).electron.ipcRenderer.on('php-install-progress', progressHandler);
      
      try {
        const result = await (window as any).electron.ipcRenderer.invoke('php-install');
        
        if (result.success) {
          addLog('✅ PHP instalado exitosamente', 'success');
          addLog('🔄 Recargando estado...', 'info');
          await loadStatus();
        } else {
          throw new Error(result.message || 'Error en la instalación');
        }
      } finally {
        // Limpiar listener
        (window as any).electron.ipcRenderer.removeListener('php-install-progress', progressHandler);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Excepción durante instalación de PHP: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
      setDownloadProgress(null);
    }
  }, [addLog, loadStatus]);

  // Desinstalar PHP
  const uninstall = useCallback(async () => {
    if (!window.confirm('⚠️ ¿Estás seguro de que deseas desinstalar PHP?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      addLog('🗑️ Desinstalando PHP...', 'info');
      
      const result = await (window as any).electron.ipcRenderer.invoke('php-uninstall');
      
      if (result.success) {
        setInstalled(false);
        setVersion(null);
        setPath(null);
        addLog('✅ PHP desinstalado correctamente', 'success');
      } else {
        throw new Error(result.message || 'Error en la desinstalación');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error al desinstalar PHP: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  return {
    // Estado
    installed,
    version,
    path,
    loading,
    error,
    downloadProgress,
    // Acciones
    loadStatus,
    install,
    uninstall,
  };
};
