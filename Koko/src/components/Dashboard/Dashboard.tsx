import './Dashboard.css';

export const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2 className="dashboard-title">
          Dashboard
        </h2>
      </div>
      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3 className="card-title">Estadísticas</h3>
            <p className="card-content">Información general del sistema</p>
          </div>
          <div className="dashboard-card">
            <h3 className="card-title">Actividad Reciente</h3>
            <p className="card-content">Últimas acciones realizadas</p>
          </div>
          <div className="dashboard-card">
            <h3 className="card-title">Configuración</h3>
            <p className="card-content">Ajustes del sistema</p>
          </div>
          <div className="dashboard-card">
            <h3 className="card-title">Navegación</h3>
            <p className="card-content">Acceso rápido a herramientas</p>
          </div>
        </div>
      </div>
    </div>
  );
};