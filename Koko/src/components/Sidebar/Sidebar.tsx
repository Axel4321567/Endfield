import './Sidebar.css';

interface SidebarProps {
  selectedOption: string | null;
  onSelectOption: (option: string) => void;
}

export const Sidebar = ({ selectedOption, onSelectOption }: SidebarProps) => {
  const handleOptionClick = (option: string) => {
    onSelectOption(option);
  };

  return (
    <div className="sidebar-container" style={{ width: '300px', backgroundColor: '#374151', color: 'white', padding: '20px', minHeight: '100vh' }}>
      <h1 className="sidebar-title" style={{ fontSize: '24px', marginBottom: '20px', color: 'white' }}>Koko</h1>
      <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button 
          onClick={() => handleOptionClick('dashboard')}
          className={`sidebar-button ${selectedOption === 'dashboard' ? 'active' : ''}`}
          style={{ 
            width: '100%', 
            padding: '12px', 
            backgroundColor: selectedOption === 'dashboard' ? '#1d4ed8' : '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontSize: '16px',
            transition: 'background-color 0.2s'
          }}
        >
          Dashboard {selectedOption === 'dashboard' ? '✓' : ''}
        </button>
        <button 
          onClick={() => handleOptionClick('koko-web')}
          className={`sidebar-button ${selectedOption === 'koko-web' ? 'active' : ''}`}
          style={{ 
            width: '100%', 
            padding: '12px', 
            backgroundColor: selectedOption === 'koko-web' ? '#1d4ed8' : '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontSize: '16px',
            transition: 'background-color 0.2s'
          }}
        >
          Koko-Web {selectedOption === 'koko-web' ? '✓' : ''}
        </button>
      </nav>
    </div>
  );
};
