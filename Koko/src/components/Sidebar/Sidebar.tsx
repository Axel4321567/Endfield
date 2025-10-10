import './Sidebar.css';
import { useLogger } from '../../contexts/LogsContext';

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

const DatabaseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4s-8-1.79-8-4zM4 16v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
  </svg>
);

const TerminalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 3h20c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H2c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm0 4v10h20V7H2zm2 8l4-4-4-4v8zm6 0h8v-2h-8v2z"/>
  </svg>
);

export const Sidebar = ({ selectedOption, onSelectOption, isCollapsed, onToggle }: SidebarProps) => {
  const { terminalOpen, setTerminalOpen } = useLogger();
  
  const handleOptionClick = (option: string) => {
    onSelectOption(option);
  };

  const handleTerminalToggle = () => {
    setTerminalOpen(!terminalOpen);
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
          onClick={() => handleOptionClick('database')}
          className={`sidebar-button ${selectedOption === 'database' ? 'active' : ''}`}
          title={isCollapsed ? 'Base de Datos' : ''}
        >
          <span className="sidebar-button-content">
            <DatabaseIcon />
            {!isCollapsed && <span className="sidebar-button-text">Base de Datos</span>}
          </span>
        </button>
        
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
