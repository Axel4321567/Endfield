import './Sidebar.css';

interface SidebarProps {
  selectedOption: string | null;
  onSelectOption: (option: string) => void;
}

export const Sidebar = ({ selectedOption, onSelectOption }: SidebarProps) => {
  return (
    <div className="sidebar-container">
      <h1 className="sidebar-title">Koko</h1>
      <nav className="sidebar-nav">
        <button 
          onClick={() => onSelectOption('dashboard')}
          className={`sidebar-button ${selectedOption === 'dashboard' ? 'active' : ''}`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => onSelectOption('koko-web')}
          className={`sidebar-button ${selectedOption === 'koko-web' ? 'active' : ''}`}
        >
          Koko-Web
        </button>
      </nav>
    </div>
  );
};
