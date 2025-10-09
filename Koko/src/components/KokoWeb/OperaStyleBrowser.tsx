import React, { useState, useEffect } from 'react';
import type { TabsManager } from '../../types';
import './OperaStyleBrowser.css';

// Declarar tipos para Electron webview
declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: any;
    }
  }
}

interface OperaStyleBrowserProps {
  tabsManager: TabsManager;
}

interface OperaTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  isActive: boolean;
}

// Componente que imita la estructura de Opera Browser
export const OperaStyleBrowser: React.FC<OperaStyleBrowserProps> = ({ tabsManager }) => {
  const [operaTabs, setOperaTabs] = useState<OperaTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [addressBarValue, setAddressBarValue] = useState('');

  // Convertir tabs del manager a formato Opera
  useEffect(() => {
    const convertedTabs: OperaTab[] = tabsManager.tabs.map(tab => ({
      id: tab.id,
      url: tab.url || 'koko://speed-dial',
      title: tab.title || 'Nueva pestaña',
      favicon: tab.favicon,
      isLoading: tab.isLoading || false,
      isActive: tab.id === tabsManager.activeTabId
    }));

    setOperaTabs(convertedTabs);
    setActiveTabId(tabsManager.activeTabId);
    
    // Actualizar barra de direcciones
    const activeTab = convertedTabs.find(tab => tab.isActive);
    if (activeTab) {
      setAddressBarValue(activeTab.url === 'koko://speed-dial' ? '' : activeTab.url);
    }
  }, [tabsManager.tabs, tabsManager.activeTabId]);

  // Crear nueva pestaña (estilo Opera)
  const createNewTab = () => {
    tabsManager.createNewTab('', 'Nueva pestaña');
  };

  // Cerrar pestaña (estilo Opera)
  const closeTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    tabsManager.closeTab(tabId);
  };

  // Cambiar pestaña activa (estilo Opera)
  const switchToTab = (tabId: string) => {
    tabsManager.switchTab(tabId);
  };

  // Navegar desde la barra de direcciones (estilo Opera)
  const handleAddressBarSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (activeTabId && addressBarValue.trim()) {
      let url = addressBarValue.trim();
      
      // Auto-completar URL (como Opera)
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('.') && !url.includes(' ')) {
          url = 'https://' + url;
        } else {
          // Buscar en Google si no es una URL
          url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        }
      }
      
      tabsManager.navigateTab(activeTabId, url);
    }
  };

  // Renderizar Speed Dial (página de inicio estilo Opera)
  const renderSpeedDial = (tabId: string) => (
    <div className="opera-speed-dial">
      <div className="speed-dial-header">
        <h1>Koko Browser</h1>
        <p>Navegador web inteligente</p>
      </div>
      
      <div className="speed-dial-grid">
        <div className="speed-dial-item" onClick={() => navigateToUrl(tabId, 'https://www.google.com')}>
          <div className="speed-dial-icon">🔍</div>
          <span>Google</span>
        </div>
        <div className="speed-dial-item" onClick={() => navigateToUrl(tabId, 'https://www.youtube.com')}>
          <div className="speed-dial-icon">📺</div>
          <span>YouTube</span>
        </div>
        <div className="speed-dial-item" onClick={() => navigateToUrl(tabId, 'https://www.github.com')}>
          <div className="speed-dial-icon">💻</div>
          <span>GitHub</span>
        </div>
        <div className="speed-dial-item" onClick={() => navigateToUrl(tabId, 'https://www.wikipedia.org')}>
          <div className="speed-dial-icon">📖</div>
          <span>Wikipedia</span>
        </div>
      </div>
    </div>
  );

  // Navegar a URL específica
  const navigateToUrl = (tabId: string, url: string) => {
    tabsManager.navigateTab(tabId, url);
  };

  // Renderizar webview para cada pestaña (estilo Opera - ocultas las no activas)
  const renderWebView = (tab: OperaTab) => {
    const isSpeedDial = !tab.url || tab.url === 'koko://speed-dial' || tab.url === '';
    
    if (isSpeedDial) {
      return renderSpeedDial(tab.id);
    }

    // Simplificado para evitar errores de TypeScript
    return (
      <div
        key={tab.id}
        style={{
          width: '100%',
          height: '100%',
          background: '#f5f5f5',
          display: tab.isActive ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontSize: '18px',
          color: '#666',
          textAlign: 'center',
          padding: '20px'
        }}
      >
        🌐 {tab.url}
        <br />
        <small style={{ marginTop: '8px', opacity: 0.7 }}>
          (Navegación web estilo Opera - en desarrollo)
        </small>
      </div>
    );
  };

  return (
    <div className="opera-browser">
      {/* Barra de pestañas estilo Opera */}
      <div className="opera-tab-bar">
        <div className="opera-tabs">
          {operaTabs.map(tab => (
            <div
              key={tab.id}
              className={`opera-tab ${tab.isActive ? 'active' : ''}`}
              onClick={() => switchToTab(tab.id)}
            >
              <div className="tab-favicon">
                {tab.isLoading ? (
                  <div className="loading-spinner">⟳</div>
                ) : (
                  <span>{tab.favicon || '🌐'}</span>
                )}
              </div>
              <span className="tab-title">{tab.title}</span>
              <button
                className="tab-close"
                onClick={(e) => closeTab(tab.id, e)}
                title="Cerrar pestaña"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        
        <button className="new-tab-button" onClick={createNewTab} title="Nueva pestaña">
          +
        </button>
      </div>

      {/* Barra de navegación estilo Opera */}
      <div className="opera-navigation-bar">
        <div className="navigation-controls">
          <button 
            className="nav-button"
            onClick={() => activeTabId && tabsManager.goBack(activeTabId)}
            title="Atrás"
          >
            ←
          </button>
          <button 
            className="nav-button"
            onClick={() => activeTabId && tabsManager.goForward(activeTabId)}
            title="Adelante"
          >
            →
          </button>
          <button 
            className="nav-button"
            onClick={() => activeTabId && tabsManager.refreshTab(activeTabId)}
            title="Recargar"
          >
            ↻
          </button>
        </div>

        <form className="address-bar" onSubmit={handleAddressBarSubmit}>
          <input
            type="text"
            value={addressBarValue}
            onChange={(e) => setAddressBarValue(e.target.value)}
            placeholder="Buscar o introducir dirección web"
            className="address-input"
          />
          <button type="submit" className="address-submit">⚡</button>
        </form>

        <div className="browser-menu">
          <button className="menu-button" title="Menú">☰</button>
        </div>
      </div>

      {/* Área de contenido web estilo Opera */}
      <div className="opera-web-content">
        {operaTabs.map(tab => (
          <div
            key={tab.id}
            className="tab-content"
            style={{ display: tab.isActive ? 'block' : 'none' }}
          >
            {renderWebView(tab)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OperaStyleBrowser;