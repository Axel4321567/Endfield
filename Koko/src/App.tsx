import { useState, useCallback, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MainContent } from './components/MainContent/MainContent';
import GlobalTerminal from './components/Terminal/GlobalTerminal';
import { LogsProvider, useLogger } from './contexts/LogsContext';
import { useTabs } from './hooks/useTabs';
import type { SidebarOption } from './types';
import './App.css';

function AppContent() {
  const [selectedOption, setSelectedOption] = useState<SidebarOption>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { addLog } = useLogger();
  
  // Estado global de pestañas para persistir entre navegación del sidebar
  const tabsManager = useTabs();

  // Efecto para controlar la visibilidad de VS Code cuando cambia la vista
  useEffect(() => {
    if (selectedOption === 'koko-code') {
      // Mostrar VS Code si existe y actualizar su tamaño
      console.log('👁️ [App] Mostrando VS Code');
      window.electronAPI?.kokoCode?.setVisibility(true);
      
      // Actualizar posición y tamaño después de mostrar (dar tiempo al DOM)
      setTimeout(() => {
        const sidebar = document.querySelector('.sidebar-container');
        if (sidebar) {
          const sidebarRect = sidebar.getBoundingClientRect();
          const sidebarStyle = window.getComputedStyle(sidebar);
          const borderRightWidth = parseInt(sidebarStyle.borderRightWidth || '0', 10);
          const sidebarTotalWidth = Math.round(sidebarRect.width) + borderRightWidth;
          
          const bounds = {
            x: sidebarTotalWidth,
            y: 0,
            width: window.innerWidth - sidebarTotalWidth,
            height: window.innerHeight
          };
          
          console.log('📐 [App] Actualizando tamaño de VS Code:', bounds);
          
          // Obtener info de VS Code para el HWND
          window.electronAPI?.kokoCode?.getInfo().then(info => {
            if (info && info.hwnd) {
              window.electronAPI?.kokoCode?.updatePosition({
                hwnd: info.hwnd,
                ...bounds
              });
            } else {
              // Si no hay HWND, usar resize directo
              window.electronAPI?.kokoCode?.resize(bounds);
            }
          }).catch(() => {
            // Fallback: usar resize directo
            window.electronAPI?.kokoCode?.resize(bounds);
          });
        }
      }, 150);
    } else {
      // Ocultar VS Code si no estamos en esa vista
      console.log('👁️ [App] Ocultando VS Code');
      window.electronAPI?.kokoCode?.setVisibility(false);
    }
  }, [selectedOption]);

  const handleSelectOption = useCallback((option: string) => {
    console.log(`🎯 App: Cambiando a opción: ${option}`);
    addLog(`🔄 Cambiando a sección: ${option}`, 'info', 'system');
    setSelectedOption(option as SidebarOption);
  }, [addLog]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      addLog(newState ? '� Sidebar colapsado' : '� Sidebar expandido', 'info', 'system');
      return newState;
    });
  }, [addLog]);

  const getSectionForLog = useCallback((option: SidebarOption): 'dashboard' | 'koko-web' | 'discord' | 'database' | 'extras' | 'system' => {
    switch (option) {
      case 'dashboard':
        return 'dashboard';
      case 'koko-web':
        return 'koko-web';
      case 'discord':
        return 'discord';
      case 'database':
        return 'database';
      case 'extras':
        return 'extras';
      default:
        return 'system';
    }
  }, []);

  const { terminalOpen } = useLogger();

  return (
    <div className="app-container">
      <div className="app-layout">
        <Sidebar
          selectedOption={selectedOption}
          onSelectOption={handleSelectOption}
          isCollapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
        <div className="content-area">
          <MainContent 
            selectedOption={selectedOption}
            tabsManager={tabsManager}
            onSelectOption={handleSelectOption}
          />
          {terminalOpen && (
            <div className="terminal-bottom">
              <GlobalTerminal currentSection={getSectionForLog(selectedOption)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <LogsProvider>
      <AppContent />
    </LogsProvider>
  );
}

export default App;
