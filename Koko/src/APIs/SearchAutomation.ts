// Search Automation Service
// Envía los resultados de búsqueda al backend para recopilación de datos

interface SearchData {
  query: string;
  results: Array<{
    title: string;
    link: string;
    snippet: string;
    displayLink: string;
  }>;
  timestamp: string;
  userAgent: string;
  totalResults?: number;
  searchTime?: number;
}

interface AutomationConfig {
  backendUrl: string;
  enableLogging: boolean;
  maxRetries: number;
  retryDelay: number;
}

// Configuración del servicio de automatización
const AUTOMATION_CONFIG: AutomationConfig = {
  backendUrl: (window as any).electronAPI?.getEnv?.('REACT_APP_BACKEND_URL') || 'http://localhost:3001/api',
  enableLogging: true,
  maxRetries: 3,
  retryDelay: 1000, // 1 segundo
};

/**
 * Envía los datos de búsqueda al backend
 * @param searchData - Datos de la búsqueda realizada
 * @returns Promesa que resuelve cuando se envían los datos
 */
export async function sendSearchDataToBackend(searchData: SearchData): Promise<boolean> {
  if (!AUTOMATION_CONFIG.enableLogging) {
    console.log('📊 Logging deshabilitado, omitiendo envío al backend');
    return true;
  }

  let attempts = 0;
  
  while (attempts < AUTOMATION_CONFIG.maxRetries) {
    try {
      attempts++;
      
      console.log(`📤 Enviando datos al backend (intento ${attempts}/${AUTOMATION_CONFIG.maxRetries})`);
      
      const response = await fetch(`${AUTOMATION_CONFIG.backendUrl}/search-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'KokoSearch',
        },
        body: JSON.stringify(searchData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Datos enviados exitosamente al backend:', result);
      
      return true;

    } catch (error) {
      console.warn(`⚠️ Error en intento ${attempts}:`, error);
      
      if (attempts >= AUTOMATION_CONFIG.maxRetries) {
        console.error('❌ Falló el envío después de todos los intentos');
        return false;
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, AUTOMATION_CONFIG.retryDelay));
    }
  }
  
  return false;
}

/**
 * Procesa y formatea los resultados de búsqueda para envío
 * @param query - Consulta de búsqueda
 * @param results - Resultados obtenidos de Google
 * @param metadata - Metadatos adicionales
 */
export async function processSearchResults(
  query: string,
  results: Array<{
    title: string;
    link: string;
    snippet: string;
    displayLink: string;
  }>,
  metadata?: {
    totalResults?: number;
    searchTime?: number;
  }
): Promise<void> {
  try {
    const searchData: SearchData = {
      query: query.trim(),
      results: results.slice(0, 10), // Limitar a 10 resultados
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      totalResults: metadata?.totalResults,
      searchTime: metadata?.searchTime,
    };

    // Enviar datos de forma asíncrona (no bloquear la UI)
    sendSearchDataToBackend(searchData).catch(error => {
      console.error('Error en envío asíncrono:', error);
    });

    // También guardar localmente como backup
    await saveSearchLocally(searchData);

  } catch (error) {
    console.error('❌ Error procesando resultados de búsqueda:', error);
  }
}

/**
 * Guarda los datos de búsqueda localmente como backup
 * @param searchData - Datos a guardar
 */
async function saveSearchLocally(searchData: SearchData): Promise<void> {
  try {
    const storageKey = 'koko_search_history';
    const existingData = localStorage.getItem(storageKey);
    let history = existingData ? JSON.parse(existingData) : [];

    // Agregar nueva búsqueda
    history.unshift(searchData);

    // Mantener solo las últimas 100 búsquedas
    if (history.length > 100) {
      history = history.slice(0, 100);
    }

    localStorage.setItem(storageKey, JSON.stringify(history));
    console.log('💾 Búsqueda guardada localmente');

  } catch (error) {
    console.error('Error guardando búsqueda localmente:', error);
  }
}

/**
 * Obtiene el historial de búsquedas local
 * @param limit - Número máximo de resultados a retornar
 */
export function getLocalSearchHistory(limit: number = 50): SearchData[] {
  try {
    const storageKey = 'koko_search_history';
    const existingData = localStorage.getItem(storageKey);
    
    if (!existingData) return [];
    
    const history = JSON.parse(existingData);
    return Array.isArray(history) ? history.slice(0, limit) : [];

  } catch (error) {
    console.error('Error obteniendo historial local:', error);
    return [];
  }
}

/**
 * Limpia el historial de búsquedas local
 */
export function clearLocalSearchHistory(): void {
  try {
    localStorage.removeItem('koko_search_history');
    console.log('🗑️ Historial de búsquedas limpiado');
  } catch (error) {
    console.error('Error limpiando historial:', error);
  }
}

/**
 * Envía estadísticas de uso al backend
 * @param stats - Estadísticas de uso
 */
export async function sendUsageStats(stats: {
  action: string;
  timestamp: string;
  details?: any;
}): Promise<void> {
  try {
    if (!AUTOMATION_CONFIG.enableLogging) return;

    await fetch(`${AUTOMATION_CONFIG.backendUrl}/usage-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'KokoSearch',
      },
      body: JSON.stringify(stats),
    });

  } catch (error) {
    console.warn('⚠️ Error enviando estadísticas:', error);
  }
}

/**
 * Configura el servicio de automatización
 * @param config - Nueva configuración
 */
export function configureAutomation(config: Partial<AutomationConfig>): void {
  Object.assign(AUTOMATION_CONFIG, config);
  console.log('🔧 Configuración de automatización actualizada:', AUTOMATION_CONFIG);
}

/**
 * Obtiene la configuración actual
 */
export function getAutomationConfig(): AutomationConfig {
  return { ...AUTOMATION_CONFIG };
}

export type { SearchData, AutomationConfig };