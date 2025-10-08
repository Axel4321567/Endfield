import SimpleKokoWeb from '../KokoWeb/SimpleKokoWeb';
import { Dashboard } from '../Dashboard/Dashboard';
import type { TabsManager } from '../../types';
import './MainContent.css';

interface MainContentProps {
  selectedOption: string | null;
  tabsManager: TabsManager;
}

export const MainContent = ({ selectedOption, tabsManager }: MainContentProps) => {
  const renderContent = () => {
    switch (selectedOption) {
      case 'dashboard':
        return <Dashboard />;
      case 'koko-web':
        return <SimpleKokoWeb tabsManager={tabsManager} />;
      default:
        return (
          <div className="welcome-content">
            <h2 className="welcome-title">
              Bienvenido a <span className="opera-accent">Koko</span>
            </h2>
            <p className="welcome-text">
              Selecciona una opción del sidebar para comenzar
            </p>
            <p className="welcome-info">
              Opción seleccionada: {selectedOption || 'ninguna'}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="main-content-container">
      {renderContent()}
    </div>
  );
};
