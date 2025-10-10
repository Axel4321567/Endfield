import React, { useEffect, useRef, useState } from 'react';
import { DiscordService } from '../../services/DiscordService';
import './DiscordPanel.css';

interface DiscordPanelProps {
  className?: string;
}

const DiscordPanel: React.FC<DiscordPanelProps> = ({ className = '' }) => {
  const webviewRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    console.log('💬 [Discord Panel] Inicializando Discord panel como Opera');
    
    // Inicializar servicio de Discord
    DiscordService.initialize();

    // Configurar listeners para eventos de Discord
    const handleStatusChange = (event: CustomEvent) => {
      console.log('🔄 [Discord] Estado actualizado:', event.detail);
      setIsLoaded(event.detail.connected);
    };

    const handleNotification = (event: CustomEvent) => {
      console.log('🔔 [Discord] Nueva notificación:', event.detail);
      setNotifications(prev => prev + 1);
      
      // Auto-reducir notificaciones después de 5 segundos
      setTimeout(() => {
        setNotifications(prev => Math.max(0, prev - 1));
      }, 5000);
    };

    window.addEventListener('discord-status-changed', handleStatusChange as EventListener);
    window.addEventListener('discord-notification', handleNotification as EventListener);

    if (webviewRef.current) {
      const webview = webviewRef.current;
      
      const handleLoadStart = () => {
        console.log('🔄 [Discord Panel] Iniciando carga...');
        setIsConnecting(true);
        setError(null);
      };

      const handleLoadStop = () => {
        console.log('✅ [Discord Panel] Carga completada');
        setIsLoaded(true);
        setIsConnecting(false);
        setError(null);
      };

      const handleLoadError = (event: any) => {
        console.error('❌ [Discord Panel] Error de carga:', event.errorDescription);
        setIsLoaded(false);
        setIsConnecting(false);
        setError('No se pudo conectar con Discord');
      };

      const handleDomReady = () => {
        console.log('🎯 [Discord Panel] DOM listo, aplicando estilos Opera-style');
        
        // JavaScript para forzar altura completa
        const forceFullHeightScript = `
          // Forzar altura completa
          function forceFullHeight() {
            const elements = [
              document.documentElement,
              document.body,
              document.getElementById('app-mount'),
              document.querySelector('.app-2rEoOp'),
              document.querySelector('.appMount-3lHmkl'),
              document.querySelector('.wrapper-1_HaEi'),
              document.querySelector('.wrapper-3NnKdC'),
              document.querySelector('.loginContainer-2pWx8m')
            ].filter(Boolean);
            
            elements.forEach(el => {
              if (el) {
                el.style.height = '100vh';
                el.style.minHeight = '100vh';
                el.style.maxHeight = '100vh';
                el.style.margin = '0';
                el.style.padding = '0';
                el.style.overflow = 'hidden';
              }
            });
            
            // Ocultar modales de 2FA
            const modals = document.querySelectorAll('.modal-yWgWj-, .backdrop-1wrmKB');
            modals.forEach(modal => modal.style.display = 'none');
          }
          
          // Ejecutar inmediatamente y cada 500ms
          forceFullHeight();
          setInterval(forceFullHeight, 500);
        `;
        
        try {
          webview.executeJavaScript(forceFullHeightScript);
        } catch (e) {
          console.warn('No se pudo ejecutar JavaScript:', e);
        }
        
        // CSS específico para que Discord se vea como en Opera
        const operaStyleCSS = `
          /* Remover márgenes y paddings innecesarios */
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important;
            background: #2f3136 !important;
            height: 100vh !important;
            min-height: 100vh !important;
            max-height: 100vh !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
          }
          
          /* Contenedor raíz */
          #app-mount {
            height: 100vh !important;
            min-height: 100vh !important;
            max-height: 100vh !important;
            width: 100vw !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
          }
          
          /* Hacer que la aplicación ocupe todo el espacio */
          .app-2rEoOp, .appMount-3lHmkl {
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            max-height: none !important;
            transform: none !important;
            min-height: 100vh !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
          }
          
          /* Contenedor principal de login/app */
          .wrapper-1_HaEi, .wrapper-3NnKdC {
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: 100vh !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
          }
          
          /* Login container */
          .loginContainer-2pWx8m {
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 100vh !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
          }
          }
          
          /* Hacer que la aplicación ocupe todo el espacio */
          .app-2rEoOp, .appMount-3lHmkl {
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            max-height: none !important;
            transform: none !important;
            min-height: 100vh !important;
          }
          
          /* Contenedor raíz */
          #app-mount {
            height: 100vh !important;
            min-height: 100vh !important;
          }
          
          /* Contenedor principal de login/app */
          .wrapper-1_HaEi, .wrapper-3NnKdC {
            width: 100% !important;
            height: 100vh !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: 100vh !important;
          }
          
          /* Login container */
          .loginContainer-2pWx8m {
            width: 100% !important;
            height: 100vh !important;
            max-width: none !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 100vh !important;
          }
          
          /* Formulario de login más grande */
          .card-3RzMcx {
            width: 90% !important;
            max-width: 600px !important;
            margin: 0 !important;
            padding: 40px !important;
            background: #36393f !important;
            border-radius: 12px !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
          }
          
          /* Campos de entrada más grandes */
          .inputDefault-_djjkz {
            height: 48px !important;
            border-radius: 8px !important;
            border: 1px solid #4f545c !important;
            background: #40444b !important;
            color: #dcddde !important;
            font-size: 16px !important;
            padding: 0 16px !important;
          }
          
          .inputFocused-1lu-bh {
            border-color: #5865f2 !important;
            box-shadow: 0 0 0 2px rgba(88, 101, 242, 0.3) !important;
          }
          
          /* Botones más grandes */
          .button-38aScr {
            height: 48px !important;
            border-radius: 8px !important;
            font-weight: 600 !important;
            font-size: 16px !important;
            padding: 0 24px !important;
          }
          
          /* Textos más grandes */
          .title-3sZWYQ {
            font-size: 28px !important;
            margin-bottom: 24px !important;
          }
          
          .text-sm-normal-3Y4-Dq {
            font-size: 16px !important;
          }
          
          /* Cuando esté logueado - ajustar sidebar de servidores */
          .sidebar-2K8pFh .scrollerBase-289Jih {
            width: 72px !important;
          }
          
          .sidebar-2K8pFh {
            width: 72px !important;
            min-width: 72px !important;
          }
          
          /* Ajustar el contenedor principal cuando esté logueado */
          .container-1r6BKw {
            margin-left: 72px !important;
          }
          
          /* Panel de canales más estrecho cuando esté logueado */
          .sidebar-2K8pFh + .container-3w7J-x {
            width: 240px !important;
            min-width: 240px !important;
          }
          
          /* Toolbar más compacta cuando esté logueado */
          .toolbar-1t6TWx {
            padding: 0 8px !important;
            height: 48px !important;
          }
          
          /* Hacer scroll más sutil */
          ::-webkit-scrollbar {
            width: 8px !important;
          }
          
          ::-webkit-scrollbar-track {
            background: #2f3136 !important;
          }
          
          ::-webkit-scrollbar-thumb {
            background: #5865f2 !important;
            border-radius: 4px !important;
          }
          
          /* OCULTAR modales de 2FA por completo */
          .modal-yWgWj-, .backdrop-1wrmKB, 
          [class*="modal"], [class*="backdrop"],
          [aria-label*="seguridad"], [aria-label*="clave"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `;
        
        webview.insertCSS(operaStyleCSS).catch(console.warn);
        
        // User-Agent específico para Discord
        webview.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OperaGX/106.0.4998.70');
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

    // Cleanup
    return () => {
      window.removeEventListener('discord-status-changed', handleStatusChange as EventListener);
      window.removeEventListener('discord-notification', handleNotification as EventListener);
      DiscordService.cleanup();
    };
  }, []);

  const handleReload = async () => {
    console.log('🔄 [Discord Panel] Recargando Discord...');
    setIsLoaded(false);
    setIsConnecting(true);
    setError(null);
    
    try {
      const success = await DiscordService.reload();
      if (!success && webviewRef.current) {
        webviewRef.current.reload();
      }
    } catch (error) {
      console.error('❌ [Discord Panel] Error recargando:', error);
      if (webviewRef.current) {
        webviewRef.current.reload();
      }
    }
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleOpenExternal = () => {
    console.log('🌐 [Discord Panel] Abriendo Discord en navegador externo');
    if (window.electronAPI?.utils?.openExternal) {
      window.electronAPI.utils.openExternal('https://discord.com/app');
    }
  };

  const clearNotifications = () => {
    setNotifications(0);
  };

  return (
    <div className={`discord-panel ${className} ${isMinimized ? 'minimized' : ''}`}>
      {/* Header estilo Opera */}
      <div className="discord-panel-header">
        <div className="discord-panel-title">
          <div className="discord-icon-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.196.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            {notifications > 0 && (
              <span className="notification-badge" onClick={clearNotifications}>
                {notifications > 99 ? '99+' : notifications}
              </span>
            )}
          </div>
          <span className="panel-title-text">Discord</span>
          <div className={`status-dot ${isLoaded ? 'online' : 'offline'}`}></div>
        </div>
        
        <div className="discord-panel-controls">
          <button 
            onClick={handleReload} 
            className="panel-control-btn"
            title="Recargar Discord"
            disabled={isConnecting}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </button>
          
          <button 
            onClick={handleMinimize} 
            className="panel-control-btn"
            title={isMinimized ? "Expandir Discord" : "Minimizar Discord"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              {isMinimized ? (
                <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/>
              ) : (
                <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
              )}
            </svg>
          </button>
          
          <button 
            onClick={handleOpenExternal} 
            className="panel-control-btn"
            title="Abrir en navegador externo"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Contenido del panel */}
      {!isMinimized && (
        <div className="discord-panel-content">
          {/* Estados de carga y error */}
          {isConnecting && (
            <div className="discord-panel-loading">
              <div className="loading-spinner-small"></div>
              <p>Conectando...</p>
            </div>
          )}

          {error && (
            <div className="discord-panel-error">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <p>{error}</p>
              <button onClick={handleReload} className="retry-btn-small">
                Reintentar
              </button>
            </div>
          )}

          {/* WebView de Discord */}
          <webview
            ref={webviewRef}
            src="https://discord.com/login"
            allowpopups={true}
            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            className={`discord-panel-webview ${isLoaded ? 'loaded' : 'loading'}`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: isConnecting || error ? 'none' : 'block'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DiscordPanel;