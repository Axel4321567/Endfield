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
          <div style={{ 
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '28px',
            borderRadius: '16px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Header con icono */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <h3 style={{ 
                fontSize: '22px', 
                fontWeight: '700',
                color: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: 0
              }}>
                <span style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  padding: '10px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>🧪</span>
                Gestión de Sesiones
              </h3>
            </div>
            
            {/* Estado con badge */}
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.1)',
              backdropFilter: 'blur(10px)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <p style={{ 
                color: '#cbd5e1', 
                fontSize: '14px', 
                marginBottom: '12px',
                fontWeight: '600'
              }}>
                Estado Actual:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>• Pestañas:</span>
                  <span style={{ 
                    color: '#3b82f6', 
                    fontWeight: '700',
                    fontSize: '14px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>{tabs.length}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>• Pestaña Activa:</span>
                  <span style={{ 
                    color: '#f1f5f9', 
                    fontSize: '13px',
                    fontFamily: 'monospace'
                  }}>{activeTabId || 'Ninguna'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>• Sesión:</span>
                  <span style={{ 
                    color: sessionManager.session ? '#10b981' : '#ef4444',
                    fontWeight: '600',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {sessionManager.session ? '✓ Guardada' : '⚠ Sin guardar'}
                  </span>
                </div>
              </div>
            </div>

            {/* Botones con estilo moderno */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <button 
                onClick={handleLogSession}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }}
              >
                📋 Ver Sesión
              </button>
              
              <button 
                onClick={handleClearSession}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                }}
              >
                🗑️ Limpiar Sesión
              </button>
              
              <button 
                onClick={handleForceReload}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
              >
                🔄 Recargar App
              </button>
            </div>

            {/* Instrucciones con badge verde */}
            <div style={{ 
              background: 'rgba(16, 185, 129, 0.1)',
              backdropFilter: 'blur(10px)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '12px'
              }}>
                <span style={{ fontSize: '16px' }}>💡</span>
                <strong style={{ color: '#10b981', fontSize: '14px' }}>Instrucciones:</strong>
              </div>
              <ol style={{ 
                paddingLeft: '20px', 
                margin: 0,
                color: '#94a3b8',
                fontSize: '13px',
                lineHeight: '1.8'
              }}>
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