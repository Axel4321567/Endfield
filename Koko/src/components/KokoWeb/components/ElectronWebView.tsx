import React, { useEffect, useRef } from 'react';

// Declaración de tipos para webview de Electron
declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        allowpopups?: boolean;
        webpreferences?: string;
        useragent?: string;
      };
    }
  }
}

interface ElectronWebViewProps {
  url: string;
  setStatus: (status: string) => void;
}

const ElectronWebView: React.FC<ElectronWebViewProps> = ({ url, setStatus }) => {
  const webviewRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const webview = webviewRef.current as any;
    if (!webview) return;

    // Event listeners para webview
    const handleLoadStart = () => {
      setStatus('cargando...');
    };

    const handleLoadStop = () => {
      setStatus('listo');
    };

    const handleLoadFail = (event: any) => {
      setStatus(`Error: ${event.errorDescription || 'No se pudo cargar la página'}`);
    };

    const handleNavigate = (event: any) => {
      setStatus(`Navegando a: ${event.url}`);
    };

    // Agregar event listeners
    webview.addEventListener('did-start-loading', handleLoadStart);
    webview.addEventListener('did-stop-loading', handleLoadStop);
    webview.addEventListener('did-fail-load', handleLoadFail);
    webview.addEventListener('will-navigate', handleNavigate);

    // Cleanup
    return () => {
      webview.removeEventListener('did-start-loading', handleLoadStart);
      webview.removeEventListener('did-stop-loading', handleLoadStop);
      webview.removeEventListener('did-fail-load', handleLoadFail);
      webview.removeEventListener('will-navigate', handleNavigate);
    };
  }, [setStatus]);

  // Actualizar URL cuando cambie
  useEffect(() => {
    const webview = webviewRef.current as any;
    if (webview && url && webview.src !== url) {
      webview.src = url;
    }
  }, [url]);

  return (
    <div className="flex-1 bg-white">
      <webview
        ref={webviewRef}
        src={url}
        style={{
          width: '100%',
          height: '100%',
          border: 'none'
        }}
        allowpopups={true}
        webpreferences="contextIsolation=false"
        useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      />
    </div>
  );
};

export default ElectronWebView;