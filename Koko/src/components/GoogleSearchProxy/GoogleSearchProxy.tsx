import React, { useState, useEffect } from 'react';
import { searchGoogle, checkProxyHealth } from '../../services/GoogleSearchService';

interface GoogleSearchProxyProps {
  className?: string;
}

/**
 * 🔍 Componente de búsqueda de Google usando proxy
 * Evita la detección de bots al realizar búsquedas a través del backend
 */
const GoogleSearchProxy: React.FC<GoogleSearchProxyProps> = ({ className = '' }) => {
  const [query, setQuery] = useState('');
  const [searchHtml, setSearchHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proxyAvailable, setProxyAvailable] = useState<boolean | null>(null);

  // Verificar disponibilidad del proxy al montar
  useEffect(() => {
    const checkProxy = async () => {
      const available = await checkProxyHealth();
      setProxyAvailable(available);
      
      if (!available) {
        setError('Servicio de proxy no disponible. Ejecuta: cd src/Apis/SearchProxy && python main.py');
      }
    };
    
    checkProxy();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Por favor ingresa un término de búsqueda');
      return;
    }
    
    if (!proxyAvailable) {
      setError('Servicio de proxy no disponible');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await searchGoogle(query);
      
      if (response.error) {
        setError(response.error);
        setSearchHtml(null);
      } else {
        setSearchHtml(response.html);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setSearchHtml(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`google-search-proxy ${className}`}>
      {/* Estado del proxy */}
      <div className="proxy-status mb-4 p-3 rounded-lg">
        {proxyAvailable === null && (
          <div className="text-yellow-600 flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            Verificando servicio proxy...
          </div>
        )}
        {proxyAvailable === true && (
          <div className="text-green-600 flex items-center gap-2">
            <span>✅</span>
            Proxy disponible (puerto 8001)
          </div>
        )}
        {proxyAvailable === false && (
          <div className="text-red-600 flex items-center gap-2">
            <span>❌</span>
            Proxy no disponible
          </div>
        )}
      </div>

      {/* Formulario de búsqueda */}
      <form onSubmit={handleSearch} className="search-form mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en Google..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!proxyAvailable || isLoading}
          />
          <button
            type="submit"
            disabled={!proxyAvailable || isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳ Buscando...' : '🔍 Buscar'}
          </button>
        </div>
      </form>

      {/* Errores */}
      {error && (
        <div className="error-message p-4 bg-red-100 border border-red-400 rounded-lg mb-4">
          <p className="text-red-700">❌ {error}</p>
          {!proxyAvailable && (
            <div className="mt-2 text-sm text-red-600">
              <p>Para iniciar el proxy:</p>
              <code className="block mt-1 p-2 bg-red-50 rounded">
                cd src/Apis/SearchProxy<br/>
                python main.py
              </code>
            </div>
          )}
        </div>
      )}

      {/* Resultados */}
      {searchHtml && (
        <div className="results-container border border-gray-300 rounded-lg overflow-hidden">
          <div className="results-header p-3 bg-gray-100 border-b">
            <span className="text-sm text-gray-600">
              📄 Resultados de: <strong>{query}</strong>
            </span>
          </div>
          <iframe
            srcDoc={searchHtml}
            className="w-full h-[600px] border-0"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            title="Google Search Results"
          />
        </div>
      )}

      {/* Estado de carga */}
      {isLoading && (
        <div className="loading-state flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-2">⏳</div>
            <p className="text-gray-600">Buscando en Google...</p>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!searchHtml && !isLoading && !error && proxyAvailable && (
        <div className="empty-state text-center p-8 text-gray-500">
          <div className="text-6xl mb-4">🔍</div>
          <p>Ingresa un término de búsqueda para empezar</p>
        </div>
      )}
    </div>
  );
};

export default GoogleSearchProxy;
