import React, { useState, useCallback } from 'react';
import { TabBar } from './TabBar';
import type { Tab as TabType } from '../../../hooks/useTabs';
import './BrowserTopBar.css';

interface BrowserTopBarProps {
  tabs: TabType[];
  activeTabId: string | null;
  activeTab: TabType | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  onNavigate: (tabId: string, url: string) => void;
  onSearch?: (query: string) => void; // Nueva función para búsqueda integrada
  onGoBack: (tabId: string) => void;
  onGoForward: (tabId: string) => void;
  onRefresh: (tabId: string) => void;
  onOpenBookmarks?: () => void;
  setStatus: (status: string) => void;
}

interface SearchEngine {
  name: string;
  baseUrl: string;
  searchUrl: string;
  info: string;
  color: string;
}

const searchEngines: SearchEngine[] = [
  {
    name: 'Google',
    baseUrl: 'https://www.google.com',
    searchUrl: 'https://www.google.com/search?q=',
    info: 'Motor de búsqueda más popular (Se abre en ventana externa)',
    color: '#4285f4'
  },
  {
    name: 'DuckDuckGo',
    baseUrl: 'https://duckduckgo.com',
    searchUrl: 'https://duckduckgo.com/?q=',
    info: 'Búsqueda privada sin rastreo',
    color: '#de5833'
  },
  {
    name: 'Bing',
    baseUrl: 'https://www.bing.com',
    searchUrl: 'https://www.bing.com/search?q=',
    info: 'Motor de búsqueda de Microsoft',
    color: '#0078d4'
  },
  {
    name: 'Startpage',
    baseUrl: 'https://www.startpage.com',
    searchUrl: 'https://www.startpage.com/sp/search?query=',
    info: 'Proxy privado de Google',
    color: '#1a472a'
  },
  {
    name: 'Yandex',
    baseUrl: 'https://yandex.com',
    searchUrl: 'https://yandex.com/search/?text=',
    info: 'Motor de búsqueda ruso',
    color: '#fc3f1d'
  }
];

// Iconos SVG
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

const ForwardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
  </svg>
);

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
  </svg>
);

export const BrowserTopBar = React.memo(({
  tabs,
  activeTabId,
  activeTab,
  onTabSelect,
  onTabClose,
  onNewTab,
  onNavigate,
  onSearch,
  onGoBack,
  onGoForward,
  onRefresh,
  onOpenBookmarks,
  setStatus
}: BrowserTopBarProps) => {
  const [addressValue, setAddressValue] = useState(activeTab?.url || '');
  const [selectedEngine, setSelectedEngine] = useState(searchEngines[0]);
  const [showEngineDropdown, setShowEngineDropdown] = useState(false);

  React.useEffect(() => {
    if (activeTab && activeTab.url !== addressValue) {
      setAddressValue(activeTab.url);
    }
  }, [activeTab?.url, addressValue]);

  const isUrl = (text: string): boolean => {
    const urlPattern = /^(https?:\/\/)|(www\.)|(\w+\.\w+)/;
    return urlPattern.test(text.trim());
  };

  const handleNavigation = useCallback((inputValue: string) => {
    if (!activeTabId) return;

    let finalUrl = inputValue.trim();
    
    if (!finalUrl) {
      finalUrl = selectedEngine.baseUrl;
      setStatus(`Navegando a: ${finalUrl}`);
      onNavigate(activeTabId, finalUrl);
    } else if (isUrl(finalUrl)) {
      // Es una URL
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      setStatus(`Navegando a: ${finalUrl}`);
      onNavigate(activeTabId, finalUrl);
    } else {
      // Es una búsqueda - usar búsqueda integrada si está disponible
      if (onSearch) {
        console.log('🔍 [TopBar] Usando búsqueda integrada para:', finalUrl);
        setStatus(`Buscando: ${finalUrl}`);
        onSearch(finalUrl);
      } else {
        // Fallback a motor de búsqueda tradicional
        finalUrl = selectedEngine.searchUrl + encodeURIComponent(finalUrl);
        setStatus(`Navegando a: ${finalUrl}`);
        onNavigate(activeTabId, finalUrl);
      }
    }
  }, [activeTabId, selectedEngine, onNavigate, onSearch, setStatus]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNavigation(addressValue);
    }
  };

  const handleEngineSelect = (engine: SearchEngine) => {
    setSelectedEngine(engine);
    setShowEngineDropdown(false);
    setStatus(`Motor de búsqueda cambiado a: ${engine.name}`);
  };

  const handleGoHome = () => {
    if (activeTabId) {
      handleNavigation(selectedEngine.baseUrl);
    }
  };

  if (tabs.length === 0) {
    return (
      <div className="browser-top-bar">
        <div className="empty-browser">
          <button className="home-button" onClick={onNewTab}>
            <HomeIcon />
            <span>Nueva pestaña</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="browser-top-bar">
      {/* Barra de pestañas */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
        onNewTab={onNewTab}
      />

      {/* Controles de navegación */}
      <div className="navigation-bar">
        <div className="nav-controls">
          <button
            className={`nav-button ${!activeTab?.canGoBack ? 'disabled' : ''}`}
            onClick={() => activeTabId && onGoBack(activeTabId)}
            disabled={!activeTab?.canGoBack}
            title="Atrás"
          >
            <BackIcon />
          </button>

          <button
            className={`nav-button ${!activeTab?.canGoForward ? 'disabled' : ''}`}
            onClick={() => activeTabId && onGoForward(activeTabId)}
            disabled={!activeTab?.canGoForward}
            title="Adelante"
          >
            <ForwardIcon />
          </button>

          <button
            className="nav-button"
            onClick={() => activeTabId && onRefresh(activeTabId)}
            title="Recargar"
          >
            <RefreshIcon />
          </button>

          <button
            className="nav-button"
            onClick={handleGoHome}
            title="Inicio"
          >
            <HomeIcon />
          </button>

          {onOpenBookmarks && (
            <button
              className="nav-button"
              onClick={onOpenBookmarks}
              title="Marcadores"
            >
              ⭐
            </button>
          )}
        </div>

        {/* Barra de direcciones */}
        <div className="address-bar-container">
          <div className="search-engine-selector">
            <button
              className="engine-button"
              onClick={() => setShowEngineDropdown(!showEngineDropdown)}
              title={`Motor de búsqueda: ${selectedEngine.name}`}
            >
              <SearchIcon />
              <span className="engine-name">{selectedEngine.name}</span>
            </button>

            {showEngineDropdown && (
              <div className="engine-dropdown">
                {searchEngines.map((engine) => (
                  <button
                    key={engine.name}
                    className={`engine-option ${engine.name === selectedEngine.name ? 'selected' : ''}`}
                    onClick={() => handleEngineSelect(engine)}
                    style={{ borderLeft: `3px solid ${engine.color}` }}
                  >
                    <div className="engine-info">
                      <span className="engine-name">{engine.name}</span>
                      <span className="engine-description">{engine.info}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            type="text"
            className="address-input"
            value={addressValue}
            onChange={(e) => setAddressValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Buscar en ${selectedEngine.name} o escribir URL...`}
          />
        </div>

        <div className="browser-menu">
          <button className="menu-button" title="Menú">
            <MenuIcon />
          </button>
        </div>
      </div>
    </div>
  );
});