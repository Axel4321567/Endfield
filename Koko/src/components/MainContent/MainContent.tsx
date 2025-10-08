import SimpleKokoWeb from '../KokoWeb/SimpleKokoWeb';
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
        return <SimpleKokoWeb />;
      default:
        return (
          <div className="welcome-content" style={{ textAlign: 'center', padding: '40px' }}>
            <h2 className="welcome-title" style={{ fontSize: '32px', color: '#333', marginBottom: '16px' }}>
              Bienvenido a Koko
            </h2>
            <p className="welcome-text" style={{ fontSize: '18px', color: '#666' }}>
              Selecciona una opción del sidebar para comenzar
            </p>
            <p style={{ fontSize: '14px', color: '#999', marginTop: '20px' }}>
              Opción seleccionada: {selectedOption || 'ninguna'}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="main-content-container" style={{ flex: 1, backgroundColor: '#f5f5f5', padding: '20px', minHeight: '100vh' }}>
      {renderContent()}
    </div>
  );
};
