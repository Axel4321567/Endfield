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
      
      // Verificar si VS Code ya existe (estado global)
      const info = await window.electronAPI?.kokoCode?.getInfo();
      if (info && info.hwnd) {
        // VS Code ya existe, solo mostrar y actualizar posición
        console.log('🔄 [KokoCode] VS Code ya existe, mostrando y actualizando...');
        hwndRef.current = info.hwnd;
        setIsVSCodeEmbedded(true);
        
        // Mostrar la ventana
        await window.electronAPI?.kokoCode?.setVisibility(true);
        
        // Actualizar posición después de un delay
        setTimeout(() => {
          if (hwndRef.current) {
            const contentArea = document.querySelector('.content-area');
            if (contentArea) {
              const contentRect = contentArea.getBoundingClientRect();
              
              const bounds = {
                hwnd: hwndRef.current,
                x: Math.round(contentRect.left),
                y: Math.round(contentRect.top),
                width: Math.round(contentRect.width),
                height: Math.round(contentRect.height)
              };
              console.log('📐 [KokoCode Mount] Actualizando posición:', bounds);
              window.electronAPI?.kokoCode?.updatePosition(bounds);
            }
          }
        }, 100);
        return;
      }

      try {
        // Esperar un frame para asegurar que el layout está listo
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // Calcular dimensiones desde el contenedor .content-area
        const contentArea = document.querySelector('.content-area');
        if (!contentArea) {
          console.warn('⚠️ [KokoCode] No se encontró el contenedor .content-area');
          setError('No se encontró el contenedor .content-area');
          return;
        }
        
        const contentRect = contentArea.getBoundingClientRect();
        
        const bounds = {
          x: Math.round(contentRect.left),
          y: Math.round(contentRect.top),
          width: Math.round(contentRect.width),
          height: Math.round(contentRect.height)
        };
        
        console.log('📐 [KokoCode] Dimensiones calculadas desde .content-area:', bounds);
        
        // Verificar que tiene dimensiones válidas
        if (bounds.width === 0 || bounds.height === 0) {
          console.warn('⚠️ [KokoCode] Dimensiones inválidas, esperando...');
          setError('Esperando dimensiones válidas...');
          return;
        }
        
        // Solicitar a Electron que embeba VS Code
        if (window.electronAPI?.kokoCode?.embedVSCode) {
          const result = await window.electronAPI.kokoCode.embedVSCode(bounds);

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

    // Intentar embeber al montar
    embedVSCode();
  }, []); // Solo al montar

  useEffect(() => {
    // Actualizar posición solo cuando cambie el tamaño de la VENTANA principal
    let resizeTimeout: NodeJS.Timeout | null = null;
    let observerTimeout: NodeJS.Timeout | null = null;
    
    const handleResize = () => {
      // Debounce para evitar demasiadas llamadas
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      resizeTimeout = setTimeout(() => {
        if (hwndRef.current) {
          const contentArea = document.querySelector('.content-area');
          if (contentArea) {
            const contentRect = contentArea.getBoundingClientRect();
            
            const bounds = {
              hwnd: hwndRef.current,
              x: Math.round(contentRect.left),
              y: Math.round(contentRect.top),
              width: Math.round(contentRect.width),
              height: Math.round(contentRect.height)
            };
          
            console.log('📊 [Window Resize] Dimensiones:', bounds);
          
            if (window.electronAPI?.kokoCode?.updatePosition) {
              window.electronAPI.kokoCode.updatePosition(bounds);
            }
          }
        }
      }, 100);
    };

    // ResizeObserver para detectar cambios en el contenedor (sidebar collapse/expand)
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver((entries) => {
        // Debounce para evitar updates en cada frame de animación
        if (observerTimeout) {
          clearTimeout(observerTimeout);
        }
        
        observerTimeout = setTimeout(() => {
          for (const entry of entries) {
            if (hwndRef.current) {
              // Calcular posición desde .content-area
              const contentArea = document.querySelector('.content-area');
              if (contentArea) {
                const contentRect = contentArea.getBoundingClientRect();
                
                const bounds = {
                  hwnd: hwndRef.current,
                  x: Math.round(contentRect.left),
                  y: Math.round(contentRect.top),
                  width: Math.round(contentRect.width),
                  height: Math.round(contentRect.height)
                };
                
                console.log('📏 [Container Resize] Bounds calculados desde .content-area:', bounds);
              
                if (bounds.width > 0 && bounds.height > 0) {
                  window.electronAPI?.kokoCode?.updatePosition(bounds);
                }
              }
            }
          }
        }, 150); // Debounce más largo para evitar updates durante animación
      });
      resizeObserver.observe(containerRef.current);
    }

    // Solo listener de resize de ventana principal (NO ResizeObserver para evitar duplicados)
    window.addEventListener('resize', handleResize);

    // Actualizar posición después de un pequeño delay (para asegurar que el layout está listo)
    const initialResizeTimer = setTimeout(() => {
      handleResize();
    }, 100);

    // Cleanup: solo ocultar VS Code, NO cerrarlo
    return () => {
      console.log('🔓 [KokoCode Cleanup] Desmontando componente...');
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      if (observerTimeout) {
        clearTimeout(observerTimeout);
      }
      clearTimeout(initialResizeTimer);
      
      // Ocultar VS Code cuando se desmonte el componente
      if (hwndRef.current) {
        console.log('👁️ [KokoCode Cleanup] Ocultando VS Code HWND:', hwndRef.current);
        window.electronAPI?.kokoCode?.setVisibility(false);
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
