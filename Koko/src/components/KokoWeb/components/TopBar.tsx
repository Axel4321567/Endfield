import React from 'react';

interface TopBarProps {
  url: string;
  setUrl: (url: string) => void;
  setStatus: (status: string) => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

const TopBar: React.FC<TopBarProps> = ({ url, setUrl, setStatus, iframeRef }) => {
  const [inputValue, setInputValue] = React.useState(url);

  const handleNavigate = () => {
    let finalUrl = inputValue.trim();
    
    // Si no contiene http, tratarlo como búsqueda en Google
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (!finalUrl.includes('.')) {
        // Usar Google Custom Search (embed) que permite iframe
        finalUrl = `https://cse.google.com/cse?cx=partner-pub-4485363269731523:4384987261&ie=UTF-8&q=${encodeURIComponent(finalUrl)}`;
        setStatus(`Buscando "${inputValue}" en Google...`);
      } else {
        finalUrl = `https://${finalUrl}`;
      }
    }

    // Lista de sitios que funcionan bien en iframe
    const testSites: Record<string, string> = {
      'test': 'https://example.com',
      'wikipedia': 'https://en.wikipedia.org',
      'github': 'https://github.com',
      'stackoverflow': 'https://stackoverflow.com',
      'mdn': 'https://developer.mozilla.org',
      'w3schools': 'https://www.w3schools.com'
    };

    // Si es un comando de prueba, usar el sitio correspondiente
    const lowerInput = inputValue.toLowerCase().trim();
    if (testSites[lowerInput]) {
      finalUrl = testSites[lowerInput];
    }

    // Verificar si es Google y usar alternativa compatible
    if (finalUrl.includes('google.com')) {
      // Usar Startpage como proxy de Google que permite iframe
      const searchTerm = finalUrl.match(/q=([^&]*)/)?.[1] || '';
      if (searchTerm) {
        finalUrl = `https://www.startpage.com/sp/search?query=${searchTerm}`;
        setStatus('Redirigido a Startpage (proxy de Google compatible con iframe)');
      } else {
        finalUrl = 'https://www.startpage.com';
        setStatus('Redirigido a Startpage (alternativa a Google)');
      }
    }

    setUrl(finalUrl);
    setInputValue(finalUrl);
    setStatus('cargando...');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  const handleBack = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.history.back();
    }
  };

  const handleForward = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.history.forward();
    }
  };

  const handleReload = () => {
    if (iframeRef.current) {
      setStatus('cargando...');
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-200 shadow-sm">
      {/* Botones de navegación */}
      <div className="flex gap-1">
        <button
          onClick={handleBack}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          title="Atrás"
        >
          ←
        </button>
        <button
          onClick={handleForward}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          title="Adelante"
        >
          →
        </button>
        <button
          onClick={handleReload}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          title="Recargar"
        >
          ⟳
        </button>
        <button
          onClick={() => {
            const engine = searchEngines[currentSearchEngine];
            setUrl(engine.baseUrl.replace(/search\?.*$/, '').replace(/\/$/, ''));
            setInputValue(engine.baseUrl.replace(/search\?.*$/, '').replace(/\/$/, ''));
            setStatus('cargando...');
          }}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
          title={`${searchEngines[currentSearchEngine].name} - ${searchEngines[currentSearchEngine].info}`}
        >
          {searchEngines[currentSearchEngine].name}
        </button>
        <button
          onClick={() => setCurrentSearchEngine((prev) => (prev + 1) % searchEngines.length)}
          className="px-2 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors"
          title="Cambiar motor de búsqueda"
        >
          ⚙️
        </button>
      </div>

      {/* Barra de direcciones */}
      <div className="flex-1 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Buscar en ${searchEngines[currentSearchEngine].name}, escribir URL o comandos: test, wikipedia, github...`}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleNavigate}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Ir
        </button>
      </div>
    </div>
  );
};

export default TopBar;