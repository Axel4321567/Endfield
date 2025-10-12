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
      <div style={{ display: selectedOption === 'dashboard' ? 'block' : 'none' }}>
        <Dashboard />
      </div>
      
      {/* SimpleKokoWeb - mantener siempre montado, solo ocultar/mostrar */}
      <div style={{ 
        display: selectedOption === 'koko-web' ? 'flex' : 'none',
        flex: 1,
        height: '100%',
        width: '100%'
      }}>
        <SimpleKokoWeb tabsManager={tabsManager} />
      </div>
      
      {/* Discord - Panel completo como Opera */}
      <div style={{ display: selectedOption === 'discord' ? 'flex' : 'none' }}>
        <DiscordPanelSimple />
      </div>
      
      {/* Password Manager - Gestor de Contraseñas */}
      <div style={{ 
        display: selectedOption === 'password-manager' ? 'flex' : 'none',
        flex: 1,
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}>
        <PasswordManager />
      </div>
      
      {/* Database - Gestión de MariaDB y HeidiSQL */}
      <div style={{ 
        display: (selectedOption === 'database' || selectedOption === 'extras-database') ? 'flex' : 'none',
        flex: 1,
        height: '100%',
        width: '100%',
        overflow: 'auto',
        padding: '1rem'
      }}>
        <DatabaseManager onNavigate={onSelectOption} />
      </div>
      
      {/* Extras - HeidiSQL / phpMyAdmin */}
      <div style={{ 
        display: selectedOption === 'extras-heidisql' ? 'flex' : 'none',
        flex: 1,
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}>
        <PhpMyAdmin />
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
