// Google Custom Search API Integration
// Usa la Google Custom Search JSON API para obtener resultados reales

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  pagemap?: {
    cse_thumbnail?: Array<{ src: string }>;
    metatags?: Array<{ [key: string]: string }>;
  };
}

interface GoogleSearchResponse {
  items?: GoogleSearchResult[];
  searchInformation?: {
    totalResults: string;
    searchTime: number;
  };
  error?: {
    message: string;
    code: number;
  };
}

// Configuración de la API (usar variables de entorno en producción)
const CONFIG = {
  API_KEY: (window as any).electronAPI?.getEnv?.('REACT_APP_GOOGLE_API_KEY') || "AIzaSyAaHKxiImxRkaYz0g77cOLXBoMxcrIBUoo", 
  CX: (window as any).electronAPI?.getEnv?.('REACT_APP_GOOGLE_CX') || "90e8c39f0bf7744b5", // ID del motor de búsqueda personalizado
  BASE_URL: "https://www.googleapis.com/customsearch/v1"
};

/**
 * Realiza una búsqueda en Google usando la Custom Search JSON API
 * @param query - Término de búsqueda
 * @param options - Opciones adicionales de búsqueda
 * @returns Promesa con los resultados de búsqueda
 */
export async function searchGoogle(
  query: string, 
  options: { 
    start?: number; 
    num?: number; 
    safe?: 'active' | 'off';
    lr?: string;
  } = {}
): Promise<GoogleSearchResult[]> {
  try {
    if (!query.trim()) {
      console.warn('⚠️ Consulta de búsqueda vacía');
      return [];
    }

    // Parámetros de la consulta
    const params = new URLSearchParams({
      key: CONFIG.API_KEY,
      cx: CONFIG.CX,
      q: encodeURIComponent(query.trim()),
      start: (options.start || 1).toString(),
      num: Math.min(options.num || 10, 10).toString(), // Máximo 10 resultados
      safe: options.safe || 'active',
    });

    // Agregar idioma si se especifica
    if (options.lr) {
      params.append('lr', options.lr);
    }

    const url = `${CONFIG.BASE_URL}?${params.toString()}`;
    
    console.log('🔍 Realizando búsqueda en Google:', query);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }

    const data: GoogleSearchResponse = await response.json();

    // Verificar si hay error en la respuesta
    if (data.error) {
      console.error('❌ Error de Google API:', data.error);
      throw new Error(`Google API Error: ${data.error.message}`);
    }

    const results = data.items || [];
    
    console.log(`✅ Encontrados ${results.length} resultados para: "${query}"`);
    
    return results;

  } catch (error) {
    console.error('❌ Error en búsqueda de Google:', error);
    
    // Retornar resultados mock en caso de error para desarrollo o si las credenciales no son válidas
    if (error instanceof Error && (error.message.includes('403') || error.message.includes('API'))) {
      console.log('🔧 Error de API: Retornando resultados mock para demostración');
      return getMockResults(query);
    }
    
    throw error;
  }
}

/**
 * Búsqueda específica para imágenes
 * @param query - Término de búsqueda
 * @param options - Opciones adicionales
 */
export async function searchGoogleImages(
  query: string,
  options: { start?: number; num?: number } = {}
): Promise<GoogleSearchResult[]> {
  return searchGoogle(query, {
    ...options,
    // Agregar parámetros específicos para imágenes si se necesita
  });
}

/**
 * Búsqueda con sugerencias automáticas
 * @param query - Término parcial de búsqueda
 */
export async function getSearchSuggestions(query: string): Promise<string[]> {
  // Implementación básica - se puede mejorar con Google Autocomplete API
  try {
    const response = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    return data[1] || [];
  } catch (error) {
    console.error('Error obteniendo sugerencias:', error);
    return [];
  }
}

/**
 * Resultados mock para desarrollo y testing
 */
function getMockResults(query: string): GoogleSearchResult[] {
  return [
    {
      title: `Resultados para "${query}" - Gmail`,
      link: "https://gmail.com",
      snippet: "Gmail es un servicio de correo electrónico basado en la web con tecnología de búsqueda de Google y 15 GB de almacenamiento.",
      displayLink: "gmail.com"
    },
    {
      title: `${query} - Wikipedia`,
      link: `https://es.wikipedia.org/wiki/${encodeURIComponent(query)}`,
      snippet: `Wikipedia es una enciclopedia libre que todos pueden editar. Encuentra información sobre ${query} y miles de otros temas.`,
      displayLink: "es.wikipedia.org"
    },
    {
      title: `${query} - YouTube`,
      link: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      snippet: `Encuentra los mejores videos sobre ${query} en YouTube. Millones de videos esperando por ti.`,
      displayLink: "youtube.com"
    },
    {
      title: `Noticias sobre ${query} - Google News`,
      link: `https://news.google.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Las últimas noticias sobre ${query}. Mantente informado con Google News.`,
      displayLink: "news.google.com"
    },
    {
      title: `${query} - Stack Overflow`,
      link: `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Encuentra respuestas a preguntas de programación sobre ${query} en Stack Overflow, la comunidad más grande de desarrolladores.`,
      displayLink: "stackoverflow.com"
    },
    {
      title: `Imágenes de ${query} - Google Images`,
      link: `https://images.google.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Explora millones de imágenes relacionadas con ${query}. Encuentra fotos, ilustraciones y gráficos.`,
      displayLink: "images.google.com"
    }
  ];
}

/**
 * Validar configuración de la API
 */
export function validateAPIConfig(): { isValid: boolean; message: string } {
  if (!CONFIG.API_KEY || CONFIG.API_KEY.includes('Dummy')) {
    return {
      isValid: false,
      message: 'API Key de Google no configurada. Agrega REACT_APP_GOOGLE_API_KEY a tu archivo .env'
    };
  }
  
  if (!CONFIG.CX || CONFIG.CX.includes('example')) {
    return {
      isValid: false,
      message: 'Custom Search Engine ID no configurado. Agrega REACT_APP_GOOGLE_CX a tu archivo .env'
    };
  }
  
  return {
    isValid: true,
    message: 'Configuración de API válida'
  };
}

export type { GoogleSearchResult, GoogleSearchResponse };