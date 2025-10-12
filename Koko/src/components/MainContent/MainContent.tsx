import SimpleKokoWeb from '../KokoWeb/SimpleKokoWeb';
import { Dashboard } from '../Dashboard/Dashboard';
import DiscordPanelSimple from '../Discord/DiscordPanelSimple';
import { DatabaseManager } from '../Database/DatabaseManager';
import { PhpMyAdmin } from '../Database/PhpMyAdmin';
import PasswordManager from '../PasswordManager';
import type { TabsManager } from '../../types';
import './MainContent.css';

interface MainContentProps {
  selectedOption: string | null;
  tabsManager: TabsManager;
  onSelectOption: (option: string) => void;
}

export const MainContent = ({ selectedOption, tabsManager, onSelectOption }: MainContentProps) => {
  return (
    <div className="main-content-container">
      {/* Dashboard - mostrar solo cuando está seleccionado */}
      {selectedOption === 'dashboard' && (
        <div style={{ display: 'block' }}>
          <Dashboard />
        </div>
      )}
      
      {/* SimpleKokoWeb - renderizar solo cuando está seleccionado */}
      {selectedOption === 'koko-web' && (
        <div style={{ 
          display: 'flex',
          flex: 1,
          height: '100%',
          width: '100%'
        }}>
          <SimpleKokoWeb tabsManager={tabsManager} />
        </div>
      )}
      
      {/* Discord - Panel completo como Opera */}
      {selectedOption === 'discord' && (
        <div style={{ display: 'flex' }}>
          <DiscordPanelSimple />
        </div>
      )}
      
      {/* Password Manager - Gestor de Contraseñas */}
      {selectedOption === 'password-manager' && (
        <div style={{ 
          display: 'flex',
          flex: 1,
          height: '100%',
          width: '100%',
          overflow: 'hidden'
        }}>
          <PasswordManager />
        </div>
      )}
      
      {/* Database - Gestión de MariaDB y HeidiSQL */}
      {(selectedOption === 'database' || selectedOption === 'extras-database') && (
        <div style={{ 
          display: 'flex',
          flex: 1,
          height: '100%',
          width: '100%',
          overflow: 'auto',
          padding: '1rem'
        }}>
          <DatabaseManager onNavigate={onSelectOption} />
        </div>
      )}
      
      {/* Extras - HeidiSQL / phpMyAdmin */}
      {selectedOption === 'extras-heidisql' && (
        <div style={{ 
          display: 'flex',
          flex: 1,
          height: '100%',
          width: '100%',
          overflow: 'hidden'
        }}>
          <PhpMyAdmin />
        </div>
      )}
      
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
