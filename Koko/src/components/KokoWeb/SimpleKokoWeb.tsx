import React, { useState, useRef, useEffect } from 'react';

// Declarar tipos para Electron API
declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      webview: {
        navigate: (url: string) => Promise<void>;
        goBack: () => Promise<void>;
        goForward: () => Promise<void>;
        reload: () => Promise<void>;
      };
    };
  }
}

export const SimpleKokoWeb: React.FC = () => {
  const [url, setUrl] = useState('https://www.google.com');
  const [currentUrl, setCurrentUrl] = useState('');
  const [isElectron, setIsElectron] = useState(false);
  const webviewRef = useRef<any>(null);

  useEffect(() => {
    // Detectar si estamos en Electron
    const checkElectron = () => {
      const electronDetected = !!(
        window?.electronAPI?.isElectron ||
        window?.navigator?.userAgent?.includes('Electron') ||
        (window as any)?.process?.type === 'renderer'
      );
      setIsElectron(electronDetected);
    };
    
    checkElectron();
  }, []);

  const handleNavigate = () => {
    // Validar URL
    let validUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      validUrl = 'https://' + url;
    }
    
    setCurrentUrl(validUrl);
    
    if (isElectron && webviewRef.current) {
      // En Electron, usar webview
      webviewRef.current.src = validUrl;
    } else {
      // En Tauri, usar iframe (limitado)
      console.log('📱 Navegando en modo Tauri/iframe:', validUrl);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };
  
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      backgroundColor: '#f0f0f0',
      padding: '20px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: isElectron ? 'lightgreen' : 'yellow',
        padding: '15px',
        border: '2px solid ' + (isElectron ? 'green' : 'red'),
        borderRadius: '10px',
        marginBottom: '15px'
      }}>
        <h1 style={{ 
          margin: '0',
          fontSize: '24px',
          color: isElectron ? 'darkgreen' : 'red',
          textAlign: 'center'
        }}>
          🌐 Koko-Web {isElectron ? '(Electron)' : '(Tauri)'}
        </h1>
      </div>
      
      {/* Navigation Bar */}
      <div style={{
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="text" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe una URL..."
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          <button 
            onClick={handleNavigate}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            IR
          </button>
        </div>
        
        {currentUrl && (
          <div style={{
            marginTop: '10px',
            padding: '8px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666'
          }}>
            📍 Navegando a: <strong>{currentUrl}</strong>
          </div>
        )}
      </div>

      {/* Browser Content */}
      <div style={{
        flex: 1,
        backgroundColor: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {isElectron ? (
          // Webview para Electron
          <webview
            ref={webviewRef}
            src={currentUrl || url}
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            nodeintegration={false}
            webpreferences="contextIsolation=true"
          />
        ) : (
          // Iframe para Tauri (limitado)
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>
              ⚠️ Modo Tauri - Navegación Limitada
            </h3>
            <p style={{ color: '#888', textAlign: 'center', margin: '0' }}>
              Para navegación completa, usa: <strong>npm run dev</strong> (Electron)
            </p>
            {currentUrl && (
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #ddd'
              }}>
                <p style={{ margin: '0', fontSize: '14px' }}>
                  URL solicitada: <strong>{currentUrl}</strong>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleKokoWeb;