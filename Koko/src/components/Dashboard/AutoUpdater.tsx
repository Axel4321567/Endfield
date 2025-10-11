import React, { useEffect, useState } from 'react';
import './AutoUpdater.css';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error';

const AutoUpdater: React.FC = () => {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    // Verificar si estamos en Electron
    if (!window.electronAPI?.autoUpdater) {
      console.warn('⚠️ Auto-updater no disponible (no estamos en Electron)');
      return;
    }

    // Obtener versión actual
    fetchCurrentVersion();

    // Configurar listeners de eventos
    const { autoUpdater } = window.electronAPI;

    autoUpdater.onUpdateAvailable((info: UpdateInfo) => {
      console.log('🆕 [AutoUpdater UI] Actualización disponible:', info);
      setStatus('available');
      setUpdateInfo(info);
      setLastChecked(new Date());
    });

    autoUpdater.onDownloadProgress((progressInfo: DownloadProgress) => {
      console.log('⬇️ [AutoUpdater UI] Progreso:', progressInfo.percent + '%');
      setStatus('downloading');
      setProgress(progressInfo);
    });

    autoUpdater.onUpdateDownloaded((info: UpdateInfo) => {
      console.log('✅ [AutoUpdater UI] Actualización descargada:', info);
      setStatus('downloaded');
      setUpdateInfo(info);
      setProgress(null);
    });

    autoUpdater.onUpdateNotAvailable((info: UpdateInfo) => {
      console.log('✅ [AutoUpdater UI] Ya estás actualizado:', info);
      setStatus('not-available');
      setUpdateInfo(info);
      setLastChecked(new Date());
    });

    autoUpdater.onError((error: any) => {
      console.error('❌ [AutoUpdater UI] Error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Error desconocido');
      setLastChecked(new Date());
    });

    // Cleanup al desmontar
    return () => {
      autoUpdater.removeAllListeners();
    };
  }, []);

  const fetchCurrentVersion = async () => {
    try {
      if (window.electronAPI?.autoUpdater?.getVersion) {
        const version = await window.electronAPI.autoUpdater.getVersion();
        setCurrentVersion(version);
        console.log('📦 [AutoUpdater UI] Versión actual:', version);
      } else {
        console.warn('⚠️ [AutoUpdater UI] getVersion no disponible');
      }
    } catch (error) {
      console.error('❌ [AutoUpdater UI] Error obteniendo versión:', error);
    }
  };

  const handleCheckForUpdates = async () => {
    setStatus('checking');
    setErrorMessage('');
    setLastChecked(new Date());
    
    try {
      // Verificar usando el backend (evita rate limit)
      console.log('🔍 [AutoUpdater UI] Verificando actualizaciones desde el backend...');
      
      if (!window.electronAPI?.autoUpdater?.checkGitHubUpdate) {
        throw new Error('API de actualización no disponible');
      }

      const result = await window.electronAPI.autoUpdater.checkGitHubUpdate();
      
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido');
      }

      const latestVersion = result.version!;
      const currentVer = currentVersion;

      console.log('📦 [AutoUpdater UI] Versión actual:', currentVer);
      console.log('📦 [AutoUpdater UI] Última versión:', latestVersion);

      // Comparar versiones correctamente (semver)
      const compareVersions = (v1: string, v2: string): number => {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
          const part1 = parts1[i] || 0;
          const part2 = parts2[i] || 0;
          
          if (part1 > part2) return 1;
          if (part1 < part2) return -1;
        }
        return 0;
      };

      const comparison = compareVersions(latestVersion, currentVer);

      if (comparison > 0) {
        // Hay actualización disponible (versión remota es mayor)
        setStatus('available');
        setUpdateInfo({
          version: latestVersion,
          releaseDate: result.releaseDate,
          releaseNotes: result.releaseNotes || 'Nueva versión disponible'
        });
        console.log('🆕 [AutoUpdater UI] Nueva versión disponible:', latestVersion);
        
        // Iniciar descarga automática si tenemos electron-updater
        if (window.electronAPI?.autoUpdater?.checkForUpdates) {
          window.electronAPI.autoUpdater.checkForUpdates();
        }
      } else {
        // Ya está actualizado
        setStatus('not-available');
        setUpdateInfo({
          version: currentVer
        });
        console.log('✅ [AutoUpdater UI] Ya estás en la última versión');
      }
    } catch (error) {
      console.error('❌ [AutoUpdater UI] Error al verificar actualizaciones:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  // Función para descargar la actualización
  const handleDownloadUpdate = async () => {
    if (!window.electronAPI?.autoUpdater) {
      setStatus('error');
      setErrorMessage('API de actualización no disponible');
      return;
    }

    try {
      console.log('⬇️ [AutoUpdater UI] Iniciando descarga de actualización...');
      
      // Verificar si estamos en modo desarrollo
      const isDev = await window.electronAPI.autoUpdater.isDev();
      
      if (isDev) {
        // En modo dev, abrir la página de GitHub releases
        console.log('🌐 [AutoUpdater UI] Modo desarrollo: abriendo página de releases en GitHub');
        window.open('https://github.com/Axel4321567/Endfield/releases/latest', '_blank');
        setStatus('idle');
      } else {
        // En producción, usar electron-updater
        setStatus('downloading');
        setErrorMessage('');
        await window.electronAPI.autoUpdater.checkForUpdates();
      }
    } catch (error) {
      console.error('❌ [AutoUpdater UI] Error al descargar actualización:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error al descargar actualización');
    }
  };

  const handleInstallUpdate = async () => {
    if (!window.electronAPI?.autoUpdater) {
      return;
    }

    try {
      await window.electronAPI.autoUpdater.installUpdate();
      console.log('📥 [AutoUpdater UI] Instalando actualización...');
    } catch (error) {
      console.error('Error al instalar actualización:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIcon = (): string => {
    switch (status) {
      case 'checking': return '🔍';
      case 'available': return '🆕';
      case 'downloading': return '⬇️';
      case 'downloaded': return '✅';
      case 'not-available': return '✅';
      case 'error': return '❌';
      default: return '🔄';
    }
  };

  const getStatusText = (): string => {
    switch (status) {
      case 'checking': return 'Verificando actualizaciones...';
      case 'available': return '¡Nueva versión disponible!';
      case 'downloading': return 'Descargando actualización...';
      case 'downloaded': return 'Actualización lista para instalar';
      case 'not-available': return 'Koko está actualizado';
      case 'error': return 'Error al verificar actualizaciones';
      default: return 'Verificación automática activa';
    }
  };

  const getStatusClass = (): string => {
    switch (status) {
      case 'checking': return 'status-checking';
      case 'available': return 'status-available';
      case 'downloading': return 'status-downloading';
      case 'downloaded': return 'status-downloaded';
      case 'not-available': return 'status-updated';
      case 'error': return 'status-error';
      default: return 'status-idle';
    }
  };

  return (
    <div className="auto-updater-card">
      <div className="auto-updater-header">
        <h3 className="auto-updater-title">
          <span className="title-icon">🔄</span>
          Auto-Actualización
        </h3>
        <button
          className="check-button"
          onClick={handleCheckForUpdates}
          disabled={status === 'checking' || status === 'downloading'}
          title="Verificar actualizaciones"
        >
          {status === 'checking' ? '⏳' : '🔍'}
        </button>
      </div>

      <div className="auto-updater-content">
        {/* Estado actual */}
        <div className={`status-badge ${getStatusClass()}`}>
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{getStatusText()}</span>
        </div>

        {/* Información de versión */}
        <div className="version-info">
          <div className="version-row">
            <span className="version-label">Versión actual:</span>
            <span className="version-value">{currentVersion}</span>
          </div>
          {updateInfo && status === 'available' && (
            <div className="version-row">
              <span className="version-label">Nueva versión:</span>
              <span className="version-value highlight">{updateInfo.version}</span>
            </div>
          )}
        </div>

        {/* Barra de progreso */}
        {status === 'downloading' && progress && (
          <div className="download-progress">
            <div className="progress-header">
              <span className="progress-text">
                {Math.round(progress.percent)}%
              </span>
              <span className="progress-size">
                {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
              </span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Notas de la versión */}
        {updateInfo?.releaseNotes && status === 'available' && (
          <div className="release-notes">
            <h4 className="release-notes-title">📋 Novedades:</h4>
            <p className="release-notes-content">
              {updateInfo.releaseNotes.substring(0, 150)}
              {updateInfo.releaseNotes.length > 150 ? '...' : ''}
            </p>
          </div>
        )}

        {/* Mensaje de error */}
        {status === 'error' && errorMessage && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{errorMessage}</span>
          </div>
        )}

        {/* Botones de acción */}
        <div className="action-buttons">
          {status === 'available' && (
            <button className="action-button download-button" onClick={handleDownloadUpdate}>
              <span>⬇️</span>
              Descargar actualización
            </button>
          )}

          {status === 'downloaded' && (
            <button className="action-button install-button" onClick={handleInstallUpdate}>
              <span>🚀</span>
              Instalar y reiniciar
            </button>
          )}

          {status === 'error' && (
            <button className="action-button retry-button" onClick={handleCheckForUpdates}>
              <span>🔄</span>
              Reintentar
            </button>
          )}
        </div>

        {/* Información adicional */}
        <div className="update-info">
          {lastChecked && (
            <div className="info-row">
              <span className="info-icon">🕐</span>
              <span className="info-text">
                Última verificación: {lastChecked.toLocaleTimeString('es-ES')}
              </span>
            </div>
          )}
          <div className="info-row">
            <span className="info-icon">⏱️</span>
            <span className="info-text">
              Verificación automática cada 2 minutos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoUpdater;
