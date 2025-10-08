import React, { useState, useEffect } from 'react';
import './ElectronController.css';

export const ElectronController: React.FC = () => {
  const [isElectronRunning, setIsElectronRunning] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Función para detectar si Electron está ejecutándose
  const checkElectronStatus = async () => {
    setIsCheckingStatus(true);
    try {
      // Detectar Electron de múltiples maneras
      const electronDetected = !!(
        window.electronAPI?.isElectron ||
        (window as any).require ||
        (window as any).process?.type ||
        navigator.userAgent.toLowerCase().indexOf('electron') > -1 ||
        (window as any).electronAPI
      );
      
      setIsElectronRunning(electronDetected);
      setLastChecked(new Date());
      
      console.log('🔍 Estado de Electron:', {
        detected: electronDetected,
        electronAPI: !!window.electronAPI,
        require: !!(window as any).require,
        processType: (window as any).process?.type,
        userAgent: navigator.userAgent.includes('Electron'),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error verificando estado de Electron:', error);
      setIsElectronRunning(false);
    } finally {
      setIsCheckingStatus(false);
    }
  };



  // Función para iniciar Electron (en desarrollo)
  const startElectron = async () => {
    try {
      console.log('🚀 Iniciando Electron...');
      
      // Verificar si ya está ejecutándose
      if (isElectronRunning) {
        alert('ℹ️ Electron ya está ejecutándose.');
        return;
      }
      
      // Método 1: Si estamos en un navegador web, mostrar instrucciones
      if (!window.electronAPI) {
        const userChoice = confirm(
          '🚀 Para iniciar Electron desde el navegador:\n\n' +
          '1. Abre una nueva terminal\n' +
          '2. Navega al directorio del proyecto\n' +
          '3. Ejecuta: npm run dev:electron-only\n\n' +
          '¿Quieres abrir las instrucciones en una nueva ventana?'
        );
        
        if (userChoice) {
          // Mostrar instrucciones detalladas
          const instructions = `
# 🚀 Instrucciones para iniciar Electron

## Opción 1: Terminal
\`\`\`bash
cd "C:\\Users\\TheYa\\Documents\\Git\\Endfield\\Koko"
npm run dev:electron-only
\`\`\`

## Opción 2: PowerShell
\`\`\`powershell
Set-Location "C:\\Users\\TheYa\\Documents\\Git\\Endfield\\Koko"
npm run dev:electron-only
\`\`\`

## Notas:
- Asegúrate de que Vite esté ejecutándose en http://localhost:5173
- Electron se conectará automáticamente al servidor Vite
- Puedes cerrar Electron sin afectar el servidor web
          `;
          
          // Crear una ventana con las instrucciones
          const newWindow = window.open('', '_blank', 'width=600,height=400');
          if (newWindow) {
            newWindow.document.write(`
              <html>
                <head>
                  <title>Instrucciones para iniciar Electron</title>
                  <style>
                    body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #fff; }
                    pre { background: #2a2a2a; padding: 15px; border-radius: 5px; overflow-x: auto; }
                    h1 { color: #ff4444; }
                    h2 { color: #4a90e2; }
                  </style>
                </head>
                <body>
                  <pre>${instructions}</pre>
                </body>
              </html>
            `);
          }
        }
        return;
      }
      
      // Método 2: Si estamos en Electron, mostrar que ya está activo
      alert('✅ Electron ya está ejecutándose (estás dentro de Electron ahora mismo).');
      
    } catch (error) {
      console.error('❌ Error iniciando Electron:', error);
      alert('❌ Error al intentar iniciar Electron. Consulta la consola para más detalles.');
    }
  };

  // Verificar estado al cargar el componente
  useEffect(() => {
    checkElectronStatus();
    
    // Verificar cada 5 segundos
    const interval = setInterval(checkElectronStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (isCheckingStatus) return '#ffa500'; // Naranja para verificando
    return isElectronRunning ? '#4caf50' : '#f44336'; // Verde para activo, rojo para inactivo
  };

  const getStatusText = () => {
    if (isCheckingStatus) return 'Verificando...';
    return isElectronRunning ? 'Activo' : 'Inactivo';
  };

  const getStatusIcon = () => {
    if (isCheckingStatus) return '🔄';
    return isElectronRunning ? '✅' : '❌';
  };

  return (
    <div className="electron-controller">
      <div className="controller-header">
        <h3 className="controller-title">
          🖥️ Estado de Electron
        </h3>
      </div>
      
      <div className="status-section">
        <div className="status-indicator">
          <span className="status-icon">{getStatusIcon()}</span>
          <span 
            className="status-text"
            style={{ color: getStatusColor() }}
          >
            Estado: {getStatusText()}
          </span>
        </div>
        
        {lastChecked && (
          <div className="last-checked">
            <small>
              Última verificación: {lastChecked.toLocaleTimeString()}
            </small>
          </div>
        )}
      </div>

      <div className="controls-section">
        <button
          onClick={checkElectronStatus}
          disabled={isCheckingStatus}
          className="control-button refresh-button"
        >
          🔄 Verificar Estado
        </button>
        
        <button
          onClick={startElectron}
          className="control-button start-button"
        >
          🚀 Iniciar Electron
        </button>
      </div>

      <div className="info-section">
        <h4>ℹ️ Información del Sistema:</h4>
        <ul>
          <li><strong>Modo actual:</strong> {isElectronRunning ? '🖥️ Aplicación Electron' : '🌐 Navegador Web'}</li>
          <li><strong>UserAgent:</strong> {navigator.userAgent.includes('Electron') ? 'Electron detectado' : 'No Electron'}</li>
          <li><strong>API Electron:</strong> {window.electronAPI ? 'Disponible' : 'No disponible'}</li>
          <li><strong>Proceso:</strong> {(window as any).process?.type || 'No detectado'}</li>
          <li><strong>URL actual:</strong> {window.location.href}</li>
        </ul>
        
        {!isElectronRunning && (
          <div className="web-mode-info">
            <h4>🌐 Modo Navegador Web:</h4>
            <ul>
              <li>✅ Todas las funciones básicas disponibles</li>
              <li>✅ Speed Dial y marcadores funcionan</li>
              <li>⚠️ Algunas páginas pueden tener restricciones iframe</li>
              <li>💡 Para mejor compatibilidad, usa Electron</li>
            </ul>
          </div>
        )}
        
        {isElectronRunning && (
          <div className="electron-mode-info">
            <h4>🖥️ Modo Electron:</h4>
            <ul>
              <li>✅ Compatibilidad completa con sitios web</li>
              <li>✅ Sin restricciones de iframe</li>
              <li>✅ Interceptores de headers activos</li>
              <li>✅ Control total de la aplicación</li>
              <li>💡 Para cerrar Electron, usa Ctrl+Q o cierra la ventana</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};