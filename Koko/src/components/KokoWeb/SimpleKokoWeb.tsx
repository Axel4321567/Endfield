import React, { useState, useRef, useEffect } from 'react';
import TopBar from './components/TopBar';
import './SimpleKokoWeb.css';

// Declarar tipos para Electron API
declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      webview: {
        navigate: (url: string) => Promise<void>;
        goBack: () => Promise<void>;
        goForward: () => Promise<void>;
        reload: () => Promise<void>;
      };
    };
  }
}

export const SimpleKokoWeb: React.FC = () => {
  const [url, setUrl] = useState('https://www.google.com');
  const [status, setStatus] = useState('Listo');
  const [isElectron, setIsElectron] = useState(false);
  const webviewRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Detectar si estamos en Electron
    const checkElectron = () => {
      const electronDetected = !!(
        window?.electronAPI?.isElectron ||
        window?.navigator?.userAgent?.includes('Electron') ||
        (window as any)?.process?.type === 'renderer'
      );
      setIsElectron(electronDetected);
    };
    
    checkElectron();
    
    // Configurar eventos del webview si estamos en Electron
    if (isElectron && webviewRef.current) {
      const webview = webviewRef.current;
      
      const handleLoadStart = () => setStatus('Cargando...');
      const handleLoadStop = () => setStatus('Completado');
      const handleLoadAbort = () => setStatus('Error de carga');
      const handleDomReady = () => setStatus('DOM listo');
      
      webview.addEventListener('loadstart', handleLoadStart);
      webview.addEventListener('loadstop', handleLoadStop);
      webview.addEventListener('loadabort', handleLoadAbort);
      webview.addEventListener('dom-ready', handleDomReady);
      
      return () => {
        webview.removeEventListener('loadstart', handleLoadStart);
        webview.removeEventListener('loadstop', handleLoadStop);
        webview.removeEventListener('loadabort', handleLoadAbort);
        webview.removeEventListener('dom-ready', handleDomReady);
      };
    }
  }, [isElectron]);

  return (
    <div className="simple-koko-web">
      {/* Barra de navegación con TopBar completo */}
      <TopBar
        url={url}
        setUrl={setUrl}
        setStatus={setStatus}
        iframeRef={iframeRef}
        webviewRef={webviewRef}
        isElectron={isElectron}
      />

      {/* Barra de estado */}
      <div className="status-bar">
        <span>📍 {status}</span>
        <span className="status-separator">|</span>
        <span>🔗 {url}</span>
      </div>

      {/* Contenido del navegador */}
      <div className="browser-content">
        {isElectron ? (
          // Webview para Electron
          <webview
            ref={webviewRef}
            src={url}
            className="browser-webview"
            nodeintegration={false}
            webpreferences="contextIsolation=true"
          />
        ) : (
          // Iframe para Tauri con mensaje mejorado
          <div className="tauri-container">
            <div className="tauri-warning">
              <h3>⚠️ Modo Tauri - Navegación Limitada</h3>
              <p>
                Muchos sitios bloquean iframes. Para navegación completa, usa: <strong>npm run dev</strong> (Electron)
              </p>
            </div>
            
            <iframe
              ref={iframeRef}
              src={url}
              className="tauri-iframe"
              onLoad={() => setStatus('Cargado en iframe')}
              onError={() => setStatus('Error: Sitio bloquea iframe')}
              title="Navegador web"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleKokoWeb;