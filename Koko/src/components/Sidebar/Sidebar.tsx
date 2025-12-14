import './Sidebar.css';
import { useLogger } from '../../contexts/LogsContext';
import { useState, useEffect } from 'react';

interface SidebarProps {
  selectedOption: string | null;
  onSelectOption: (option: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

// Componentes de iconos SVG
const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
  </svg>
);

const BrowserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-6h11v6zm0-8H4V8h11v2zm5 8h-3V8h3v10z"/>
  </svg>
);

const DiscordIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.196.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const PasswordIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
  </svg>
);

const ServicesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
  </svg>
);

const TerminalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 3h20c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H2c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm0 4v10h20V7H2zm2 8l4-4-4-4v8zm6 0h8v-2h-8v2z"/>
  </svg>
);

const CodeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
  </svg>
);

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg 
    width="14" 
    height="14" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    style={{ 
      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s ease'
    }}
  >
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
  </svg>
);

export const Sidebar = ({ selectedOption, onSelectOption, isCollapsed, onToggle }: SidebarProps) => {
  const { terminalOpen, setTerminalOpen } = useLogger();
  const [extrasExpanded, setExtrasExpanded] = useState(false);
  
  // Notificar a Electron cuando cambie el estado del sidebar
  useEffect(() => {
    if (window.electronAPI?.app?.notifySidebarChange) {
      // Iniciar la animación inmediatamente para mejor sincronización
      window.electronAPI.app.notifySidebarChange();
    }
    
    // Esperar a que termine la animación CSS antes de calcular el tamaño
    if (window.electronAPI?.kokoCode?.resize) {
      setTimeout(() => {
        const sidebar = document.querySelector('.sidebar-container');
        
        if (sidebar) {
          const sidebarRect = sidebar.getBoundingClientRect();
          const sidebarStyle = window.getComputedStyle(sidebar);
          
          // Obtener el ancho del borde derecho del sidebar
          const borderRightWidth = parseInt(sidebarStyle.borderRightWidth || '0', 10);
          
          // El ancho total del sidebar incluye su contenido + borde
          const sidebarTotalWidth = Math.round(sidebarRect.width) + borderRightWidth;
          
          console.log('📊 [Sidebar] Dimensiones:', {
            sidebar: {
              contentWidth: Math.round(sidebarRect.width),
              borderRight: borderRightWidth,
              totalWidth: sidebarTotalWidth,
              collapsed: isCollapsed
            },
            window: {
              width: window.innerWidth,
              height: window.innerHeight
            },
            selectedOption
          });
          
          // Solo redimensionar VS Code si koko-code está seleccionado
          const bounds = selectedOption === 'koko-code' ? {
            x: sidebarTotalWidth,
            y: 0,
            width: window.innerWidth - sidebarTotalWidth,
            height: window.innerHeight
          } : {
            x: 0,
            y: 0,
            width: 0,
            height: 0
          };
          
          console.log('📏 [KokoCode] Resize directo desde sidebar:', bounds);
          window.electronAPI.kokoCode.resize(bounds);
        }
      }, 310); // Esperar a que termine la animación CSS (300ms) + margen
    }
  }, [isCollapsed]);
  
  const handleOptionClick = (option: string) => {
    onSelectOption(option);
  };

  const handleTerminalToggle = () => {
    setTerminalOpen(!terminalOpen);
  };

  const toggleExtras = () => {
    setExtrasExpanded(!extrasExpanded);
  };

  return (
    <div className={`sidebar-container ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && <h1 className="sidebar-title">Koko</h1>}
        <button className="toggle-button" onClick={onToggle}>
          <MenuIcon />
        </button>
      </div>
      <nav className="sidebar-nav">
        <button 
          onClick={() => handleOptionClick('dashboard')}
          className={`sidebar-button ${selectedOption === 'dashboard' ? 'active' : ''}`}
          title={isCollapsed ? 'Dashboard' : ''}
        >
          <span className="sidebar-button-content">
            <DashboardIcon />
            {!isCollapsed && <span className="sidebar-button-text">Dashboard</span>}
          </span>
        </button>
        <button 
          onClick={() => handleOptionClick('koko-web')}
          className={`sidebar-button ${selectedOption === 'koko-web' ? 'active' : ''}`}
          title={isCollapsed ? 'Koko-Web' : ''}
        >
          <span className="sidebar-button-content">
            <BrowserIcon />
            {!isCollapsed && <span className="sidebar-button-text">Koko-Web</span>}
          </span>
        </button>
        <button 
          onClick={() => handleOptionClick('discord')}
          className={`sidebar-button ${selectedOption === 'discord' ? 'active' : ''}`}
          title={isCollapsed ? 'Discord' : ''}
        >
          <span className="sidebar-button-content">
            <DiscordIcon />
            {!isCollapsed && <span className="sidebar-button-text">Discord</span>}
          </span>
        </button>
        <button 
          onClick={() => handleOptionClick('password-manager')}
          className={`sidebar-button ${selectedOption === 'password-manager' ? 'active' : ''}`}
          title={isCollapsed ? 'Gestor de Contraseñas' : ''}
        >
          <span className="sidebar-button-content">
            <PasswordIcon />
            {!isCollapsed && <span className="sidebar-button-text">Contraseñas</span>}
          </span>
        </button>
        <button 
          onClick={() => handleOptionClick('koko-code')}
          className={`sidebar-button ${selectedOption === 'koko-code' ? 'active' : ''}`}
          title={isCollapsed ? 'Koko-Code' : ''}
        >
          <span className="sidebar-button-content">
            <CodeIcon />
            {!isCollapsed && <span className="sidebar-button-text">Koko-Code</span>}
          </span>
        </button>
        
        {/* Extras - Botón desplegable */}
        <div className="sidebar-dropdown">
          <button 
            onClick={toggleExtras}
            className={`sidebar-button ${extrasExpanded ? 'expanded' : ''}`}
            title={isCollapsed ? 'Extras' : ''}
          >
            <span className="sidebar-button-content">
              <ServicesIcon />
              {!isCollapsed && (
                <>
                  <span className="sidebar-button-text">Extras</span>
                  <ChevronIcon isOpen={extrasExpanded} />
                </>
              )}
            </span>
          </button>
          
          {/* Submenú desplegable */}
          {extrasExpanded && !isCollapsed && (
            <div className="sidebar-submenu">
              {/* Base de datos directamente en Extras */}
              <button 
                onClick={() => handleOptionClick('extras-database')}
                className={`sidebar-button sidebar-submenu-item ${selectedOption === 'extras-database' ? 'active' : ''}`}
                title="Gestión de Base de datos MariaDB"
              >
                <span className="sidebar-button-content">
                  <span className="sidebar-button-text">�️ Base de datos</span>
                </span>
              </button>
              
              {/* MySQL/phpMyAdmin */}
              <button 
                onClick={() => handleOptionClick('extras-heidisql')}
                className={`sidebar-button sidebar-submenu-item ${selectedOption === 'extras-heidisql' ? 'active' : ''}`}
                title="phpMyAdmin - Gestión visual de MySQL"
              >
                <span className="sidebar-button-content">
                  <span className="sidebar-button-text">� MySQL</span>
                </span>
              </button>
            </div>
          )}
        </div>
        
        <div className="sidebar-divider"></div>
        
        <button 
          onClick={handleTerminalToggle}
          className={`sidebar-button terminal-button ${terminalOpen ? 'active' : ''}`}
          title={isCollapsed ? (terminalOpen ? 'Ocultar Terminal' : 'Mostrar Terminal') : ''}
        >
          <span className="sidebar-button-content">
            <TerminalIcon />
            {!isCollapsed && <span className="sidebar-button-text">{terminalOpen ? 'Ocultar Terminal' : 'Mostrar Terminal'}</span>}
          </span>
        </button>
      </nav>
    </div>
  );
};
