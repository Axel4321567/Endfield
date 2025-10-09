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
      // 🧠 Nueva API de navegación inteligente
      navigation: {
        openBrowserTab: (url: string) => Promise<{
          success: boolean;
          method: 'external-window' | 'internal-webview';
          url: string;
        }>;
        openExternalPage: (url: string) => Promise<{
          success: boolean;
          method: 'external-window' | 'internal-webview';
          url: string;
          windowId?: number;
          reason: string;
        }>;
        createNewTab: (url: string, title?: string) => Promise<{
          success: boolean;
          url: string;
          title?: string;
        }>;
        onNavigateInWebview: (callback: (event: any, url: string) => void) => void;
        removeNavigateInWebviewListener: () => void;
        onCreateNewTab: (callback: (event: any, url: string, title?: string) => void) => void;
        removeCreateNewTabListener: () => void;
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

    // 🧠 Configurar listener para navegación inteligente
    if (electronMode && window.electronAPI?.navigation?.onNavigateInWebview) {
      console.log('🔗 Configurando listener de navegación inteligente');
      
      const handleWebviewNavigation = (_event: any, url: string) => {
        console.log('📨 Navegación solicitada desde proceso principal:', url);
        
        // Encontrar o crear pestaña activa para la navegación
        if (activeTab) {
          console.log('🎯 Navegando en pestaña activa:', activeTab.id);
          navigateTab(activeTab.id, url);
        } else if (tabs.length > 0) {
          console.log('🎯 Navegando en primera pestaña disponible');
          navigateTab(tabs[0].id, url);
        } else {
          console.log('🆕 Creando nueva pestaña para navegación');
          createNewTab(url);
        }
      };
      
      // 🆕 Manejador para crear nuevas pestañas desde webview
      const handleCreateNewTab = (_event: any, url: string, title?: string) => {
        console.log('🆕 Nueva pestaña solicitada desde proceso principal:', { url, title });
        createNewTab(url, title || 'Nueva pestaña');
      };
      
      window.electronAPI.navigation.onNavigateInWebview(handleWebviewNavigation);
      window.electronAPI.navigation.onCreateNewTab(handleCreateNewTab);
      
      // Cleanup en el desmontaje del componente
      return () => {
        if (window.electronAPI?.navigation?.removeNavigateInWebviewListener) {
          window.electronAPI.navigation.removeNavigateInWebviewListener();
          console.log('🧹 Listener de navegación inteligente removido');
        }
        if (window.electronAPI?.navigation?.removeCreateNewTabListener) {
          window.electronAPI.navigation.removeCreateNewTabListener();
          console.log('🧹 Listener de nuevas pestañas removido');
        }
      };
    }

    // Sistema de sesiones integrado - useTabs se encarga de la inicialización
    // No crear pestañas aquí, el hook useTabs maneja la restauración de sesiones
    console.log('📋 Sistema de pestañas con sesiones inicializado');
    console.log('🔍 Pestañas actuales:', tabs.length);
    
    if (tabs.length > 0) {
      console.log('✅ Pestañas cargadas desde sesión o creadas por defecto');
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
      console.log('🚀 [Koko-Web] Navegación detectada →', url);
      
      // ⚡ VERIFICACIÓN PREVIA: Detectar dominios problemáticos ANTES de intentar cargar
      const problematicDomains = [
        'google.com', 'youtube.com', 'gmail.com',
        'accounts.google.com', 'drive.google.com',
        'docs.google.com', 'maps.google.com'
      ];
      
      const isProblematicDomain = problematicDomains.some(domain => url.includes(domain));
      
      if (isElectron && isProblematicDomain && window.electronAPI?.navigation?.openBrowserTab) {
        console.log('🛑 DOMINIO PROBLEMÁTICO DETECTADO - Forzando ventana externa INMEDIATAMENTE:', url);
        
        try {
          const result = await window.electronAPI.navigation.openBrowserTab(url);
          console.log('✅ Dominio problemático redirigido exitosamente:', result);
          
          // Actualizar la pestaña para mostrar que se abrió externamente
          updateTab(tabId, { 
            title: 'Abierto en ventana externa',
            url: url,
            isLoading: false 
          });
          return; // ⚡ SALIR INMEDIATAMENTE - No intentar cargar en webview
        } catch (error) {
          console.error('❌ Error al redirigir dominio problemático:', error);
        }
      }
      
      // 🧠 Usar navegación inteligente si está disponible (Electron) - Para otros casos
      if (isElectron && window.electronAPI?.navigation?.openBrowserTab) {
        console.log('🎯 Usando sistema de navegación inteligente para análisis adicional');
        
        try {
          const result = await window.electronAPI.navigation.openBrowserTab(url);
          console.log('✅ Resultado de navegación inteligente:', result);
          
          if (result.method === 'external-window') {
            // La página se abrió en ventana externa
            updateTab(tabId, { 
              title: 'Abierto en ventana externa',
              url: url,
              isLoading: false 
            });
            return;
          } else if (result.method === 'internal-webview') {
            // La página debe abrirse en el webview interno
            console.log('🔄 Redirigiendo a webview interno');
            // Continuar con la navegación normal
          }
        } catch (error) {
          console.error('❌ Error en navegación inteligente:', error);
          // Si falla, continuar con navegación tradicional
        }
      }
      
      // 🔄 Navegación tradicional/fallback
      // Usar URL compatible con webview si es necesario
      const friendlyUrl = getWebViewFriendlyUrl(url);
      console.log('🚀 Navegación tradicional:', {
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
      // 🎵 BLOQUEO TOTAL para YouTube playlist: NO actualizar NADA
      if (url.includes('youtube.com/watch') && activeTab.url.includes('youtube.com/watch')) {
        console.log('🛑 YouTube playlist - BLOQUEANDO actualización completamente para evitar bucles');
        console.log('🎵 YouTube maneja su propia navegación interna, NO interferir');
        // NO hacer NADA - dejar que YouTube maneje todo internamente
        return;
      }
      
      // Para otras navegaciones (incluida primera carga de YouTube), proceder normalmente
      const updates: any = { url };
      if (title && title !== 'Sin título') {
        updates.title = title;
      }
      updateTab(activeTab.id, updates);
      console.log('🔄 URL actualizada:', { url, title, tabId: activeTab.id });
    }
  };

  const renderWebContent = () => {
    console.log('🎨 [DEBUG] Renderizando contenido web...');
    console.log('🎨 [DEBUG] Estado completo:', {
      totalTabs: tabs.length,
      activeTabId,
      activeTab: activeTab ? {
        id: activeTab.id,
        url: activeTab.url,
        title: activeTab.title,
        isLoading: activeTab.isLoading
      } : null,
      allTabs: tabs.map(t => ({ id: t.id, url: t.url, title: t.title })),
      isElectron
    });
    
    if (tabs.length === 0) {
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

    // Renderizar TODAS las pestañas pero mostrar solo la activa
    return (
      <div className="tabs-container">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          
          // Para pestañas vacías, mostrar Speed Dial
          if (!tab.url || tab.url === '') {
            return (
              <div 
                key={tab.id}
                className="tab-content"
                style={{ 
                  display: isActive ? 'block' : 'none',
                  height: '100%',
                  width: '100%'
                }}
              >
                <SpeedDial 
                  onNavigate={(url: string, title: string) => {
                    console.log('🎯 SpeedDial navegando a:', url, 'con título:', title);
                    handleNavigate(tab.id, url);
                  }}
                  onOpenBookmarks={() => setShowBookmarkManager(true)}
                />
              </div>
            );
          }

          // Para pestañas con contenido
          if (isElectron) {
            console.log(`🖥️ Renderizando webview para pestaña ${tab.id} (activa: ${isActive})`);
            return (
              <div 
                key={tab.id}
                className="tab-content"
                style={{ 
                  display: isActive ? 'block' : 'none',
                  height: '100%',
                  width: '100%'
                }}
              >
                <ElectronWebView
                  key={tab.url.includes('youtube.com/watch') ? `youtube-${tab.id}` : `webview-${tab.id}-${tab.url}`}
                  url={tab.url}
                  setStatus={() => {}}
                  onUrlChange={(url, title) => {
                    // Solo actualizar si es la pestaña activa para evitar conflictos
                    if (isActive) {
                      handleUrlChange(url, title);
                    }
                  }}
                  onNewTab={(url, title) => {
                    console.log('🆕 Solicitud de nueva pestaña desde webview:', url);
                    createNewTab(url, title || 'Nueva pestaña');
                  }}
                />
              </div>
            );
          } else {
            console.log(`🌐 Renderizando iframe para pestaña ${tab.id} (activa: ${isActive})`);
            return (
              <div 
                key={tab.id}
                className="tab-content"
                style={{ 
                  display: isActive ? 'block' : 'none',
                  height: '100%',
                  width: '100%'
                }}
              >
                <div className="iframe-container">
                  <iframe
                    key={`iframe-${tab.id}`} // Clave única para cada iframe
                    src={tab.url}
                    className="iframe-content"
                    title={tab.title}
                    onLoad={() => {
                      handleWebviewLoad(tab.id);
                      // Solo sincronizar URL si es la pestaña activa
                      if (isActive) {
                        const iframe = document.querySelector(`iframe[key="iframe-${tab.id}"]`) as HTMLIFrameElement;
                        if (iframe?.src && iframe.src !== tab.url) {
                          handleUrlChange(iframe.src, tab.title);
                        }
                      }
                    }}
                    onError={() => handleWebviewError(tab.id, 'Error de carga')}
                  />
                  
                  {isActive && (
                    <div className="iframe-warning">
                      ⚠️ Modo Web (iFrame): Algunos sitios pueden bloquear la carga en iframes.
                      <br />
                      💡 Para mejor compatibilidad, asegúrate de estar ejecutando con Electron.
                    </div>
                  )}
                </div>
              </div>
            );
          }
        })}
      </div>
    );
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
              handleNavigate(activeTab.id, url);
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