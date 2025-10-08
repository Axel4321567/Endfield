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
  onUrlChange?: (url: string, title?: string) => void;
}

const ElectronWebView: React.FC<ElectronWebViewProps> = ({ url, setStatus, onUrlChange }) => {
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
      // Obtener la URL actual y el título cuando termine de cargar
      if (onUrlChange && webview.getURL) {
        const currentUrl = webview.getURL();
        const currentTitle = webview.getTitle() || 'Sin título';
        onUrlChange(currentUrl, currentTitle);
      }
    };

    const handleLoadFail = (event: any) => {
      console.error('🚨 Error de carga en webview:', {
        errorCode: event.errorCode,
        errorDescription: event.errorDescription,
        url: event.validatedURL || url,
        isMainFrame: event.isMainFrame
      });
      
      setStatus(`Error: ${event.errorDescription || 'No se pudo cargar la página'}`);
      
      // Manejo específico de errores comunes
      if (event.errorCode === -3) { // ERR_ABORTED
        console.log('🔄 Error ERR_ABORTED detectado, implementando fallback...');
        
        // Si es Google, intentar recargar después de un breve delay
        if (event.validatedURL?.includes('google.com')) {
          console.log('🎯 Error en Google detectado, reintentando en 3 segundos...');
          setTimeout(() => {
            if (webview && webview.reload) {
              console.log('🔄 Recargando Google...');
              webview.reload();
            }
          }, 3000);
        }
      }
      
      // ERR_BLOCKED_BY_RESPONSE específico para Google
      if (event.errorCode === -20 && event.validatedURL?.includes('google.com')) {
        console.log('🚨 ERR_BLOCKED_BY_RESPONSE en Google - los interceptores no funcionaron completamente');
        console.log('🔄 Intentando recargar con delay más largo...');
        setTimeout(() => {
          if (webview && webview.reload) {
            webview.reload();
          }
        }, 5000);
      } else if (event.errorCode === -6) { // ERR_FILE_NOT_FOUND
        console.log('📄 Archivo no encontrado, redirigiendo a página de búsqueda...');
        if (onUrlChange) {
          onUrlChange('https://duckduckgo.com', 'DuckDuckGo - Página no encontrada');
        }
      }
    };

    const handleNavigate = (event: any) => {
      setStatus(`Navegando a: ${event.url}`);
      // Actualizar URL cuando comience la navegación
      if (onUrlChange && event.url) {
        onUrlChange(event.url);
      }
    };

    const handleDomReady = () => {
      console.log('🎯 DOM listo para:', url);
      // Actualizar título cuando el DOM esté listo
      if (onUrlChange && webview.getURL && webview.getTitle) {
        const currentUrl = webview.getURL();
        const currentTitle = webview.getTitle() || 'Sin título';
        console.log('📄 Información de página:', { currentUrl, currentTitle });
        onUrlChange(currentUrl, currentTitle);
      }
      
      // Log específico para Google
      if (url.includes('google.com')) {
        console.log('🎉 Google cargado exitosamente en webview!');
      }
    };

    // Agregar event listeners
    webview.addEventListener('did-start-loading', handleLoadStart);
    webview.addEventListener('did-stop-loading', handleLoadStop);
    webview.addEventListener('did-fail-load', handleLoadFail);
    webview.addEventListener('will-navigate', handleNavigate);
    webview.addEventListener('dom-ready', handleDomReady);

    // Event listener adicional para debug de Google
    const handleNewWindow = (event: any) => {
      console.log('🪟 Nueva ventana solicitada:', event.url);
    };
    webview.addEventListener('new-window', handleNewWindow);

    // Cleanup
    return () => {
      webview.removeEventListener('did-start-loading', handleLoadStart);
      webview.removeEventListener('did-stop-loading', handleLoadStop);
      webview.removeEventListener('did-fail-load', handleLoadFail);
      webview.removeEventListener('will-navigate', handleNavigate);
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('new-window', handleNewWindow);
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
        webpreferences="webSecurity=false,allowRunningInsecureContent=true,contextIsolation=false,nodeIntegration=false,experimentalFeatures=true,disableWebSecurity=true,allowDisplayingInsecureContent=true"
        useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KokoWebBrowser/1.0"
        partition="persist:webview"
      />
    </div>
  );
};

export default ElectronWebView;