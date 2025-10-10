import SimpleKokoWeb from '../KokoWeb/SimpleKokoWeb';
import { Dashboard } from '../Dashboard/Dashboard';
import DiscordPanelSimple from '../Dashboard/DiscordPanelSimple';
import { DatabaseManager } from '../Database/DatabaseManager';
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
      <div style={{ 
        display: selectedOption === 'koko-web' ? 'flex' : 'none',
        flex: 1,
        height: '100%',
        width: '100%'
      }}>
        <SimpleKokoWeb tabsManager={tabsManager} />
      </div>
      
      {/* Discord - Panel completo como Opera */}
      <div style={{ 
        display: selectedOption === 'discord' ? 'flex' : 'none',
        flex: 1,
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}>
        <DiscordPanelSimple />
      </div>
      
      {/* Database - Gestión de MariaDB y HeidiSQL */}
      <div style={{ 
        display: selectedOption === 'database' ? 'flex' : 'none',
        flex: 1,
        height: '100%',
        width: '100%',
        overflow: 'auto',
        padding: '1rem'
      }}>
        <DatabaseManager />
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
