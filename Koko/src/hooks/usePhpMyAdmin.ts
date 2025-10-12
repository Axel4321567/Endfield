import { useState, useCallback } from 'react';
import { useLogger } from '../contexts/LogsContext';

/**
 * 🛠️ Hook personalizado para gestionar phpMyAdmin
 * Maneja estado, instalación y configuración de phpMyAdmin
 */
export const usePhpMyAdmin = () => {
  const [installed, setInstalled] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [configPath, setConfigPath] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ progress: number; phase: string } | null>(null);
  
  const { addLog: globalAddLog } = useLogger();
  
  const addLog = useCallback((message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    globalAddLog(message, level, 'database');
  }, [globalAddLog]);

  // Cargar estado de phpMyAdmin
  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      addLog('📊 Cargando estado de phpMyAdmin...', 'info');
      setError(null);

      if (!(window as any).electron?.ipcRenderer) {
        throw new Error('IPC Renderer no disponible');
      }

      const result = await (window as any).electron.ipcRenderer.invoke('phpmyadmin-status');
      
      setInstalled(result.installed);
      setVersion(result.version || null);
      setPath(result.path || null);
      setConfigPath(result.configPath || null);
      
      addLog(`✅ phpMyAdmin ${result.installed ? 'instalado' : 'no instalado'}`, 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error al cargar estado de phpMyAdmin: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // Instalar phpMyAdmin
  const install = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setDownloadProgress(null);
      addLog('🔧 [phpMyAdmin] Iniciando instalación...', 'info');
      
      if (!(window as any).electron?.ipcRenderer) {
        throw new Error('IPC Renderer no disponible');
      }

      // Configurar listener para progreso
      const progressHandler = (_event: any, progress: { progress: number; phase: string }) => {
        setDownloadProgress(progress);
        addLog(`📦 ${progress.phase} (${progress.progress}%)`, 'info');
      };

      (window as any).electron.ipcRenderer.on('phpmyadmin-install-progress', progressHandler);
      
      const result = await (window as any).electron.ipcRenderer.invoke('phpmyadmin-install');
      
      // Remover listener
      (window as any).electron.ipcRenderer.removeListener('phpmyadmin-install-progress', progressHandler);
      
      if (result.success) {
        addLog(`✅ phpMyAdmin ${result.version || ''} instalado exitosamente`, 'success');
        await loadStatus();
      } else {
        throw new Error(result.message || 'Error al instalar phpMyAdmin');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error instalando phpMyAdmin: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
      setDownloadProgress(null);
    }
  }, [addLog, loadStatus]);

  // Desinstalar phpMyAdmin
  const uninstall = useCallback(async () => {
    if (!window.confirm('⚠️ ¿Estás seguro de que deseas desinstalar phpMyAdmin?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      addLog('🗑️ [phpMyAdmin] Desinstalando...', 'info');
      
      if (!(window as any).electron?.ipcRenderer) {
        throw new Error('IPC Renderer no disponible');
      }
      
      const result = await (window as any).electron.ipcRenderer.invoke('phpmyadmin-uninstall');
      
      if (result.success) {
        setInstalled(false);
        setVersion(null);
        setPath(null);
        setConfigPath(null);
        addLog('✅ phpMyAdmin desinstalado correctamente', 'success');
      } else {
        throw new Error(result.message || 'Error al desinstalar phpMyAdmin');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      addLog(`❌ Error al desinstalar phpMyAdmin: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // Abrir phpMyAdmin en el navegador
  const openInBrowser = useCallback(() => {
    if (!installed) {
      addLog('⚠️ phpMyAdmin no está instalado', 'warn');
      return;
    }
    
    try {
      addLog('🌐 Abriendo phpMyAdmin en el navegador...', 'info');
      
      // TODO: Implementar apertura en navegador
      // window.electron.ipcRenderer.send('open-phpmyadmin');
      
      addLog('✅ phpMyAdmin abierto', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      addLog(`❌ Error al abrir phpMyAdmin: ${errorMessage}`, 'error');
    }
  }, [installed, addLog]);

  return {
    // Estado
    installed,
    version,
    path,
    configPath,
    loading,
    error,
    downloadProgress,
    // Acciones
    loadStatus,
    install,
    uninstall,
    openInBrowser,
  };
};
