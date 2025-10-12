import React, { useState, useRef, useEffect } from 'react';
import { BrowserTopBar } from './components/BrowserTopBar';
import { TabBar } from './components/TabBar';
import ElectronWebView from './components/ElectronWebView';
import SpeedDial from './components/SpeedDial';
import BookmarkManager from './components/BookmarkManager';

import type { TabsManager, Tab } from '../../types';
import './SimpleKokoWeb.css';

// Tipos para resultados de búsqueda (mantenidos para compatibilidad)
interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

interface SimpleKokoWebProps {
  tabsManager: TabsManager;
}

export const SimpleKokoWeb: React.FC<SimpleKokoWebProps> = React.memo(({ tabsManager }) => {
  const [isElectron, setIsElectron] = useState(false);
  const [showBookmarkManager, setShowBookmarkManager] = useState(false);
  const webviewRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Estado para Puppeteer Browser embebido
  const [puppeteerUrl, setPuppeteerUrl] = useState('https://www.google.com');
  const [isPuppeteerOpen, setIsPuppeteerOpen] = useState(false);
  const [isPuppeteerLoading, setIsPuppeteerLoading] = useState(false);
  
  // Estado para búsqueda integrada
  const [searchResults, setSearchResults] = useState<GoogleSearchResult[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loadingTimeouts, setLoadingTimeouts] = useState<Map<string, number>>(new Map());
  const [isProxyAvailable, setIsProxyAvailable] = useState<boolean | null>(null); // null = checking

  // Función para detectar si una consulta es una búsqueda (SOLO para input directo del usuario)
  const isSearchQuery = (input: string): boolean => {
    console.log('🔍 [DETECCIÓN] Analizando entrada:', input);
    
    // Si ya es una URL completa (tiene protocolo), NUNCA interceptar
    if (input.startsWith('http://') || input.startsWith('https://')) {
      console.log('🌐 [DETECCIÓN] Tiene protocolo - Es URL válida - NO interceptar');
      return false;
    }
    
    // Si parece un dominio (contiene punto sin espacios), probablemente es URL
    if (input.includes('.') && !input.includes(' ')) {
      console.log('🌐 [DETECCIÓN] Parece dominio - NO interceptar');
      return false;
    }
    
    // Si contiene espacios, definitivamente es búsqueda
    if (input.includes(' ')) {
      console.log('🔍 [DETECCIÓN] Contiene espacios - Es búsqueda - Interceptar');
      return true;
    }
    
    // Si no tiene puntos y no tiene espacios, probablemente es búsqueda de una palabra
    if (!input.includes('.')) {
      console.log('🔍 [DETECCIÓN] Una palabra sin dominio - Es búsqueda - Interceptar');
      return true;
    }
    
    // Por defecto, no interceptar para evitar falsos positivos
    console.log('🌐 [DETECCIÓN] Por defecto NO interceptar');
    return false;
  };

  // Función para realizar búsqueda integrada
  const performIntegratedSearch = async (queryOrUrl: string) => {
    let actualQuery = queryOrUrl.trim();
    
    // Si es una URL de motor de búsqueda, extraer la consulta
    if (queryOrUrl.includes('google.com/search?q=')) {
      const urlParams = new URLSearchParams(queryOrUrl.split('?')[1]);
      actualQuery = urlParams.get('q') || queryOrUrl;
    } else if (queryOrUrl.includes('duckduckgo.com/?q=')) {
      const urlParams = new URLSearchParams(queryOrUrl.split('?')[1]);
      actualQuery = urlParams.get('q') || queryOrUrl;
    } else if (queryOrUrl.includes('bing.com/search?q=')) {
      const urlParams = new URLSearchParams(queryOrUrl.split('?')[1]);
      actualQuery = urlParams.get('q') || queryOrUrl;
    }
    
    if (!actualQuery) return;
    
    console.log('🔍 Realizando búsqueda con BrowserView seguro:', {
      original: queryOrUrl,
      extracted: actualQuery
    });
    
    setIsSearching(true);
    setSearchQuery(actualQuery);
    setIsSearchMode(true);
    
    try {
      // Verificar si estamos en Electron
      if (!isElectron || !window.electronAPI?.searchProxy) {
        console.warn('⚠️ No estamos en Electron, usando navegación directa');
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(actualQuery)}`;
        if (activeTab) {
          navigateTab(activeTab.id, googleUrl);
        }
        setIsSearchMode(false);
        return;
      }
      
      // Verificar salud del proxy
      const healthCheck = await window.electronAPI.searchProxy.checkHealth();
      
      if (!healthCheck.success) {
        console.warn('⚠️ Proxy no disponible:', healthCheck.error);
        setIsProxyAvailable(false);
        
        // Fallback: navegar directamente a Google
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(actualQuery)}`;
        if (activeTab) {
          navigateTab(activeTab.id, googleUrl);
        }
        setIsSearchMode(false);
        return;
      }
      
      setIsProxyAvailable(true);
      
      // Realizar búsqueda usando BrowserView seguro
      const searchResult = await window.electronAPI.searchProxy.search(actualQuery);
      
      if (!searchResult.success) {
        console.error('❌ Error en búsqueda:', searchResult.error);
        
        // Fallback a navegación directa
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(actualQuery)}`;
        if (activeTab) {
          navigateTab(activeTab.id, googleUrl);
        }
        setIsSearchMode(false);
        return;
      }
      
      console.log('✅ Búsqueda cargada en BrowserView:', searchResult.htmlLength, 'bytes');
      
      // El HTML ya está cargado en el BrowserView de Electron
      // No necesitamos mostrarlo en React, solo actualizar el estado
      setIsSearchMode(false);
      setSearchResults([]);
      
    } catch (error) {
      console.error('❌ Error en búsqueda integrada:', error);
      setIsProxyAvailable(false);
      
      // Fallback a navegación directa
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(actualQuery)}`;
      if (activeTab) {
        navigateTab(activeTab.id, googleUrl);
      }
      setIsSearchMode(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Función para manejar clic en resultado de búsqueda
  const handleSearchResultClick = (result: GoogleSearchResult) => {
    console.log('🎯 [RESULTADO] Navegando a resultado:', result.link);
    
    // Salir del modo búsqueda ANTES de navegar
    setIsSearchMode(false);
    setSearchResults([]);
    setSearchQuery('');
    
    // Pequeño delay para asegurar que el estado se actualiza
    setTimeout(() => {
      if (activeTab) {
        console.log('🎯 [RESULTADO] Navegando en pestaña activa:', activeTab.id);
        navigateTab(activeTab.id, result.link);
      } else {
        console.log('🎯 [RESULTADO] Creando nueva pestaña');
        createNewTab(result.link, result.title);
      }
    }, 100);
  };

  // Función para salir del modo búsqueda
  const exitSearchMode = () => {
    console.log('❌ [BÚSQUEDA] Saliendo del modo búsqueda');
    setIsSearchMode(false);
    setSearchResults([]);
    setSearchQuery('');
  };

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
  }, [tabs.length, activeTab, navigateTab, createNewTab]);

  // Auto-abrir Google cuando se detecta Electron y limpiar al desmontar
  useEffect(() => {
    const autoOpenBrowser = async () => {
      if (isElectron && !isPuppeteerOpen && window.electronAPI?.puppeteerBrowser) {
        console.log('🚀 [Koko-Web] Abriendo Google al entrar a Koko-Web...');
        try {
          const result = await window.electronAPI.puppeteerBrowser.open('https://www.google.com');
          if (result.success) {
            setIsPuppeteerOpen(true);
            setPuppeteerUrl('https://www.google.com');
            
            // Mostrar el BrowserView
            await window.electronAPI.puppeteerBrowser.show();
            console.log('✅ [Koko-Web] Google abierto correctamente');
          }
        } catch (error) {
          console.error('❌ [Koko-Web] Error:', error);
        }
      }
    };

    autoOpenBrowser();

    // Cleanup: Ocultar BrowserView cuando el componente se desmonta
    return () => {
      if (isElectron && window.electronAPI?.puppeteerBrowser) {
        window.electronAPI.puppeteerBrowser.hide()
          .then(() => console.log('🙈 [Koko-Web] BrowserView oculto al salir de Koko-Web'))
          .catch((error: Error) => console.warn('⚠️ [Koko-Web] Error ocultando BrowserView:', error));
      }
    };
  }, [isElectron]); // Se ejecuta cuando isElectron cambia a true

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

  // Efecto para escuchar eventos de nueva pestaña desde Electron
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleCreateNewTab = (url: string, title?: string) => {
      console.log('🆕 [SimpleKokoWeb] Recibida solicitud de nueva pestaña:', { url, title });
      createNewTab(url || 'https://www.google.com', title || 'Nueva Pestaña');
    };

    // Registrar el listener usando la API específica
    window.electronAPI.navigation.onCreateNewTab(handleCreateNewTab);
    
    return () => {
      // Limpiar el listener
      window.electronAPI?.navigation.removeCreateNewTabListener();
    };
  }, [createNewTab]);

  // Función para validar y normalizar URL
  const normalizeUrl = (input: string): string => {
    const trimmedInput = input.trim();
    
    console.log('🔧 [URL Normalizer] Input:', trimmedInput);
    
    // Si ya tiene protocolo, retornar tal cual
    if (trimmedInput.startsWith('http://') || trimmedInput.startsWith('https://')) {
      console.log('✅ [URL Normalizer] Ya tiene protocolo:', trimmedInput);
      return trimmedInput;
    }
    
    // Si contiene espacios, es una búsqueda
    if (trimmedInput.includes(' ')) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmedInput)}`;
      console.log('🔍 [URL Normalizer] Búsqueda detectada:', searchUrl);
      return searchUrl;
    }
    
    // Dominios populares sin TLD
    const popularDomains: { [key: string]: string } = {
      'youtube': 'https://www.youtube.com',
      'yt': 'https://www.youtube.com',
      'google': 'https://www.google.com',
      'facebook': 'https://www.facebook.com',
      'fb': 'https://www.facebook.com',
      'twitter': 'https://www.twitter.com',
      'x': 'https://www.x.com',
      'instagram': 'https://www.instagram.com',
      'ig': 'https://www.instagram.com',
      'github': 'https://www.github.com',
      'reddit': 'https://www.reddit.com',
      'amazon': 'https://www.amazon.com',
      'netflix': 'https://www.netflix.com',
      'twitch': 'https://www.twitch.tv',
      'discord': 'https://www.discord.com',
      'wikipedia': 'https://www.wikipedia.org',
      'wiki': 'https://www.wikipedia.org'
    };
    
    const lowerInput = trimmedInput.toLowerCase();
    if (popularDomains[lowerInput]) {
      console.log('🌟 [URL Normalizer] Dominio popular detectado:', popularDomains[lowerInput]);
      return popularDomains[lowerInput];
    }
    
    // Si contiene punto, asumir que es un dominio
    if (trimmedInput.includes('.')) {
      const url = `https://${trimmedInput}`;
      console.log('🌐 [URL Normalizer] Dominio con punto:', url);
      return url;
    }
    
    // Si no tiene espacios ni puntos, hacer búsqueda
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmedInput)}`;
    console.log('🔍 [URL Normalizer] Búsqueda de palabra única:', searchUrl);
    return searchUrl;
  };

  // Función para abrir URL en Puppeteer Browser embebido
  const openInPuppeteerBrowser = async (url: string) => {
    if (!window.electronAPI?.puppeteerBrowser) {
      console.warn('⚠️ [Puppeteer] API no disponible');
      return false;
    }

    setIsPuppeteerLoading(true);
    
    try {
      // Normalizar URL antes de abrir
      const normalizedUrl = normalizeUrl(url);
      console.log('🎯 [Puppeteer] URL normalizada:', normalizedUrl);
      
      const result = await window.electronAPI.puppeteerBrowser.open(normalizedUrl);
      
      if (result.success) {
        console.log('✅ [Puppeteer] URL abierta:', normalizedUrl);
        setIsPuppeteerOpen(true);
        setPuppeteerUrl(normalizedUrl);
        
        // Mostrar el BrowserView inmediatamente después de abrirlo
        await window.electronAPI.puppeteerBrowser.show();
        console.log('👁️ [Puppeteer] BrowserView mostrado');
        
        return true;
      } else {
        console.error('❌ [Puppeteer] Error:', result.error);
        alert(`Error al abrir en navegador embebido: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('❌ [Puppeteer] Error:', error);
      alert('Error al abrir navegador embebido');
      return false;
    } finally {
      setIsPuppeteerLoading(false);
    }
  };

  // Función para cerrar Puppeteer Browser
  const closePuppeteerBrowser = async () => {
    if (!window.electronAPI?.puppeteerBrowser) return;

    try {
      await window.electronAPI.puppeteerBrowser.close();
      setIsPuppeteerOpen(false);
      console.log('🔴 [Puppeteer] Navegador cerrado');
    } catch (error) {
      console.error('❌ [Puppeteer] Error al cerrar:', error);
    }
  };

  const handleNavigate = async (tabId: string, url: string) => {
    try {
      console.log('🚀 [Koko-Web] Navegación detectada →', {
        tabId,
        url,
        isSearchMode: isSearchMode,
        activeTabId: activeTabId,
        source: 'handleNavigate'
      });

      // 🎭 Usar SOLO Puppeteer Browser embebido
      if (isElectron && window.electronAPI?.puppeteerBrowser) {
        console.log('🎭 [Puppeteer] Usando navegador embebido');
        await openInPuppeteerBrowser(url);
        return; // ⚡ SALIR - Solo Puppeteer
      }
      
      // Si no hay Electron, mostrar mensaje
      console.warn('⚠️ Puppeteer no disponible, ejecuta con Electron');
      alert('Por favor, ejecuta la aplicación con Electron para usar el navegador embebido.');
      return;
      
      // 🔍 VERIFICACIÓN CRÍTICA: Solo interceptar si realmente es una búsqueda sin formato
      if (isSearchQuery(url)) {
        console.log('🔍 BÚSQUEDA INTERCEPTADA:', url);
        await performIntegratedSearch(url);
        return; // ⚡ SALIR - No continuar con navegación normal
      }
      
      console.log('🌐 NAVEGACIÓN NORMAL - NO interceptada:', url);
      
      // 🛑 BLOQUEO ADICIONAL: Si ya estamos en modo búsqueda, no navegar a menos que sea explícito
      if (isSearchMode) {
        console.log('🛑 Ya en modo búsqueda, ignorando navegación automática:', url);
        return;
      }
      
      // ⚡ VERIFICACIÓN PREVIA: Detectar dominios problemáticos ANTES de intentar cargar
      // COMPLETAMENTE DESACTIVADO - No hay dominios problemáticos
      
      if (false) { // DESACTIVADO: No abrir ventanas externas automáticamente
        console.log('🛑 DOMINIO PROBLEMÁTICO DETECTADO - Forzando ventana externa INMEDIATAMENTE:', url);
        
        try {
          const result = await window.electronAPI?.navigation.openBrowserTab(url);
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
      
      // 🧠 DESACTIVADO: No usar navegación inteligente automática
      if (false) { // DESACTIVADO: Sistema de navegación inteligente
        console.log('🎯 Usando sistema de navegación inteligente para análisis adicional');
        
        try {
          const result = await window.electronAPI?.navigation.openBrowserTab(url);
          console.log('✅ Resultado de navegación inteligente:', result);
          
          if (result?.method === 'external-window') {
            // La página se abrió en ventana externa
            updateTab(tabId, { 
              title: 'Abierto en ventana externa',
              url: url,
              isLoading: false 
            });
            return;
          } else if (result?.method === 'internal-webview') {
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
      
      // Establecer timeout de carga para evitar que se quede cargando indefinidamente
      setLoadingTimeout(tabId);
      
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
    createNewTab(); // Usa los valores por defecto (Google)
  };

  const handleWebviewLoad = (tabId: string) => {
    console.log('✅ [LOAD] Página cargada para pestaña:', tabId);
    
    // Limpiar timeout si existe
    const timeoutId = loadingTimeouts.get(tabId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      setLoadingTimeouts(prev => {
        const newMap = new Map(prev);
        newMap.delete(tabId);
        return newMap;
      });
    }
    
    updateTab(tabId, { isLoading: false });
    
    // Verificar que se actualizó correctamente
    setTimeout(() => {
      const tab = tabs.find((t: Tab) => t.id === tabId);
      if (tab?.isLoading) {
        console.warn('⚠️ [LOAD] Estado isLoading no se actualizó, forzando actualización');
        updateTab(tabId, { isLoading: false });
      }
    }, 100);
  };

  const handleWebviewError = (tabId: string, error: string) => {
    console.error(`❌ Error de carga: ${error}`);
    
    // Limpiar timeout si existe
    const timeoutId = loadingTimeouts.get(tabId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      setLoadingTimeouts((prev: Map<string, number>) => {
        const newMap = new Map(prev);
        newMap.delete(tabId);
        return newMap;
      });
    }
    
    updateTab(tabId, { isLoading: false });
  };

  // Función para establecer timeout de carga
  const setLoadingTimeout = (tabId: string) => {
    // Limpiar timeout anterior si existe
    const existingTimeout = loadingTimeouts.get(tabId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Establecer nuevo timeout de 10 segundos
    const timeoutId = window.setTimeout(() => {
      console.warn('⏰ [TIMEOUT] Forzando finalización de carga para pestaña:', tabId);
      updateTab(tabId, { isLoading: false });
      setLoadingTimeouts((prev: Map<string, number>) => {
        const newMap = new Map(prev);
        newMap.delete(tabId);
        return newMap;
      });
    }, 10000); // 10 segundos timeout
    
    setLoadingTimeouts((prev: Map<string, number>) => {
      const newMap = new Map(prev);
      newMap.set(tabId, timeoutId);
      return newMap;
    });
  };

  // Manejador para actualizar URL y título cuando el webview navega
  const handleUrlChange = (url: string, title?: string) => {
    // FIX ULTRA AGRESIVO - SOLO CAMBIOS REALES
    if (!activeTab || !url) return;
    
    // Función para normalizar URLs eliminando parámetros problemáticos
    const normalizeUrl = (inputUrl: string): string => {
      try {
        const urlObj = new URL(inputUrl);
        // Eliminar parámetros que causan bucles
        urlObj.searchParams.delete('zx'); // Google timestamp parameter
        urlObj.searchParams.delete('no_sw_cr'); // Google service worker parameter
        urlObj.searchParams.delete('_t'); // Otros timestamps
        urlObj.searchParams.delete('timestamp'); // Timestamps genéricos
        return urlObj.toString();
      } catch {
        return inputUrl; // Si falla el parsing, usar URL original
      }
    };
    
    const normalizedNewUrl = normalizeUrl(url);
    const normalizedCurrentUrl = normalizeUrl(activeTab.url);
    
    console.log('🔄 [URL Change] Comparando URLs:', {
      current: normalizedCurrentUrl,
      new: normalizedNewUrl,
      same: normalizedCurrentUrl === normalizedNewUrl
    });
    
    // Verificación inteligente de cambio real
    if (normalizedCurrentUrl === normalizedNewUrl) {
      console.log('🚫 [URL Change] URLs normalizadas son iguales - Ignorando');
      return;
    }
    
    // Bloqueo total YouTube playlists  
    if (url.includes('youtube.com/watch') && activeTab.url.includes('youtube.com/watch')) {
      console.log('🚫 [URL Change] Bloqueando cambio en YouTube playlist');
      return; // NO actualizar nunca en playlists
    }
    
    console.log('✅ [URL Change] Actualizando URL de pestaña');
    // Actualización directa sin logs
    updateTab(activeTab.id, { 
      url, 
      title: title || activeTab.title || 'Sin título' 
    });
  };

  return (
    <div className="simple-koko-web">

      {/* 📑 Barra de Pestañas */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={switchTab}
        onTabClose={closeTab}
        onNewTab={handleNewTab}
      />

      {/* 🎭 Panel de Control de Puppeteer Browser */}
      {isElectron && (
        <div className="puppeteer-control-panel">
          <div className="puppeteer-control-content">
            <span className="puppeteer-label">🎭 Navegador Embebido:</span>
            <input
              type="text"
              className="puppeteer-url-input"
              placeholder="Ingresa URL (ej: youtube.com)"
              value={puppeteerUrl}
              onChange={(e) => setPuppeteerUrl(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  openInPuppeteerBrowser(puppeteerUrl);
                }
              }}
              disabled={isPuppeteerLoading}
            />
          </div>
        </div>
      )}

      <div className="web-content">
        {/* Overlay de modo búsqueda */}
        {isSearchMode && (
          <div className="search-overlay">
            <div className="search-overlay-content">
              <h3>🔍 Búsqueda Integrada</h3>
              <p>Buscando: <strong>{searchQuery}</strong></p>
              <div className="search-results-container">
                {searchResults.length > 0 ? (
                  <div className="search-results">
                    {searchResults.map((result, index) => (
                      <div
                        key={index}
                        className="search-result-item"
                        onClick={() => handleSearchResultClick(result)}
                      >
                        <h4>{result.title}</h4>
                        <p className="search-result-snippet">{result.snippet}</p>
                        <span className="search-result-link">{result.link}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="search-loading">
                    <div className="spinner"></div>
                    <p>Cargando resultados...</p>
                  </div>
                )}
              </div>
              <button className="close-search-btn" onClick={exitSearchMode}>
                ❌ Cerrar Búsqueda
              </button>
            </div>
          </div>
        )}
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
});

export default SimpleKokoWeb;