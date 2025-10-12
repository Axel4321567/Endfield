/**
 * 🔍 Google Search Service
 * Cliente para consumir el proxy de búsqueda de Google
 */

import { useState, useCallback } from 'react';

const PROXY_BASE_URL = 'http://localhost:8001';

interface SearchResponse {
  html: string;
  error?: string;
}

interface SearchMetadata {
  success: boolean;
  query: string;
  status_code?: number;
  url?: string;
  content_length?: number;
  error?: string;
}

/**
 * Realiza una búsqueda en Google a través del proxy
 */
export async function searchGoogle(query: string): Promise<SearchResponse> {
  try {
    console.log('🔍 [GoogleSearch] Buscando:', query);
    
    const response = await fetch(
      `${PROXY_BASE_URL}/search?q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'text/html',
        },
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      console.error('❌ [GoogleSearch] Error:', errorData);
      
      return {
        html: '',
        error: errorData.detail || errorData.error || `Error HTTP ${response.status}`
      };
    }
    
    const html = await response.text();
    console.log('✅ [GoogleSearch] Resultados recibidos:', html.length, 'bytes');
    
    return { html };
    
  } catch (error) {
    console.error('❌ [GoogleSearch] Error de conexión:', error);
    return {
      html: '',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene metadatos de la búsqueda (útil para debugging)
 */
export async function searchGoogleMetadata(query: string): Promise<SearchMetadata> {
  try {
    const response = await fetch(
      `${PROXY_BASE_URL}/search/json?q=${encodeURIComponent(query)}`
    );
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('❌ [GoogleSearch] Error obteniendo metadata:', error);
    return {
      success: false,
      query,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Verifica si el servicio proxy está disponible
 */
export async function checkProxyHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${PROXY_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 segundos timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [GoogleSearch] Proxy disponible:', data);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.warn('⚠️ [GoogleSearch] Proxy no disponible:', error);
    return false;
  }
}

/**
 * Hook de React para búsquedas de Google
 */
export function useGoogleSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string | null>(null);
  
  const search = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    
    const response = await searchGoogle(query);
    
    if (response.error) {
      setError(response.error);
      setResults(null);
    } else {
      setResults(response.html);
      setError(null);
    }
    
    setIsLoading(false);
  }, []);
  
  return { search, isLoading, error, results };
}

export default {
  searchGoogle,
  searchGoogleMetadata,
  checkProxyHealth,
  useGoogleSearch
};
