import './Dashboard.css';

export const Dashboard = () => {
  return (
    <div className="dashboard-container" style={{ padding: '20px', backgroundColor: 'white', minHeight: '100%' }}>
      <div className="dashboard-header">
        <h2 className="dashboard-title" style={{ color: '#333', fontSize: '24px', marginBottom: '20px' }}>
          Dashboard
        </h2>
      </div>
      <div className="dashboard-content">
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
          <div className="dashboard-card" style={{ backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3 className="card-title" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Navegación</h3>
            <p className="card-content" style={{ color: '#666' }}>Acceso rápido a herramientas</p>
          </div>
        </div>
      </div>
    </div>
  );
};