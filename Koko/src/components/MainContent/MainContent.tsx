import SimpleKokoWeb from '../KokoWeb/SimpleKokoWeb';
import { Dashboard } from '../Dashboard/Dashboard';
import type { TabsManager } from '../../types';
import './MainContent.css';

interface MainContentProps {
  selectedOption: string | null;
  tabsManager: TabsManager;
}

export const MainContent = ({ selectedOption, tabsManager }: MainContentProps) => {
  return (
    <div className="main-content-container">
      {/* Dashboard - mostrar solo cuando está seleccionado */}
      <div style={{ display: selectedOption === 'dashboard' ? 'block' : 'none' }}>
        <Dashboard />
      </div>
      
      {/* SimpleKokoWeb - mantener siempre montado, solo ocultar/mostrar */}
      <div style={{ display: selectedOption === 'koko-web' ? 'block' : 'none' }}>
        <SimpleKokoWeb tabsManager={tabsManager} />
      </div>
      
      {/* Contenido de bienvenida - solo cuando no hay selección */}
      {!selectedOption && (
        <div className="welcome-content">
          <h2 className="welcome-title">
            Bienvenido a <span className="opera-accent">Koko Search</span>
          </h2>
          <p className="welcome-text">
            Tu motor de búsqueda personalizado está listo
          </p>
          <p className="welcome-info">
            Selecciona "Koko Search" para comenzar a buscar
          </p>
        </div>
      )}
    </div>
  );
};
