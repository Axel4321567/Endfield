import { useState } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MainContent } from './components/MainContent/MainContent';
import { useTabs } from './hooks/useTabs';
import './App.css';

function App() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Estado global de pestañas para persistir entre navegación del sidebar
  const tabsManager = useTabs();

  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="app-container">
      <Sidebar
        selectedOption={selectedOption}
        onSelectOption={handleSelectOption}
        isCollapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      <MainContent 
        selectedOption={selectedOption} 
        tabsManager={tabsManager}
      />
    </div>
  );
}

export default App;
