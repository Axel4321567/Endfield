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
  onNewTab?: (url: string, title?: string) => void; // Nueva función para crear pestañas
}

const ElectronWebView: React.FC<ElectronWebViewProps> = ({ url, setStatus, onUrlChange, onNewTab }) => {
  const webviewRef = useRef<HTMLElement>(null);
  const retryCountRef = useRef<number>(0); // Contador de reintentos para evitar bucles
  const lastErrorUrlRef = useRef<string>(''); // Última URL que causó error
  const isBlockedDomainRef = useRef<boolean>(false); // Flag para dominios bloqueados
  const currentUrlRef = useRef<string>(''); // URL actual para evitar recargas innecesarias

  // 🚀 DETECCIÓN INMEDIATA de dominios bloqueados (antes de cargar)
  const checkForBlockedDomain = (targetUrl: string) => {
    if (!targetUrl) return false;
    
    // 🚫 COMPLETAMENTE DESACTIVADO: Permitir que todos los dominios funcionen en webview
    return false; // Siempre permitir todos los dominios
  };

  // 🛡️ INTERCEPTAR URL ANTES DE CARGAR
  useEffect(() => {
    // Reducir logs para evitar spam
    if (Date.now() - (window as any).__lastUrlLog > 1000) {
      console.log('🔍 Verificando URL:', url);
      (window as any).__lastUrlLog = Date.now();
    }
    
    if (checkForBlockedDomain(url)) {
      console.log('🛑 URL BLOQUEADA - NO CARGAR EN WEBVIEW');
      return; // No proceder con la configuración del webview
    }
    
  }, [url]); // Ejecutar cada vez que cambie la URL

  useEffect(() => {
    const webview = webviewRef.current as any;
    if (!webview || isBlockedDomainRef.current) {
      console.log('⚠️ Webview no disponible o dominio bloqueado - saltando configuración');
      return;
    }

    // Event listeners para webview
    const handleLoadStart = () => {
      // � VERIFICACIÓN ADICIONAL en load start
      const currentUrl = webview.getURL && webview.getURL() || url;
      
      if (checkForBlockedDomain(currentUrl)) {
        console.log('🛑 Carga interrumpida - dominio bloqueado detectado automáticamente');
        return; // No proceder con la carga
      }
      
      setStatus('cargando...');
    };

    const handleLoadStop = () => {
      setStatus('listo');
      
      // ✅ Resetear contador de errores en carga exitosa
      retryCountRef.current = 0;
      lastErrorUrlRef.current = '';
      
      // Obtener la URL actual y el título cuando termine de cargar
      if (onUrlChange && webview.getURL) {
        const currentUrl = webview.getURL();
        const currentTitle = webview.getTitle() || 'Sin título';
        onUrlChange(currentUrl, currentTitle);
      }
    };

    const handleLoadFail = (event: any) => {
      const currentUrl = event.validatedURL || url;
      
      console.error('🚨 Error de carga en webview:', {
        errorCode: event.errorCode,
        errorDescription: event.errorDescription,
        url: currentUrl,
        isMainFrame: event.isMainFrame,
        retryCount: retryCountRef.current
      });
      
      setStatus(`Error: ${event.errorDescription || 'No se pudo cargar la página'}`);
      
      // 🛡️ EVITAR bucles con about:blank
      if (currentUrl === 'about:blank' || currentUrl.includes('about:blank')) {
        console.log('🛑 Error en about:blank - detener inmediatamente sin redirección');
        setStatus('Página de inicio - Use la barra de direcciones para navegar');
        return; // NO hacer nada más
      }
      
      // 🛡️ Protección ESTRICTA contra bucles infinitos
      if (currentUrl === lastErrorUrlRef.current) {
        retryCountRef.current += 1;
        console.log(`⚠️ Reintento #${retryCountRef.current} para la misma URL:`, currentUrl);
        
        if (retryCountRef.current >= 1) { // Solo 1 reintento
          console.log('🛑 Un solo reintento permitido - DETENIENDO bucle definitivamente');
          
          // NO redirigir a about:blank, simplemente mostrar error estático
          setStatus('Sitio no disponible - Use la barra de direcciones para navegar a otro sitio');
          return; // SALIR definitivamente sin cambiar URL
        }
      } else {
        // Nueva URL que falla, resetear contador
        retryCountRef.current = 1;
        lastErrorUrlRef.current = currentUrl;
      }
      
      // 🧠 Manejo inteligente de errores ERR_ABORTED - SIN ventanas externas
      if (event.errorCode === -3) { // ERR_ABORTED
        console.log('🔄 Error ERR_ABORTED detectado, intentando fallback interno...');
        
        // FORZAR PARADA del bucle infinito después del primer intento
        if (retryCountRef.current === 1) {
          console.log('🛑 PRIMER ERROR ERR_ABORTED - Deteniendo bucle sin redirección');
          
          // NO redirigir a ninguna URL, solo mostrar mensaje de error
          setStatus('Sitio no es compatible con webview - Use la barra de direcciones para navegar');
          return; // DETENER aquí, no más reintentos
        }
        
        // Si es reintento, simplemente detener
        console.log('🛑 ERR_ABORTED en reintento - DETENIENDO bucle definitivamente');
        setStatus('Sitio no compatible con webview - Usar navegación directa');
        return;
      }
      
      // ERR_BLOCKED_BY_RESPONSE específico para Google
      if (event.errorCode === -20 && currentUrl.includes('google.com')) {
        console.log('🚨 ERR_BLOCKED_BY_RESPONSE en Google - intentando navegación inteligente...');
        
        // Usar navegación inteligente también para ERR_BLOCKED_BY_RESPONSE
        if (false) { // DESACTIVADO: No usar navegación inteligente automática
          console.log('🎯 Usando navegación inteligente para ERR_BLOCKED_BY_RESPONSE');
          window.electronAPI?.navigation.openBrowserTab(currentUrl);
          return;
        }
        
        console.log('🔄 Intentando recargar con delay más largo...');
        setTimeout(() => {
          if (webview && webview.reload) {
            webview.reload();
          }
        }, 5000);
      } else if (event.errorCode === -6) { // ERR_FILE_NOT_FOUND
        console.log('📄 Archivo no encontrado, redirigiendo a Google...');
        if (onUrlChange) {
          onUrlChange('https://www.google.com', 'Google - Página no encontrada');
        }
      }
    };

    const handleNavigate = (event: any) => {
      console.log('🔄 Navegación detectada:', event.url);
      
      // 🛑 BLOQUEO TOTAL: YouTube playlist - NO notificar cambios de URL
      if (event.url && event.url.includes('youtube.com/watch') && url.includes('youtube.com/watch')) {
        console.log('🛑 YouTube playlist BLOQUEADO - NO notificar cambio de URL para evitar bucles');
        setStatus('YouTube: Reproduciendo playlist');
        // NO llamar onUrlChange - esto es lo que causa los bucles
        return;
      }
      
      // Para primera carga de YouTube o navegación a YouTube desde otro sitio
      if (event.url && event.url.includes('youtube.com/watch') && !url.includes('youtube.com/watch')) {
        console.log('🎵 Primera carga de YouTube - permitir');
        setStatus('YouTube: Cargando video');
        if (onUrlChange && event.url) {
          onUrlChange(event.url);
        }
        return;
      }
      
      setStatus(`Navegando a: ${event.url}`);
      
      // Para otros sitios, proceder normalmente
      if (onUrlChange && event.url) {
        onUrlChange(event.url);
      }
    };

    const handleDomReady = () => {
      console.log('🎯 DOM listo para:', url);
      
      // 🛑 YouTube playlist: NO actualizar información para evitar bucles
      if (url.includes('youtube.com/watch') && webview.getURL && webview.getURL().includes('youtube.com/watch')) {
        console.log('🛑 YouTube playlist DOM ready - NO actualizar para evitar bucles');
        return;
      }
      
      // Actualizar título cuando el DOM esté listo (solo para sitios no-YouTube playlist)
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
    
    // 🛑 YouTube: NO agregar will-navigate listener para evitar bucles en playlists
    if (!url.includes('youtube.com/watch')) {
      webview.addEventListener('will-navigate', handleNavigate);
      console.log('✅ will-navigate listener agregado para sitio no-YouTube');
    } else {
      console.log('🛑 YouTube detectado - will-navigate listener NO agregado para evitar bucles');
    }
    
    webview.addEventListener('dom-ready', handleDomReady);

    // Event listener para manejar nuevas ventanas como nuevas pestañas
    const handleNewWindow = (event: any) => {
      console.log('🪟 Nueva ventana solicitada:', event.url);
      
      // Prevenir que se abra una ventana flotante
      event.preventDefault();
      
      // Si tenemos callback para crear nueva pestaña, usarlo
      if (onNewTab && event.url) {
        console.log('🆕 Creando nueva pestaña en lugar de ventana flotante');
        onNewTab(event.url, event.frameName || 'Nueva pestaña');
      } else {
        console.log('⚠️ No hay callback de nueva pestaña disponible, usando navegación por defecto');
        // Fallback: navegar en la pestaña actual
        if (onUrlChange) {
          onUrlChange(event.url);
        }
      }
    };
    webview.addEventListener('new-window', handleNewWindow);

    // Cleanup
    return () => {
      webview.removeEventListener('did-start-loading', handleLoadStart);
      webview.removeEventListener('did-stop-loading', handleLoadStop);
      webview.removeEventListener('did-fail-load', handleLoadFail);
      
      // Solo remover will-navigate si fue agregado
      if (!url.includes('youtube.com/watch')) {
        webview.removeEventListener('will-navigate', handleNavigate);
      }
      
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('new-window', handleNewWindow);
    };
  }, [setStatus]);

  // Actualizar URL cuando cambie - SOLO si no es dominio bloqueado
  useEffect(() => {
    const webview = webviewRef.current as any;
    if (webview && url && !isBlockedDomainRef.current) {
      // 🎵 YouTube: NO forzar cambio de src si ya estamos en YouTube
      // Dejar que YouTube maneje su propia navegación interna
      if (url.includes('youtube.com/watch') && currentUrlRef.current.includes('youtube.com/watch')) {
        console.log('🎵 YouTube navegación interna - NO cambiar src, dejar que YouTube maneje');
        currentUrlRef.current = url; // Actualizar referencia pero no el webview
        return;
      }
      
      // Para otros sitios o primera carga de YouTube, cambiar src normalmente
      if (webview.src !== url) {
        console.log('🔄 Actualizando URL de webview:', url);
        webview.src = url;
        currentUrlRef.current = url;
      }
    }
  }, [url]);

  // 🚫 NO RENDERIZAR WEBVIEW para dominios bloqueados
  if (isBlockedDomainRef.current) {
    return (
      <div className="flex-1 bg-gray-100 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-2xl mb-4">🚀</div>
          <div className="text-lg font-medium text-gray-700 mb-2">
            Abriendo en ventana externa
          </div>
          <div className="text-sm text-gray-500">
            Este sitio requiere ventana externa para funcionar correctamente
          </div>
        </div>
      </div>
    );
  }

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