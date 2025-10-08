import React, { useState, useRef, useEffect } from 'react';
import TopBar from './components/TopBar';
import BrowserView from './components/BrowserView';
import StatusBar from './components/StatusBar';
import ElectronWebView from './components/ElectronWebView';
import './KokoWeb.css';

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
      automation: {
        runSearch: (query: string) => Promise<any>;
      };
      network: {
        setProxy: (proxyRules: string) => Promise<any>;
        clearProxy: () => Promise<any>;
      };
      utils: {
        openExternal: (url: string) => Promise<void>;
        showDevTools: () => Promise<void>;
      };
    };
  }
}

export const KokoWeb: React.FC = () => {
  const [url, setUrl] = useState('https://www.google.com');
  const [status, setStatus] = useState('listo');
  const [isElectron, setIsElectron] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  console.log('🔍 KokoWeb renderizándose...', { isElectron, url, status });

  useEffect(() => {
    // Detectar si está corriendo en Electron
    const checkElectron = () => {
      const isElectronEnv = !!(
        window?.electronAPI?.isElectron ||
        window?.navigator?.userAgent?.includes('Electron') ||
        (window as any)?.process?.type === 'renderer'
      );
      
      console.log('🔍 Verificando entorno:', { 
        electronAPI: !!window?.electronAPI, 
        userAgent: window?.navigator?.userAgent,
        isElectronEnv 
      });
      
      setIsElectron(isElectronEnv);
      
      if (isElectronEnv) {
        setStatus('Modo Electron activado - Navegador completo disponible');
        console.log('🚀 Koko-Web ejecutándose en Electron');
      } else {
        setStatus('Modo iframe - Funcionalidad limitada');
        console.log('🌐 Koko-Web ejecutándose en navegador web/Tauri');
      }
    };

    checkElectron();
  }, []);

  // Mostrar mensaje si Electron no está disponible
  if (!isElectron) {
    console.log('🔍 Renderizando modo no-Electron');
    return (
      <div style={{ 
        width: '100%', 
        height: '100vh', 
        backgroundColor: '#ffffff',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          backgroundColor: '#f3f4f6', 
          border: '2px solid #e5e7eb', 
          borderRadius: '8px', 
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: '#374151', 
            margin: '0 0 16px 0' 
          }}>
            🌐 Koko-Web (Modo Tauri)
          </h2>
          <p style={{ 
            color: '#6b7280', 
            margin: '8px 0',
            fontSize: '16px'
          }}>
            Status: {status}
          </p>
          <p style={{ 
            color: '#059669', 
            margin: '8px 0',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ✅ Componente KokoWeb cargado correctamente
          </p>
        </div>
        
        <div style={{ 
          backgroundColor: '#fffbeb', 
          border: '1px solid #fbbf24', 
          borderRadius: '8px', 
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: '#d97706', fontSize: '24px' }}>⚠️</div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                Navegador en modo iframe
              </h3>
              <p style={{ color: '#b45309', marginTop: '4px', marginBottom: '8px' }}>
                Para usar el navegador completo con webview, ejecuta: <code style={{ backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>npm run dev</code> (Electron)
              </p>
            </div>
          </div>
        </div>
        
        {/* Navegador iframe simplificado */}
        <div style={{ 
          flex: 1,
          border: '1px solid #d1d5db', 
          borderRadius: '8px', 
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          minHeight: '400px'
        }}>
          <div style={{ 
            backgroundColor: '#f9fafb', 
            padding: '12px', 
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              placeholder="Introduce una URL..."
            />
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={() => {
                setStatus('navegando...');
                console.log('Navegando a:', url);
              }}
            >
              Ir
            </button>
          </div>
          
          <div style={{ 
            padding: '20px', 
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <p>URL actual: {url}</p>
            <p>Estado: {status}</p>
            <p style={{ marginTop: '16px', fontSize: '14px' }}>
              💡 El iframe aparecerá aquí cuando se complete la integración
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Interfaz completa de Electron
  console.log('🔍 Renderizando modo Electron');
  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      backgroundColor: '#ffffff',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ 
        backgroundColor: '#dcfce7', 
        border: '2px solid #16a34a', 
        borderRadius: '8px', 
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          color: '#15803d', 
          margin: '0 0 16px 0' 
        }}>
          🚀 Koko-Web (Modo Electron)
        </h2>
        <p style={{ 
          color: '#059669', 
          margin: '8px 0',
          fontSize: '16px',
          fontWeight: '500'
        }}>
          ✅ Navegador completo disponible con webview
        </p>
      </div>
      
      <div style={{ 
        flex: 1,
        border: '1px solid #d1d5db', 
        borderRadius: '8px', 
        overflow: 'hidden',
        backgroundColor: '#ffffff'
      }}>
        <TopBar 
          url={url} 
          setUrl={setUrl} 
          setStatus={setStatus} 
          iframeRef={iframeRef}
        />
        <ElectronWebView 
          url={url} 
          setStatus={setStatus}
        />
        <StatusBar status={status} />
      </div>
    </div>
  );
};
