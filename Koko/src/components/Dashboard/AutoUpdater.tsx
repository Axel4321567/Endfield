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
      if (window.electronAPI?.autoUpdater) {
        // Por ahora usamos el package.json version
        // Podrías agregar un handler IPC para obtener app.getVersion()
        setCurrentVersion('1.2.3'); // Temporal
      }
    } catch (error) {
      console.error('Error obteniendo versión:', error);
    }
  };

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.autoUpdater) {
      alert('Auto-updater no disponible en esta versión');
      return;
    }

    setStatus('checking');
    setErrorMessage('');
    
    try {
      await window.electronAPI.autoUpdater.checkForUpdates();
      console.log('🔍 [AutoUpdater UI] Verificando actualizaciones...');
    } catch (error) {
      console.error('Error al verificar actualizaciones:', error);
      setStatus('error');
      setErrorMessage('Error al verificar actualizaciones');
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
            <button className="action-button download-button" onClick={handleCheckForUpdates}>
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
