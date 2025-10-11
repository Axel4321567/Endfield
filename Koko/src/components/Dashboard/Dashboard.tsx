import { useEffect, useRef, useCallback } from 'react';
import { useSessionManager } from '../../hooks/useSessionManager';
import { useTabs } from '../../hooks/useTabs';
import { useLogger } from '../../contexts/LogsContext';
import { SessionStatus } from './SessionStatus';
import { ActionButton } from './ActionButton';
import { SessionInstructions } from './SessionInstructions';
import { DashboardCard } from './DashboardCard';
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
  }, [addLog, tabs.length]);

  const handleClearSession = useCallback(() => {
    addLog('🗑️ Limpiando sesión actual...', 'info', 'dashboard');
    sessionManager.clearSession();
    addLog('✅ Sesión eliminada correctamente', 'success', 'dashboard');
    console.log('🗑️ Sesión eliminada - recarga la app para ver la pestaña por defecto');
    alert('Sesión eliminada. La aplicación se recargará para mostrar la pestaña por defecto.');
    window.location.reload();
  }, [addLog, sessionManager]);

  const handleLogSession = useCallback(() => {
    addLog('📋 Consultando información de sesión...', 'info', 'dashboard');
    const session = sessionManager.loadSession();
    addLog(`📊 Sesión cargada: ${tabs.length} pestañas, activa: ${activeTabId}`, 'info', 'dashboard');
    console.log('📋 Sesión actual:', session);
    console.log('🔍 Pestañas en hooks:', tabs);
    alert(`Sesión actual:\n- Pestañas: ${tabs.length}\n- Activa: ${activeTabId}\n- Ver consola para más detalles`);
  }, [addLog, sessionManager, tabs, activeTabId]);

  const handleForceReload = useCallback(() => {
    addLog('🔄 Recargando aplicación...', 'warn', 'dashboard');
    console.log('🔄 Recargando aplicación');
    window.location.reload();
  }, [addLog]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Dashboard</h2>
      </div>
      <div className="dashboard-content">
        {/* Sección de Gestión de Sesiones */}
        <div className="session-management-section">
          <div className="session-card">
            {/* Header con icono */}
            <div className="session-header">
              <h3 className="session-header__title">
                <span className="session-header__icon">🧪</span>
                Gestión de Sesiones
              </h3>
            </div>
            
            {/* Estado con badge */}
            <SessionStatus 
              tabsCount={tabs.length}
              activeTabId={activeTabId}
              hasSession={!!sessionManager.session}
            />

            {/* Botones con estilo moderno */}
            <div className="session-actions">
              <ActionButton 
                onClick={handleLogSession}
                variant="primary"
                icon="📋"
              >
                Ver Sesión
              </ActionButton>
              
              <ActionButton 
                onClick={handleClearSession}
                variant="danger"
                icon="🗑️"
              >
                Limpiar Sesión
              </ActionButton>
              
              <ActionButton 
                onClick={handleForceReload}
                variant="success"
                icon="🔄"
              >
                Recargar App
              </ActionButton>
            </div>

            {/* Instrucciones con badge verde */}
            <SessionInstructions />
          </div>
        </div>

        <div className="dashboard-grid">
          <DashboardCard 
            title="Estadísticas"
            content="Información general del sistema"
          />
          
          <DashboardCard 
            title="Actividad Reciente"
            content="Últimas acciones realizadas"
          />
          
          <DashboardCard 
            title="Configuración"
            content="Ajustes del sistema"
          />
        </div>
      </div>
    </div>
  );
};