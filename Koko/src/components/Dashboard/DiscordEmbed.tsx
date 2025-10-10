import React, { useEffect, useRef, useState } from 'react';
import { DiscordService } from '../../services/DiscordService';
import './DiscordEmbed.css';

interface DiscordEmbedProps {
  className?: string;
}

const DiscordEmbed: React.FC<DiscordEmbedProps> = ({ className = '' }) => {
  const webviewRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('💬 [Discord] Inicializando Discord embebido');
    
    // Inicializar servicio de Discord
    DiscordService.initialize();
    
    // Optimizar Discord automáticamente si la API está disponible
    if (window.electronAPI?.streaming?.isStreamingService) {
      const isDiscordService = window.electronAPI.streaming.isStreamingService('discord.com');
      if (isDiscordService && window.electronAPI.streaming.optimize) {
        window.electronAPI.streaming.optimize('https://discord.com/app')
          .then(() => console.log('✅ [Discord] Optimización aplicada'))
          .catch((err: Error) => console.warn('⚠️ [Discord] Error en optimización:', err));
      }
    }

    // Configurar listeners para eventos de Discord
    const handleStatusChange = (event: CustomEvent) => {
      console.log('🔄 [Discord] Estado actualizado:', event.detail);
      setIsLoaded(event.detail.connected);
    };

    const handleNotification = (event: CustomEvent) => {
      console.log('🔔 [Discord] Nueva notificación:', event.detail);
      // Aquí podrías mostrar una notificación visual en el componente
    };

    window.addEventListener('discord-status-changed', handleStatusChange as EventListener);
    window.addEventListener('discord-notification', handleNotification as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('discord-status-changed', handleStatusChange as EventListener);
      window.removeEventListener('discord-notification', handleNotification as EventListener);
      DiscordService.cleanup();
    };

    if (webviewRef.current) {
      const webview = webviewRef.current;
      
      const handleLoadStart = () => {
        console.log('🔄 [Discord] Iniciando carga...');
        setIsConnecting(true);
        setError(null);
      };

      const handleLoadStop = () => {
        console.log('✅ [Discord] Carga completada');
        setIsLoaded(true);
        setIsConnecting(false);
        setError(null);
      };

      const handleLoadError = (event: any) => {
        console.error('❌ [Discord] Error de carga:', event.errorDescription);
        setIsLoaded(false);
        setIsConnecting(false);
        setError('Error al conectar con Discord. Verifica tu conexión a internet.');
      };

      const handleDomReady = () => {
        console.log('🎯 [Discord] DOM listo');
        
        // Inyectar CSS personalizado para mejor integración
        const customCSS = `
          /* Ocultar elementos innecesarios para la integración */
          .app-2rEoOp { 
            border-radius: 8px !important; 
          }
          
          /* Mejorar la integración visual */
          .bg-primary-600 {
            background-color: var(--koko-primary) !important;
          }
        `;
        
        webview.insertCSS(customCSS).catch(console.warn);
        
        // Configurar User-Agent específico para Discord
        webview.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KokoApp/1.0.0');
      };

      // Event listeners
      webview.addEventListener('did-start-loading', handleLoadStart);
      webview.addEventListener('did-stop-loading', handleLoadStop);
      webview.addEventListener('did-fail-load', handleLoadError);
      webview.addEventListener('dom-ready', handleDomReady);

      // Cleanup
      return () => {
        webview.removeEventListener('did-start-loading', handleLoadStart);
        webview.removeEventListener('did-stop-loading', handleLoadStop);
        webview.removeEventListener('did-fail-load', handleLoadError);
        webview.removeEventListener('dom-ready', handleDomReady);
      };
    }
  }, []);

  const handleReload = async () => {
    console.log('🔄 [Discord] Recargando Discord...');
    setIsLoaded(false);
    setIsConnecting(true);
    setError(null);
    
    try {
      const success = await DiscordService.reload();
      if (!success && webviewRef.current) {
        // Fallback: recargar webview directamente
        webviewRef.current.reload();
      }
    } catch (error) {
      console.error('❌ [Discord] Error recargando:', error);
      if (webviewRef.current) {
        webviewRef.current.reload();
      }
    }
  };

  const handleOpenExternal = () => {
    console.log('🌐 [Discord] Abriendo Discord en navegador externo');
    if (window.electronAPI?.utils?.openExternal) {
      window.electronAPI.utils.openExternal('https://discord.com/app');
    }
  };

  return (
    <div className={`discord-embed-container ${className}`}>
      {/* Header con controles */}
      <div className="discord-header">
        <div className="discord-title">
          <span className="discord-icon">💬</span>
          <h3>Discord</h3>
          <span className={`status-indicator ${isLoaded ? 'connected' : 'disconnected'}`}>
            {isConnecting ? '🔄' : isLoaded ? '🟢' : '🔴'}
          </span>
        </div>
        
        <div className="discord-controls">
          <button 
            onClick={handleReload} 
            className="control-btn reload-btn"
            title="Recargar Discord"
            disabled={isConnecting}
          >
            🔄
          </button>
          <button 
            onClick={handleOpenExternal} 
            className="control-btn external-btn"
            title="Abrir en navegador externo"
          >
            🌐
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="discord-content">
        {/* Estados de carga y error */}
        {isConnecting && (
          <div className="discord-loading">
            <div className="loading-spinner"></div>
            <p>Conectando con Discord...</p>
            <small>Esto puede tomar unos segundos</small>
          </div>
        )}

        {error && (
          <div className="discord-error">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
            <button onClick={handleReload} className="retry-btn">
              Reintentar
            </button>
          </div>
        )}

        {/* WebView de Discord */}
        <webview
          ref={webviewRef}
          src="https://discord.com/app"
          allowpopups={true}
          useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          className={`discord-webview ${isLoaded ? 'loaded' : 'loading'}`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '0 0 8px 8px',
            display: isConnecting || error ? 'none' : 'block'
          }}
        />
      </div>
    </div>
  );
};

export default DiscordEmbed;