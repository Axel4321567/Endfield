import React, { useState, useRef, useEffect } from 'react';
import { BrowserTopBar } from './components/BrowserTopBar';
import ElectronWebView from './components/ElectronWebView';
import SpeedDial from './components/SpeedDial';
import BookmarkManager from './components/BookmarkManager';
import type { TabsManager } from '../../types';
import './SimpleKokoWeb.css';

interface SimpleKokoWebProps {
  tabsManager: TabsManager;
}

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
      app: {
        quit: () => Promise<void>;
        closeWindow: () => Promise<void>;
        minimize: () => Promise<void>;
        getStatus: () => Promise<any>;
      };
    };
  }
}

export const SimpleKokoWeb: React.FC<SimpleKokoWebProps> = ({ tabsManager }) => {
  const [isElectron, setIsElectron] = useState(false);
  const [showBookmarkManager, setShowBookmarkManager] = useState(false);
  const webviewRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Función para obtener URLs más compatibles con webview
  const getWebViewFriendlyUrl = (url: string): string => {
    console.log('🔍 Analizando URL:', url);
    
    // Para Google, usar la URL optimizada para Electron webview
    if (url === 'https://www.google.com' || url === 'https://google.com') {
      console.log('🎯 Configurando Google para Electron webview');
      return 'https://www.google.com';
    }
    
    // Si es una búsqueda de Google, mantener la URL
    if (url.includes('google.com/search')) {
      console.log('🔍 Búsqueda de Google detectada');
      return url;
    }
    
    console.log('✅ URL compatible:', url);
    return url;
  };

  const {
    tabs,
    activeTabId,
    activeTab,
    createNewTab,
    closeTab,
    switchTab,
    updateTab,
    navigateTab,
    goBack,
    goForward,
    refreshTab
  } = tabsManager;

  useEffect(() => {
    // Detectar si estamos en Electron
    const checkElectron = () => {
      const electronDetected = !!(
        window.electronAPI?.isElectron ||
        (window as any).require ||
        (window as any).process?.type ||
        navigator.userAgent.toLowerCase().indexOf('electron') > -1
      );
      
      console.log('🔍 Detección de entorno:', {
        electronAPI: !!window.electronAPI,
        require: !!(window as any).require,
        processType: (window as any).process?.type,
        userAgent: navigator.userAgent,
        electronDetected
      });
      
      setIsElectron(electronDetected);
      return electronDetected;
    };

    const electronMode = checkElectron();
    console.log('🔄 Modo detectado:', electronMode ? 'Electron' : 'Web');

    // Crear la primera pestaña si no hay pestañas - ahora probamos Google con interceptores
    if (tabs.length === 0) {
      console.log('🆕 Creando primera pestaña con Google (interceptores habilitados)');
      
      if (electronMode) {
        console.log('🎯 Modo Electron: Google debería funcionar con interceptores de headers');
      } else {
        console.log('🌐 Modo Web: Usando iframe, Google puede tener limitaciones');
      }
      
      createNewTab('https://www.google.com', 'Google');
    }
  }, [tabs.length, createNewTab]);

  // Efecto para actualizar iframe cuando cambia la URL de la pestaña activa
  useEffect(() => {
    if (activeTab && !isElectron && iframeRef.current) {
      if (activeTab.url && activeTab.url !== iframeRef.current.src) {
        console.log('Actualizando iframe URL:', activeTab.url);
        iframeRef.current.src = activeTab.url;
      }
    }
  }, [activeTab?.url, isElectron]);

  // Efecto para manejar webview en Electron
  useEffect(() => {
    if (activeTab && isElectron && webviewRef.current) {
      const webview = webviewRef.current;
      
      // Si la URL de la pestaña es diferente a la del webview, navegar
      if (activeTab.url && activeTab.url !== webview.src) {
        console.log('Actualizando webview URL:', activeTab.url);
        webview.src = activeTab.url;
      }

      const handleLoadStart = () => {
        updateTab(activeTab.id, { isLoading: true });
      };
      
      const handleLoadStop = () => {
        updateTab(activeTab.id, { isLoading: false });
      };
      
      const handleLoadAbort = () => {
        updateTab(activeTab.id, { isLoading: false });
      };

      // Agregar listeners
      webview.addEventListener('dom-ready', handleLoadStop);
      webview.addEventListener('did-start-loading', handleLoadStart);
      webview.addEventListener('did-fail-load', handleLoadAbort);

      return () => {
        // Limpiar listeners
        webview.removeEventListener('dom-ready', handleLoadStop);
        webview.removeEventListener('did-start-loading', handleLoadStart);
        webview.removeEventListener('did-fail-load', handleLoadAbort);
      };
    }
  }, [activeTab?.url, activeTab?.id, isElectron, updateTab]);

  const handleNavigate = async (tabId: string, url: string) => {
    try {
      // Usar URL compatible con webview si es necesario
      const friendlyUrl = getWebViewFriendlyUrl(url);
      console.log('🚀 Iniciando navegación:', {
        tabId,
        originalUrl: url,
        friendlyUrl,
        isElectron,
        activeTabId
      });
      
      // Si cambiamos la URL, actualizar el título también
      const title = friendlyUrl !== url ? 'Google (Optimizado)' : undefined;
      navigateTab(tabId, friendlyUrl, title);
      
      if (isElectron && window.electronAPI?.webview) {
        console.log('🖥️ Navegando via Electron API');
        await window.electronAPI.webview.navigate(friendlyUrl);
      } else {
        console.log('🌐 Navegando via iframe');
        // Para iframe, forzar actualización inmediata si es la pestaña activa
        if (tabId === activeTabId && iframeRef.current) {
          iframeRef.current.src = friendlyUrl;
        }
      }
      
      console.log(`✅ Navegación iniciada a: ${friendlyUrl}`);
    } catch (error) {
      console.error('❌ Error al navegar:', error);
    }
  };

  const handleGoBack = async (tabId: string) => {
    try {
      goBack(tabId);
      
      if (isElectron && window.electronAPI?.webview) {
        await window.electronAPI.webview.goBack();
      } else {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.history.back();
        }
      }
    } catch (error) {
      console.error('Error al ir atrás:', error);
    }
  };

  const handleGoForward = async (tabId: string) => {
    try {
      goForward(tabId);
      
      if (isElectron && window.electronAPI?.webview) {
        await window.electronAPI.webview.goForward();
      } else {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.history.forward();
        }
      }
    } catch (error) {
      console.error('Error al ir adelante:', error);
    }
  };

  const handleRefresh = async (tabId: string) => {
    try {
      refreshTab(tabId);
      
      if (isElectron && window.electronAPI?.webview) {
        await window.electronAPI.webview.reload();
      } else {
        if (iframeRef.current) {
          iframeRef.current.src = iframeRef.current.src;
        }
      }
    } catch (error) {
      console.error('Error al recargar:', error);
    }
  };

  const handleNewTab = () => {
    createNewTab('', 'Nueva pestaña');
  };

  const handleWebviewLoad = (tabId: string) => {
    updateTab(tabId, { isLoading: false });
  };

  const handleWebviewError = (tabId: string, error: string) => {
    console.error(`❌ Error de carga: ${error}`);
    updateTab(tabId, { isLoading: false });
  };

  // Manejador para actualizar URL y título cuando el webview navega
  const handleUrlChange = (url: string, title?: string) => {
    if (activeTab) {
      const updates: any = { url };
      if (title && title !== 'Sin título') {
        updates.title = title;
      }
      updateTab(activeTab.id, updates);
      console.log('🔄 URL actualizada:', { url, title, tabId: activeTab.id });
    }
  };

  const renderWebContent = () => {
    console.log('🎨 Renderizando contenido web:', {
      activeTab: activeTab?.id,
      url: activeTab?.url,
      isElectron,
      tabsCount: tabs.length
    });

    if (!activeTab) {
      return (
        <div className="no-active-tab">
          <div className="welcome-message">
            <h2>🌐 Bienvenido a Koko Web</h2>
            <p>Crea una nueva pestaña para comenzar a navegar</p>
            <button onClick={handleNewTab} className="create-tab-button">
              ➕ Nueva pestaña
            </button>
          </div>
        </div>
      );
    }

    // Mostrar Speed Dial si no hay URL o es nueva pestaña
    if (!activeTab.url || activeTab.url === '') {
      return (
        <SpeedDial 
          onNavigate={(url: string) => handleNavigate(url, activeTab.id)}
          onOpenBookmarks={() => setShowBookmarkManager(true)}
        />
      );
    }

    if (isElectron) {
      console.log('🖥️ Renderizando webview para Electron');
      return (
        <ElectronWebView
          url={activeTab.url}
          setStatus={() => {}} // función vacía ya que no mostramos status
          onUrlChange={handleUrlChange}
        />
      );
    } else {
      console.log('🌐 Renderizando iframe para web');
      return (
        <div className="iframe-container">
          {activeTab.url ? (
            <iframe
              ref={iframeRef}
              src={activeTab.url}
              className="iframe-content"
              title={activeTab.title}
              onLoad={() => {
                handleWebviewLoad(activeTab.id);
                // En modo iframe, mantenemos la URL sincronizada manualmente
                if (iframeRef.current?.src && iframeRef.current.src !== activeTab.url) {
                  handleUrlChange(iframeRef.current.src, activeTab.title);
                }
              }}
              onError={() => handleWebviewError(activeTab.id, 'Error de carga')}
            />
          ) : (
            <div className="empty-tab">
              <h3>📝 Nueva pestaña</h3>
              <p>Ingresa una URL o término de búsqueda en la barra de direcciones</p>
            </div>
          )}
          
          <div className="iframe-warning">
            ⚠️ Modo Web (iFrame): Algunos sitios pueden bloquear la carga en iframes.
            <br />
            💡 Para mejor compatibilidad, asegúrate de estar ejecutando con Electron.
          </div>
        </div>
      );
    }
  };

  return (
    <div className="simple-koko-web">
      <BrowserTopBar
        tabs={tabs}
        activeTabId={activeTabId}
        activeTab={activeTab}
        onTabSelect={switchTab}
        onTabClose={closeTab}
        onNewTab={handleNewTab}
        onNavigate={handleNavigate}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onRefresh={handleRefresh}
        onOpenBookmarks={() => setShowBookmarkManager(true)}
        setStatus={() => {}} // función vacía ya que no mostramos status
      />

      <div className="web-content">
        {renderWebContent()}
      </div>

      {showBookmarkManager && (
        <BookmarkManager
          isOpen={showBookmarkManager}
          onClose={() => setShowBookmarkManager(false)}
          onNavigate={(url: string, _title: string) => {
            if (activeTab) {
              handleNavigate(url, activeTab.id);
              setShowBookmarkManager(false);
            }
          }}
          currentUrl={activeTab?.url}
          currentTitle={activeTab?.title}
        />
      )}
    </div>
  );
};

export default SimpleKokoWeb;