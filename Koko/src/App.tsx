import { useState } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MainContent } from './components/MainContent/MainContent';
import './App.css';

function App() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      <MainContent selectedOption={selectedOption} />
    </div>
  );
}

export default App;
