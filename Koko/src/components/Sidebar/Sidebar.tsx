import './Sidebar.css';

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

const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
  </svg>
);

export const Sidebar = ({ selectedOption, onSelectOption, isCollapsed, onToggle }: SidebarProps) => {
  const handleOptionClick = (option: string) => {
    onSelectOption(option);
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
      </nav>
    </div>
  );
};
