import { useEffect, useRef } from 'react';
import { useSessionManager } from '../../hooks/useSessionManager';
import { useTabs } from '../../hooks/useTabs';
import { useLogger } from '../../contexts/LogsContext';
import AutoUpdater from './AutoUpdater';
import './Dashboard.css';

export const Dashboard = () => {
  const sessionManager = useSessionManager();
  const { tabs, activeTabId } = useTabs();
  const { addLog } = useLogger();
  const hasLoggedInit = useRef(false);

  // Log inicial al montar el componente - solo una vez
  useEffect(() => {
    if (!hasLoggedInit.current) {
      addLog('🚀 Dashboard iniciado correctamente', 'success', 'dashboard');
      addLog(`📊 Estado inicial: ${tabs.length} pestañas cargadas`, 'info', 'dashboard');
      hasLoggedInit.current = true;
    }
  }, []); // Sin dependencias para que solo se ejecute una vez

  const handleClearSession = () => {
    addLog('🗑️ Limpiando sesión actual...', 'info', 'dashboard');
    sessionManager.clearSession();
    addLog('✅ Sesión eliminada correctamente', 'success', 'dashboard');
    console.log('🗑️ Sesión eliminada - recarga la app para ver la pestaña por defecto');
    alert('Sesión eliminada. La aplicación se recargará para mostrar la pestaña por defecto.');
    window.location.reload();
  };

  const handleLogSession = () => {
    addLog('📋 Consultando información de sesión...', 'info', 'dashboard');
    const session = sessionManager.loadSession();
    addLog(`📊 Sesión cargada: ${tabs.length} pestañas, activa: ${activeTabId}`, 'info', 'dashboard');
    console.log('📋 Sesión actual:', session);
    console.log('🔍 Pestañas en hooks:', tabs);
    alert(`Sesión actual:\n- Pestañas: ${tabs.length}\n- Activa: ${activeTabId}\n- Ver consola para más detalles`);
  };

  const handleForceReload = () => {
    addLog('🔄 Recargando aplicación...', 'warn', 'dashboard');
    console.log('🔄 Recargando aplicación');
    window.location.reload();
  };

  return (
    <div className="dashboard-container" style={{ padding: '20px', backgroundColor: 'white', minHeight: '100%' }}>
      <div className="dashboard-header">
        <h2 className="dashboard-title" style={{ color: '#333', fontSize: '24px', marginBottom: '20px' }}>
          Dashboard
        </h2>
      </div>
      <div className="dashboard-content">
        {/* Sección de Gestión de Sesiones */}
        <div className="session-management-section" style={{ marginBottom: '24px' }}>
          <div className="session-card" style={{ 
            backgroundColor: '#e8f4fd', 
            padding: '20px', 
            borderRadius: '12px', 
            border: '2px solid #3b82f6',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              marginBottom: '12px',
              color: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🧪 Gestión de Sesiones
            </h3>
            
            <div style={{ 
              backgroundColor: 'rgba(59, 130, 246, 0.1)', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '16px',
              fontSize: '14px',
              color: '#1e40af'
            }}>
              <p><strong>Estado Actual:</strong></p>
              <p>• Pestañas: {tabs.length}</p>
              <p>• Pestaña Activa: {activeTabId || 'Ninguna'}</p>
              <p>• Sesión: {sessionManager.session ? 'Guardada' : 'Sin guardar'}</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={handleLogSession}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#3b82f6'}
              >
                📋 Ver Sesión
              </button>
              
              <button 
                onClick={handleClearSession}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626'}
                onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#ef4444'}
              >
                🗑️ Limpiar Sesión
              </button>
              
              <button 
                onClick={handleForceReload}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#059669'}
                onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#10b981'}
              >
                🔄 Recargar App
              </button>
            </div>

            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: 'rgba(16, 185, 129, 0.1)', 
              borderRadius: '8px',
              fontSize: '12px',
              color: '#047857'
            }}>
              <strong>💡 Instrucciones:</strong>
              <ol style={{ paddingLeft: '16px', margin: '8px 0' }}>
                <li>Ve a "Koko-Web" y abre varias pestañas</li>
                <li>Cierra la aplicación completamente</li>
                <li>Reabre la app - las pestañas deberían restaurarse automáticamente</li>
                <li>Usa "Limpiar Sesión" para probar la pestaña por defecto (Google)</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Sección de Auto-Updater */}
        <div className="auto-updater-section" style={{ marginBottom: '24px' }}>
          <AutoUpdater />
        </div>

        <div className="dashboard-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
          gap: '16px',
          alignItems: 'start'
        }}>
          
          <div className="dashboard-card" style={{ backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3 className="card-title" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Estadísticas</h3>
            <p className="card-content" style={{ color: '#666' }}>Información general del sistema</p>
          </div>
          
          <div className="dashboard-card" style={{ backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3 className="card-title" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Actividad Reciente</h3>
            <p className="card-content" style={{ color: '#666' }}>Últimas acciones realizadas</p>
          </div>
          
          <div className="dashboard-card" style={{ backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3 className="card-title" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Configuración</h3>
            <p className="card-content" style={{ color: '#666' }}>Ajustes del sistema</p>
          </div>
        </div>
      </div>
    </div>
  );
};