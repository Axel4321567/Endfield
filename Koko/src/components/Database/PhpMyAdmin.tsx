import { useState, useEffect, useCallback } from 'react';
import './PhpMyAdmin.css';

interface PhpMyAdminProps {
  className?: string;
}

interface PhpMyAdminStatus {
  isRunning: boolean;
  phpInstalled: boolean;
  phpMyAdminInstalled: boolean;
  url: string | null;
  port: number | null;
  error?: string;
}

export const PhpMyAdmin: React.FC<PhpMyAdminProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<PhpMyAdminStatus>({
    isRunning: false,
    phpInstalled: false,
    phpMyAdminInstalled: false,
    url: null,
    port: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar estado inicial
  const checkStatus = useCallback(async () => {
    try {
      if (!(window as any).electron?.ipcRenderer) {
        console.error('IPC Renderer no disponible');
        return;
      }

      // Usar el nuevo handler phpmyadmin:status
      const statusResult = await (window as any).electron.ipcRenderer.invoke('phpmyadmin:status');
      console.log('📊 Estado phpMyAdmin:', statusResult);
      setStatus(statusResult);
    } catch (err) {
      console.error('Error obteniendo estado:', err);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    
    // Recargar estado cada 2 segundos si está cargando
    const interval = setInterval(() => {
      if (loading) {
        checkStatus();
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [checkStatus, loading]);

  // Iniciar servidor phpMyAdmin
  const handleStart = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!(window as any).electron?.ipcRenderer) {
        throw new Error('IPC Renderer no disponible');
      }

      const result = await (window as any).electron.ipcRenderer.invoke('phpmyadmin:start');
      console.log('🚀 Resultado start:', result);
      
      if (result.success) {
        setStatus({
          isRunning: true,
          phpInstalled: true,
          phpMyAdminInstalled: true,
          url: result.url,
          port: result.port
        });
      } else {
        setError(result.error || 'Error al iniciar phpMyAdmin');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Detener servidor phpMyAdmin
  const handleStop = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!(window as any).electron?.ipcRenderer) {
        throw new Error('IPC Renderer no disponible');
      }

      await (window as any).electron.ipcRenderer.invoke('phpmyadmin:stop');
      
      setStatus(prev => ({
        ...prev,
        isRunning: false,
        url: null
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Renderizar mensaje de instalación pendiente
  const renderInstallInstructions = () => (
    <div className="phpmyadmin-install">
      <div className="phpmyadmin-install__header">
        <h2>📦 Instalación Pendiente</h2>
        <p>Ve a la sección <strong>Extras → MySQL → Base de datos</strong> para instalar los componentes necesarios:</p>
      </div>

      <div className="phpmyadmin-install__steps">
        <div className="phpmyadmin-install__step">
          <div className="phpmyadmin-install__step-number">1</div>
          <div className="phpmyadmin-install__step-content">
            <h3>MariaDB</h3>
            <p>Sistema de base de datos compatible con MySQL</p>
            <p className="phpmyadmin-install__path">
              Estado: {status.phpInstalled ? '✅ Instalado' : '❌ No instalado'}
            </p>
          </div>
        </div>

        <div className="phpmyadmin-install__step">
          <div className="phpmyadmin-install__step-number">2</div>
          <div className="phpmyadmin-install__step-content">
            <h3>PHP Portable</h3>
            <p>Requerido para ejecutar phpMyAdmin</p>
            <p className="phpmyadmin-install__path">
              Estado: {status.phpInstalled ? '✅ Instalado' : '❌ No instalado'}
            </p>
          </div>
        </div>

        <div className="phpmyadmin-install__step">
          <div className="phpmyadmin-install__step-number">3</div>
          <div className="phpmyadmin-install__step-content">
            <h3>phpMyAdmin</h3>
            <p>Interfaz web para gestionar bases de datos</p>
            <p className="phpmyadmin-install__path">
              Estado: {status.phpMyAdminInstalled ? '✅ Instalado' : '❌ No instalado'}
            </p>
          </div>
        </div>
      </div>

      <div className="phpmyadmin-install__note">
        <strong>📌 Nota:</strong> La configuración se realizará automáticamente al iniciar phpMyAdmin.
        La conexión a MariaDB local ya estará pre-configurada.
      </div>
    </div>
  );

  // Renderizar contenido principal
  return (
    <div className={`phpmyadmin-container ${className}`}>
      {/* Header con controles */}
      <div className="phpmyadmin-header">
        <div className="phpmyadmin-header__title">
          <h1>🐘 phpMyAdmin</h1>
          <div className="phpmyadmin-header__status">
            {status.isRunning ? (
              <span className="phpmyadmin-status phpmyadmin-status--running">
                ● Servidor Activo {status.port && `(Puerto ${status.port})`}
              </span>
            ) : (
              <span className="phpmyadmin-status phpmyadmin-status--stopped">
                ○ Servidor Detenido
              </span>
            )}
          </div>
        </div>

        <div className="phpmyadmin-header__controls">
          {status.phpInstalled && status.phpMyAdminInstalled ? (
            <>
              {!status.isRunning ? (
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="phpmyadmin-btn phpmyadmin-btn--start"
                >
                  {loading ? '⏳ Iniciando...' : '▶️ Iniciar phpMyAdmin'}
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  disabled={loading}
                  className="phpmyadmin-btn phpmyadmin-btn--stop"
                >
                  {loading ? '⏳ Deteniendo...' : '⏹️ Detener Servidor'}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={checkStatus}
              className="phpmyadmin-btn phpmyadmin-btn--check"
            >
              🔄 Verificar Instalación
            </button>
          )}
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="phpmyadmin-error">
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {/* Contenido principal */}
      <div className="phpmyadmin-content">
        {!status.phpInstalled || !status.phpMyAdminInstalled ? (
          renderInstallInstructions()
        ) : status.isRunning && status.url ? (
          <iframe
            src={status.url}
            className="phpmyadmin-iframe"
            title="phpMyAdmin"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
            allow="clipboard-read; clipboard-write"
          />
        ) : (
          <div className="phpmyadmin-placeholder">
            <div className="phpmyadmin-placeholder__content">
              <h2>🚀 Listo para Iniciar</h2>
              <p>Haz clic en "Iniciar phpMyAdmin" para comenzar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
