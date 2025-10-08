import { useState } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MainContent } from './components/MainContent/MainContent';
import './App.css';

function App() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
  };

  return (
    <div className="app-container" style={{ width: '100vw', height: '100vh', display: 'flex', fontFamily: 'Arial, sans-serif' }}>
      <Sidebar
        selectedOption={selectedOption}
        onSelectOption={handleSelectOption}
      />
      <MainContent selectedOption={selectedOption} />
    </div>
  );
}

export default App;
