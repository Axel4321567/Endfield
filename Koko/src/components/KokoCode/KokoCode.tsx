import { useEffect, useRef, useState } from 'react';
import './KokoCode.css';

export const KokoCode = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVSCodeEmbedded, setIsVSCodeEmbedded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hwndRef = useRef<number | null>(null); // Guardar HWND para actualizaciones

  useEffect(() => {
    const embedVSCode = async () => {
      if (!containerRef.current) return;
      // No embeber si ya está embebido
      if (isVSCodeEmbedded) return;

      try {
        // Obtener las dimensiones del contenedor
        const rect = containerRef.current.getBoundingClientRect();
        
        // Solicitar a Electron que embeba VS Code
        if (window.electronAPI?.kokoCode?.embedVSCode) {
          const result = await window.electronAPI.kokoCode.embedVSCode({
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          });

          if (result.success) {
            setIsVSCodeEmbedded(true);
            setError(null);
            if (result.hwnd) {
              hwndRef.current = result.hwnd;
            }
          } else {
            setError(result.error || 'No se pudo embeber VS Code');
          }
        } else {
          setError('API de Koko-Code no disponible');
        }
      } catch (err) {
        setError(`Error al embeber VS Code: ${err}`);
        console.error('Error embedding VS Code:', err);
      }
    };

    // Solo intentar embeber al montar
    embedVSCode();

    // Actualizar posición solo cuando cambie el tamaño de la VENTANA principal
    let resizeTimeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      // Debounce para evitar demasiadas llamadas
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      resizeTimeout = setTimeout(() => {
        if (containerRef.current && hwndRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const bounds = {
            hwnd: hwndRef.current,
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          };
          
          console.log('📊 [Window Resize] Dimensiones:', {
            container: {
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height
            },
            window: {
              width: window.innerWidth,
              height: window.innerHeight
            }
          });
          
          if (window.electronAPI?.kokoCode?.updatePosition) {
            window.electronAPI.kokoCode.updatePosition(bounds);
          }
        }
      }, 100);
    };

    // Solo listener de resize de ventana principal (NO ResizeObserver para evitar duplicados)
    window.addEventListener('resize', handleResize);

    // Actualizar posición después de un pequeño delay (para asegurar que el layout está listo)
    const initialResizeTimer = setTimeout(() => {
      handleResize();
    }, 100);

    // Cleanup: desembeber VS Code cuando se desmonte el componente
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      clearTimeout(initialResizeTimer);
      if (isVSCodeEmbedded) {
        window.electronAPI?.kokoCode?.detachVSCode();
        hwndRef.current = null;
      }
    };
  }, []); // Array vacío - solo ejecutar al montar

  const handleLaunchVSCode = async () => {
    try {
      if (window.electronAPI?.kokoCode?.launchVSCode) {
        await window.electronAPI.kokoCode.launchVSCode();
      }
    } catch (err) {
      setError(`Error al lanzar VS Code: ${err}`);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="koko-code-embed-container"
      style={{
        background: isVSCodeEmbedded ? 'transparent' : '#1e1e1e',
        width: '100%',
        height: '100%'
      }}
    >
      {!isVSCodeEmbedded && !error && (
        <div className="koko-code-placeholder">
          <div className="koko-code-placeholder-icon">💻</div>
          <h3>Visual Studio Code</h3>
          <p>Embebiendo VS Code en la aplicación...</p>
          <div className="koko-code-loader"></div>
        </div>
      )}
      
      {error && (
        <div className="koko-code-error">
          <p>⚠️ {error}</p>
          <button onClick={handleLaunchVSCode}>Reintentar</button>
        </div>
      )}
    </div>
  );
};
