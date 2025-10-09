import React, { useEffect, useState } from 'react';
import { UpdateService } from '../../services/UpdateService';
import type { UpdateInfo } from '../../services/UpdateService';
import './UpdateChecker.css';

interface UpdateCheckerProps {
  className?: string;
}

const UpdateChecker: React.FC<UpdateCheckerProps> = ({ className = '' }) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ hasUpdate: false });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Verificar actualizaciones al montar el componente
  useEffect(() => {
    checkForUpdates();
    
    // Verificar cada 5 minutos
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const checkForUpdates = async () => {
    setChecking(true);
    setMessage('');
    
    try {
      const info = await UpdateService.checkForNewVersion();
      setUpdateInfo(info);
      setLastChecked(new Date());
      
      if (info.hasUpdate) {
        setMessage('¡Nueva versión disponible!');
      } else {
        setMessage('Koko está actualizado');
      }
    } catch (error) {
      console.error('Error verificando actualizaciones:', error);
      setMessage('Error verificando actualizaciones');
    } finally {
      setChecking(false);
    }
  };

  const handleUpdate = async () => {
    if (!updateInfo.hasUpdate) return;
    
    setLoading(true);
    setMessage('Descargando y aplicando la nueva versión...');
    
    try {
      await UpdateService.updateToLatestVersion();
      setMessage('✅ Koko actualizado con éxito. Reiniciando en 3 segundos...');
      
      // Reiniciar la aplicación después de 3 segundos
      setTimeout(() => {
        if ((window as any).electronAPI?.system?.restartApp) {
          (window as any).electronAPI.system.restartApp();
        } else {
          setMessage('Por favor, reinicia la aplicación manualmente');
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error durante la actualización:', error);
      setMessage('❌ Error durante la actualización. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCommitPreview = (message: string) => {
    return message.split('\n')[0].substring(0, 60) + (message.length > 60 ? '...' : '');
  };

  return (
    <div className={`update-checker ${className}`}>
      <div className="update-header">
        <h3 className="update-title">
          🔄 Actualizaciones de Koko
        </h3>
        <button 
          className="check-button"
          onClick={checkForUpdates}
          disabled={checking}
          title="Verificar actualizaciones"
        >
          {checking ? '🔄' : '🔍'}
        </button>
      </div>

      <div className="update-content">
        {checking && (
          <div className="update-status checking">
            <span className="status-icon">⏳</span>
            <span>Verificando actualizaciones...</span>
          </div>
        )}

        {!checking && !updateInfo.hasUpdate && (
          <div className="update-status up-to-date">
            <span className="status-icon">✅</span>
            <span>Koko está al día</span>
          </div>
        )}

        {!checking && updateInfo.hasUpdate && (
          <div className="update-available">
            <div className="update-status has-update">
              <span className="status-icon">🆕</span>
              <span>¡Nueva versión disponible!</span>
            </div>
            
            {updateInfo.commitMessage && (
              <div className="commit-info">
                <div className="commit-message">
                  <strong>Último cambio:</strong>
                  <span>{getCommitPreview(updateInfo.commitMessage)}</span>
                </div>
                {updateInfo.author && (
                  <div className="commit-author">
                    <strong>Por:</strong> {updateInfo.author}
                  </div>
                )}
                {updateInfo.date && (
                  <div className="commit-date">
                    <strong>Fecha:</strong> {formatDate(updateInfo.date)}
                  </div>
                )}
              </div>
            )}

            <button
              className="update-button"
              onClick={handleUpdate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner">⏳</span>
                  Actualizando...
                </>
              ) : (
                <>
                  <span>📥</span>
                  Actualizar ahora
                </>
              )}
            </button>
          </div>
        )}

        {message && (
          <div className={`update-message ${
            message.includes('✅') ? 'success' : 
            message.includes('❌') ? 'error' : 'info'
          }`}>
            {message}
          </div>
        )}

        {lastChecked && (
          <div className="last-checked">
            Última verificación: {lastChecked.toLocaleTimeString('es-ES')}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateChecker;