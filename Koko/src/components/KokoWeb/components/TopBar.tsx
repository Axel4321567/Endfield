import React, { useState } from 'react';
import './TopBar.css';

interface TopBarProps {
  url: string;
  setUrl: (url: string) => void;
  setStatus: (status: string) => void;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  webviewRef?: React.RefObject<any>;
  isElectron?: boolean;
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
    info: 'Motor de búsqueda más popular',
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
    color: '#ff0000'
  }
];

const TopBar: React.FC<TopBarProps> = ({ 
  url, 
  setUrl, 
  setStatus, 
  iframeRef, 
  webviewRef, 
  isElectron = false 
}) => {
  const [inputValue, setInputValue] = useState(url);
  const [currentSearchEngine, setCurrentSearchEngine] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sitios de prueba que funcionan bien
  const testSites: Record<string, string> = {
    'test': 'https://example.com',
    'wikipedia': 'https://en.wikipedia.org',
    'github': 'https://github.com',
    'stackoverflow': 'https://stackoverflow.com',
    'mdn': 'https://developer.mozilla.org',
    'w3schools': 'https://www.w3schools.com',
    'youtube': 'https://www.youtube.com',
    'reddit': 'https://www.reddit.com',
    'news': 'https://news.ycombinator.com'
  };

  const handleNavigate = () => {
    let finalUrl = inputValue.trim();
    
    if (!finalUrl) return;

    // Comandos especiales
    const lowerInput = finalUrl.toLowerCase();
    if (testSites[lowerInput]) {
      finalUrl = testSites[lowerInput];
      setStatus(`Navegando a ${lowerInput}...`);
    }
    // URL completa
    else if (finalUrl.startsWith('http://') || finalUrl.startsWith('https://')) {
      setStatus('Navegando...');
    }
    // Dominio (contiene punto)
    else if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
      finalUrl = `https://${finalUrl}`;
      setStatus('Navegando...');
    }
    // Búsqueda
    else {
      const engine = searchEngines[currentSearchEngine];
      finalUrl = engine.searchUrl + encodeURIComponent(finalUrl);
      setStatus(`Buscando "${inputValue}" en ${engine.name}...`);
    }

    setUrl(finalUrl);
    setInputValue(finalUrl);
    setShowSuggestions(false);
    
    // Navegar según el entorno
    if (isElectron && webviewRef?.current) {
      webviewRef.current.src = finalUrl;
    } else if (iframeRef?.current) {
      iframeRef.current.src = finalUrl;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleBack = () => {
    if (isElectron && webviewRef?.current) {
      webviewRef.current.goBack();
    } else if (iframeRef?.current?.contentWindow) {
      iframeRef.current.contentWindow.history.back();
    }
    setStatus('Navegando atrás...');
  };

  const handleForward = () => {
    if (isElectron && webviewRef?.current) {
      webviewRef.current.goForward();
    } else if (iframeRef?.current?.contentWindow) {
      iframeRef.current.contentWindow.history.forward();
    }
    setStatus('Navegando adelante...');
  };

  const handleReload = () => {
    if (isElectron && webviewRef?.current) {
      webviewRef.current.reload();
    } else if (iframeRef?.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
    setStatus('Recargando...');
  };

  const handleHomeNavigation = () => {
    const engine = searchEngines[currentSearchEngine];
    setUrl(engine.baseUrl);
    setInputValue(engine.baseUrl);
    setStatus(`Navegando a ${engine.name}...`);
    
    if (isElectron && webviewRef?.current) {
      webviewRef.current.src = engine.baseUrl;
    } else if (iframeRef?.current) {
      iframeRef.current.src = engine.baseUrl;
    }
  };

  const handleSearchEngineChange = () => {
    setCurrentSearchEngine((prev) => (prev + 1) % searchEngines.length);
  };

  const getSuggestions = () => {
    if (!inputValue.trim() || inputValue.startsWith('http')) return [];
    
    const input = inputValue.toLowerCase();
    return Object.keys(testSites).filter(site => 
      site.includes(input) || input.includes(site)
    ).slice(0, 5);
  };

  const currentEngine = searchEngines[currentSearchEngine];

  return (
    <div className="top-bar">
      {/* Botones de navegación */}
      <div className="nav-buttons">
        <button
          onClick={handleBack}
          className="nav-button"
          title="Atrás"
        >
          ←
        </button>
        <button
          onClick={handleForward}
          className="nav-button"
          title="Adelante"
        >
          →
        </button>
        <button
          onClick={handleReload}
          className="nav-button"
          title="Recargar"
        >
          ⟳
        </button>
        <button
          onClick={handleHomeNavigation}
          className="search-engine-button"
          style={{ backgroundColor: currentEngine.color }}
          title={`${currentEngine.name} - ${currentEngine.info}`}
        >
          {currentEngine.name}
        </button>
        <button
          onClick={handleSearchEngineChange}
          className="settings-button"
          title="Cambiar motor de búsqueda"
        >
          ⚙️
        </button>
      </div>

      {/* Barra de direcciones */}
      <div className="address-bar-container">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(e.target.value.length > 0 && !e.target.value.startsWith('http'));
          }}
          onKeyPress={handleKeyPress}
          onFocus={() => setShowSuggestions(inputValue.length > 0 && !inputValue.startsWith('http'))}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={`Buscar en ${currentEngine.name}, URL o comandos: ${Object.keys(testSites).slice(0, 3).join(', ')}...`}
          className="address-input"
        />
        
        {/* Sugerencias */}
        {showSuggestions && getSuggestions().length > 0 && (
          <div className="suggestions-dropdown">
            {getSuggestions().map((suggestion, index) => (
              <div
                key={index}
                onClick={() => {
                  setInputValue(suggestion);
                  setShowSuggestions(false);
                  // Navegar automáticamente
                  const url = testSites[suggestion];
                  setUrl(url);
                  setStatus(`Navegando a ${suggestion}...`);
                  if (isElectron && webviewRef?.current) {
                    webviewRef.current.src = url;
                  } else if (iframeRef?.current) {
                    iframeRef.current.src = url;
                  }
                }}
                className="suggestion-item"
              >
                🔍 {suggestion} → {testSites[suggestion]}
              </div>
            ))}
          </div>
        )}
        
        <button
          onClick={handleNavigate}
          className="go-button"
        >
          IR
        </button>
      </div>
    </div>
  );
};

export default TopBar;