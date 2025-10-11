import React, { useState, useEffect } from 'react';
import { Rocket, Settings } from 'lucide-react';

// Componentes
import ProgressBar from '@components/ProgressBar';
import UpdateButton from '@components/UpdateButton';

// Servicios
import { VersionService, VersionInfo } from '@services/VersionService';
import { UpdateService, UpdateProgress } from '@services/UpdateService';
import { LaunchService } from '@services/LaunchService';

const App: React.FC = () => {
  // Estados principales
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    current: '0.0.0', // Empezar con versión 0 hasta verificar instalación
    latest: '1.2.12',
    hasUpdate: false,
    channel: 'stable'
  });
  
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null); // null = verificando, true = instalado, false = no instalado
  
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress>({
    phase: 'checking',
    message: 'Listo para verificar actualizaciones'
  });
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [browserRunning, setBrowserRunning] = useState(false);

  // Verificar conectividad
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Verificación inicial de instalación
  useEffect(() => {
    const checkInitialInstallation = async () => {
      try {
        // Verificar si Koko Browser está instalado usando LaunchService
        const installed = await LaunchService.isBrowserInstalled();
        
        setIsInstalled(installed);
        
        if (!installed) {
          // Si no está instalado, marcar como necesitando descarga
          setVersionInfo(prev => ({
            ...prev,
            current: '0.0.0',
            hasUpdate: true
          }));
          
          setUpdateProgress({
            phase: 'complete',
            message: 'Koko Browser no está instalado. Haz clic en "Descargar" para instalarlo.'
          });
        } else {
          // Si está instalado, obtener la versión real instalada
          const installedVersion = await LaunchService.getInstalledVersion();
          const currentVersion = installedVersion || '1.0.0'; // Fallback si no se puede determinar
          
          setVersionInfo(prev => ({
            ...prev,
            current: currentVersion
          }));
          
          // Verificar actualizaciones si hay conexión
          if (isOnline) {
            checkForUpdates(false);
          } else {
            setUpdateProgress({
              phase: 'complete',
              message: `Koko Browser v${currentVersion} está instalado. Sin conexión para verificar actualizaciones.`
            });
          }
        }
      } catch (error) {
        console.error('Error verificando instalación:', error);
        // En caso de error, asumir que no está instalado
        setIsInstalled(false);
        setVersionInfo(prev => ({
          ...prev,
          current: '0.0.0',
          hasUpdate: true
        }));
        
        setUpdateProgress({
          phase: 'error',
          message: 'Error verificando instalación. Haz clic en "Descargar" para instalar Koko Browser.',
          error: 'Error de verificación'
        });
      }
    };
    
    checkInitialInstallation();
  }, [isOnline]);

  // Verificación automática cada 2 minutos (solo si está instalado)
  useEffect(() => {
    if (!isOnline || isLoading || versionInfo.hasUpdate || isInstalled === false) {
      return;
    }

    // Configurar intervalo para verificación automática
    const intervalId = setInterval(async () => {
      if (isOnline && !isLoading) {
        try {
          // Verificación automática (sin forzar)
          const versionData = await VersionService.checkForUpdates(false);
          
          if (versionData.hasUpdate && !versionInfo.hasUpdate) {
            // Solo actualizar si encontramos una nueva actualización
            setVersionInfo({
              current: versionData.current,
              latest: versionData.latest,
              hasUpdate: true,
              channel: versionData.channel
            });
            
            // Mostrar notificación sutil
            setUpdateProgress({
              phase: 'complete',
              message: `Nueva versión disponible: v${versionData.latest}`
            });
          }
        } catch (error) {
          console.error('Error en verificación automática:', error);
        }
      }
    }, 2 * 60 * 1000); // 2 minutos

    return () => clearInterval(intervalId);
  }, [isOnline, isLoading, versionInfo.hasUpdate, isInstalled]);

  // Función para verificar actualizaciones manualmente
  const checkForUpdates = async (manual: boolean = false) => {
    if (!isOnline && manual) {
      setUpdateProgress({
        phase: 'error',
        message: 'Sin conexión a internet',
        error: 'No hay conexión'
      });
      return;
    }

    if (!isOnline) {
      return;
    }

    setIsLoading(true);
    setUpdateProgress({
      phase: 'checking',
      message: manual ? 'Verificando actualizaciones...' : 'Buscando actualizaciones...'
    });

    try {
      // Forzar verificación si es manual
      const versionData = await VersionService.checkForUpdates(manual);
      
      // Actualizar timestamp de última verificación
      setLastCheck(new Date());
      
      if (versionData.hasUpdate) {
        setVersionInfo({
          current: versionData.current,
          latest: versionData.latest,
          hasUpdate: true,
          channel: versionData.channel
        });
        setUpdateProgress({
          phase: 'complete',
          message: `Nueva versión encontrada: v${versionData.latest} (actual: v${versionData.current})`
        });
      } else {
        setUpdateProgress({
          phase: 'complete',
          message: 'No hay actualizaciones disponibles - Estás usando la última versión'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setUpdateProgress({
        phase: 'error',
        message: `Error verificando actualizaciones: ${errorMessage}`,
        error: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!versionInfo.hasUpdate) {
      return;
    }

    setIsLoading(true);

    try {
      await UpdateService.downloadAndInstallUpdate(
        `https://github.com/Axel4321567/Endfield/releases/download/v${versionInfo.latest}/Koko-Browser-Setup-${versionInfo.latest}.exe`,
        '', // Hash opcional por ahora
        (progress) => {
          setUpdateProgress({
            phase: progress.phase,
            message: progress.message,
            progress: progress.progress
          });
        }
      );

      // Actualizar el estado para mostrar que ya no hay actualización pendiente
      setVersionInfo({
        current: versionInfo.latest, // Ahora la versión actual es la última
        latest: versionInfo.latest,
        hasUpdate: false, // Ya no hay actualización pendiente
        channel: versionInfo.channel
      });

      // Marcar como instalado después de la descarga exitosa
      setIsInstalled(true);

      setUpdateProgress({
        phase: 'complete',
        message: 'Koko Browser instalado exitosamente. ¡Ya puedes iniciarlo!'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setUpdateProgress({
        phase: 'error',
        message: `Error actualizando: ${errorMessage}`,
        error: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunch = async () => {
    setIsLoading(true);
    
    try {
      const processInfo = await LaunchService.launchBrowser();
      
      if (processInfo?.pid) {
        // El launcher permanece abierto después de iniciar Koko Browser
        setBrowserRunning(true);
        setUpdateProgress({
          phase: 'complete',
          message: `Koko Browser iniciado exitosamente (PID: ${processInfo.pid}). El launcher permanece activo.`
        });
        
        // Verificar periódicamente si el browser sigue ejecutándose
        const checkInterval = setInterval(async () => {
          try {
            const isRunning = await LaunchService.isBrowserRunning();
            if (!isRunning) {
              setBrowserRunning(false);
              setUpdateProgress({
                phase: 'complete',
                message: 'Koko Browser se ha cerrado. Listo para iniciar de nuevo.'
              });
              clearInterval(checkInterval);
            }
          } catch (error) {
            // Si hay error verificando, asumir que se cerró
            setBrowserRunning(false);
            clearInterval(checkInterval);
          }
        }, 5000); // Verificar cada 5 segundos
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      // Si Koko Browser no está instalado, intentar descargarlo automáticamente
      if (errorMessage.includes('no está instalado') || errorMessage.includes('No se pudo encontrar')) {
        setUpdateProgress({
          phase: 'checking',
          message: 'Koko Browser no está instalado. Descargando la última versión...'
        });
        
        try {
          // Obtener la última versión disponible
          const versionData = await VersionService.checkForUpdates(true);
          
          if (versionData.latest) {
            await UpdateService.downloadAndInstallUpdate(
              `https://github.com/Axel4321567/Endfield/releases/download/v${versionData.latest}/Koko-Browser-Setup-${versionData.latest}.exe`,
              '', // Hash opcional
              (progress) => {
                setUpdateProgress({
                  phase: progress.phase,
                  message: progress.message,
                  progress: progress.progress
                });
              }
            );
            
            // Actualizar el estado después de la instalación
            setVersionInfo({
              current: versionData.latest,
              latest: versionData.latest,
              hasUpdate: false,
              channel: versionData.channel || 'stable'
            });
            
            // Marcar como instalado después de la descarga exitosa
            setIsInstalled(true);
            
            setUpdateProgress({
              phase: 'complete',
              message: 'Koko Browser instalado exitosamente. Puedes intentar iniciarlo ahora.'
            });
          } else {
            throw new Error('No se pudo obtener información de la última versión');
          }
        } catch (downloadError) {
          const downloadErrorMessage = downloadError instanceof Error ? downloadError.message : 'Error desconocido';
          setUpdateProgress({
            phase: 'error',
            message: `Error descargando Koko Browser: ${downloadErrorMessage}`,
            error: downloadErrorMessage
          });
        }
      } else {
        setUpdateProgress({
          phase: 'error',
          message: `Error iniciando Koko Browser: ${errorMessage}`,
          error: errorMessage
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    setUpdateProgress({
      phase: 'checking',
      message: 'Reintentando verificación...'
    });
    
    try {
      await checkForUpdates(true);
    } catch (error) {
      setUpdateProgress({
        phase: 'error',
        message: 'Error al reintentar. Verifica tu conexión.',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  return (
    <div className="w-full h-full text-white overflow-hidden relative" style={{ background: '#1a1a1e' }}>
      {/* Fondo con gradiente Opera */}
      <div className="absolute inset-0 sidebar-gradient" />
      
      {/* Contenedor principal con layout horizontal */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header estilo Opera */}
        <div className="drag-region px-4 py-3" style={{ background: 'rgba(26, 26, 30, 0.95)', borderBottom: '1px solid rgba(60, 60, 67, 0.3)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Rocket className="w-3 h-3 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">Koko Launcher</h1>
                <p className="text-xs text-gray-400">v{versionInfo.current}</p>
              </div>
            </div>
            
            {/* Indicador de estado estilo Opera */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-xs text-gray-300">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Contenido principal - Layout horizontal como Wuthering Waves */}
        <div className="flex-1 flex">
          {/* Panel lateral izquierdo - Noticias/Avisos */}
          <div className="w-80 flex flex-col" style={{ background: 'rgba(20, 20, 24, 0.9)', borderRight: '1px solid rgba(60, 60, 67, 0.3)' }}>
            {/* Cabecera del panel lateral */}
            <div className="p-4 border-b border-gray-700/30">
              <h2 className="text-sm font-semibold text-white mb-2">Noticias</h2>
              <div className="flex space-x-2 text-xs">
                <button className="px-3 py-1 bg-orange-500 text-white rounded">Aviso</button>
                <button className="px-3 py-1 text-gray-400 hover:text-white">Noticias</button>
              </div>
            </div>
            
            {/* Lista de noticias/avisos */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {/* Info de versión */}
              <div className="glass-container p-3 mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-300">Nueva version: {versionInfo.channel}</span>
                    {versionInfo.hasUpdate && (
                      <div className="text-xs text-orange-400 mt-1">
                        {versionInfo.current} → {versionInfo.latest}
                      </div>
                    )}
                    {/* Indicador de última verificación */}
                    {lastCheck && (
                      <div className="text-xs text-gray-500 mt-1">
                        Última verificación: {lastCheck.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  {versionInfo.hasUpdate && (
                    <span className="px-2 py-1 text-xs bg-orange-500 text-white rounded-full">
                      ¡Actualización!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Área principal derecha */}
          <div className="flex-1 flex flex-col">
            {/* Contenido principal */}
            <div className="flex-1 p-6 space-y-4">
              {/* Progreso estilo Opera */}
              {(updateProgress.phase !== 'checking' || isLoading) && (
                <div className="glass-container p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-200">{updateProgress.message}</span>
                      {updateProgress.progress && (
                        <span className="text-xs text-orange-400 font-mono">
                          {Math.round(updateProgress.progress.percentage)}%
                        </span>
                      )}
                    </div>
                    <ProgressBar
                      progress={updateProgress.progress || {
                        downloaded: 0,
                        total: 0,
                        percentage: 0,
                        speed: 0,
                        timeRemaining: 0
                      }}
                      phase={updateProgress.message}
                      isIndeterminate={['checking', 'validating', 'installing'].includes(updateProgress.phase)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer con botones como Wuthering Waves */}
            <div className="p-6 pt-0">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => checkForUpdates(true)}
                  disabled={isLoading || !isOnline}
                  className="glass-button px-4 py-2 text-sm flex items-center space-x-2 no-drag"
                >
                  <Settings className="w-4 h-4" />
                  <span>Verificar</span>
                </button>
                
                <div className="flex-1 max-w-xs">
                  <UpdateButton
                    hasUpdate={versionInfo.hasUpdate}
                    isLoading={isLoading}
                    phase={updateProgress.phase}
                    onUpdate={handleUpdate}
                    onLaunch={handleLaunch}
                    onRetry={handleRetry}
                    disabled={!isOnline && versionInfo.hasUpdate}
                    isInstalled={isInstalled}
                    browserRunning={browserRunning}
                  />
                </div>
              </div>
              
              {/* Footer copyright */}
              <div className="text-xs text-gray-500 text-center mt-4">
                © 2024 Koko Browser Team
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;