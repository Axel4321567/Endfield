/**
 * 💾 Browser Session Service
 * Servicio para persistir sesiones de navegador en la base de datos
 */

import { executeQuery, executeTransaction } from './database-service.js';

/**
 * Inicializar tabla de sesiones si no existe
 */
export async function initializeBrowserSessionTable() {
  try {
    // Crear tabla de sesiones si no existe
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS browser_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        session_name VARCHAR(255) DEFAULT 'default',
        active_tab_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_session (session_name)
      )
    `);
    
    // Crear tabla de tabs
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS browser_tabs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        session_id INT NOT NULL,
        tab_id VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        title VARCHAR(500),
        position INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES browser_sessions(id) ON DELETE CASCADE,
        INDEX idx_session_id (session_id),
        INDEX idx_tab_id (tab_id)
      )
    `);
    
    console.log('✅ [BrowserSessionService] Tablas de sesiones inicializadas');
    return { success: true };
  } catch (error) {
    console.error('❌ [BrowserSessionService] Error inicializando tablas:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Guardar sesión de navegador
 * @param {string} activeTabId - ID de la tab activa
 * @param {Array} tabs - Array de tabs con {tabId, url, title}
 */
export async function saveBrowserSession(activeTabId, tabs) {
  try {
    return await executeTransaction(async (connection) => {
      const sessionName = 'default';
      
      // 1. Insertar o actualizar sesión
      const [sessionResult] = await connection.execute(
        `INSERT INTO browser_sessions (session_name, active_tab_id, updated_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE active_tab_id = ?, updated_at = NOW()`,
        [sessionName, activeTabId, activeTabId]
      );
      
      // Obtener ID de sesión
      let sessionId;
      if (sessionResult.insertId) {
        sessionId = sessionResult.insertId;
      } else {
        const [session] = await connection.execute(
          'SELECT id FROM browser_sessions WHERE session_name = ?',
          [sessionName]
        );
        sessionId = session[0].id;
      }
      
      // 2. Eliminar tabs anteriores
      await connection.execute(
        'DELETE FROM browser_tabs WHERE session_id = ?',
        [sessionId]
      );
      
      // 3. Insertar nuevas tabs
      if (tabs.length > 0) {
        const tabValues = tabs.map((tab, index) => 
          [sessionId, tab.tabId, tab.url, tab.title || 'Sin título', index]
        );
        
        await connection.query(
          `INSERT INTO browser_tabs (session_id, tab_id, url, title, position)
           VALUES ?`,
          [tabValues]
        );
      }
      
      console.log('💾 [BrowserSessionService] Sesión guardada:', tabs.length, 'tabs');
      return { success: true, sessionId, tabCount: tabs.length };
    });
  } catch (error) {
    console.error('❌ [BrowserSessionService] Error guardando sesión:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cargar sesión de navegador
 */
export async function loadBrowserSession() {
  try {
    const sessionName = 'default';
    
    // 1. Obtener sesión
    const sessions = await executeQuery(
      'SELECT * FROM browser_sessions WHERE session_name = ? LIMIT 1',
      [sessionName]
    );
    
    if (sessions.length === 0) {
      console.log('📂 [BrowserSessionService] No hay sesión guardada');
      return { success: true, session: null };
    }
    
    const session = sessions[0];
    
    // 2. Obtener tabs de la sesión
    const tabs = await executeQuery(
      'SELECT tab_id as tabId, url, title FROM browser_tabs WHERE session_id = ? ORDER BY position ASC',
      [session.id]
    );
    
    console.log('📂 [BrowserSessionService] Sesión cargada:', tabs.length, 'tabs');
    
    return {
      success: true,
      session: {
        activeTabId: session.active_tab_id,
        tabs: tabs
      }
    };
  } catch (error) {
    console.error('❌ [BrowserSessionService] Error cargando sesión:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Limpiar sesión guardada
 */
export async function clearBrowserSession() {
  try {
    const sessionName = 'default';
    
    await executeQuery(
      'DELETE FROM browser_sessions WHERE session_name = ?',
      [sessionName]
    );
    
    console.log('🗑️ [BrowserSessionService] Sesión limpiada');
    return { success: true };
  } catch (error) {
    console.error('❌ [BrowserSessionService] Error limpiando sesión:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener estadísticas de sesiones
 */
export async function getBrowserSessionStats() {
  try {
    const sessions = await executeQuery(`
      SELECT 
        bs.session_name,
        bs.active_tab_id,
        bs.updated_at,
        COUNT(bt.id) as tab_count
      FROM browser_sessions bs
      LEFT JOIN browser_tabs bt ON bs.id = bt.session_id
      GROUP BY bs.id
    `);
    
    return { success: true, sessions };
  } catch (error) {
    console.error('❌ [BrowserSessionService] Error obteniendo stats:', error);
    return { success: false, error: error.message };
  }
}

export default {
  initializeBrowserSessionTable,
  saveBrowserSession,
  loadBrowserSession,
  clearBrowserSession,
  getBrowserSessionStats
};
