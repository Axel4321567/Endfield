import { KokoWeb } from '../KokoWeb/KokoWeb';
import { Dashboard } from '../Dashboard/Dashboard';
import './MainContent.css';

interface MainContentProps {
  selectedOption: string | null;
}

export const MainContent = ({ selectedOption }: MainContentProps) => {
  const renderContent = () => {
    switch (selectedOption) {
      case 'dashboard':
        return <Dashboard />;
      case 'koko-web':
        return <KokoWeb />;
      default:
        return (
          <div className="welcome-content">
            <h2 className="welcome-title">
              Bienvenido a Koko
            </h2>
            <p className="welcome-text">
              Selecciona una opción del sidebar para comenzar
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
