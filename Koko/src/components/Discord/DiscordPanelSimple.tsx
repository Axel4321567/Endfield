import React, { useRef, useEffect } from 'react';
import { useLogger } from '../../contexts/LogsContext';
import './DiscordPanelSimple.css';

interface DiscordPanelProps {
  className?: string;
}

const DiscordPanelSimple: React.FC<DiscordPanelProps> = ({ className = '' }) => {
  const webviewRef = useRef<any>(null);
  const { addLog } = useLogger();

  useEffect(() => {
    addLog('🚀 Discord panel iniciado', 'success', 'discord');
    
    if (webviewRef.current) {
      const webview = webviewRef.current;
      
      const handleDomReady = async () => {
        addLog('🎯 Discord WebView cargado', 'info', 'discord');
        
        // Script de limpieza UI (modales y decoraciones)
        const cleanUIScript = `
          function hideModals() {
            document.querySelectorAll('[class*="modal"], [class*="backdrop"]').forEach(el => {
              el.style.display = 'none';
              el.remove();
            });
          }
          
          function removeBlueLines() {
            document.querySelectorAll('*').forEach(el => {
              const style = window.getComputedStyle(el);
              if (style.borderColor.includes('blue') || style.borderColor.includes('#5865f2')) {
                el.style.border = 'none';
              }
            });
          }
          
          setInterval(() => {
            hideModals();
            removeBlueLines();
          }, 500);
          
          hideModals();
          removeBlueLines();
        `;
        
        // Ejecutar script de limpieza UI
        webview.executeJavaScript(cleanUIScript).catch(console.warn);
        
        // CSS para limpiar Discord (estilo Opera)
        const cleanCSS = `
          * { border: none !important; outline: none !important; }
          [class*="modal"], [class*="backdrop"] { display: none !important; }
          .sidebar-2K8pFh { width: 50px !important; }
          .listItem-2P_4kh .wrapper-25eVIn { width: 40px !important; height: 40px !important; }
          .container-1r6BKw { margin-left: 50px !important; }
          .sidebar-2K8pFh + .container-3w7J-x { width: 180px !important; }
          .toolbar-1t6TWx { height: 40px !important; }
          .member-3-YXUe { padding: 4px 8px !important; height: 36px !important; }
        `;
        
        // Aplicar CSS y re-aplicar cada segundo por 5 segundos
        webview.insertCSS(cleanCSS).catch(console.warn);
        let attempts = 0;
        const interval = setInterval(() => {
          webview.insertCSS(cleanCSS).catch(console.warn);
          if (++attempts >= 5) clearInterval(interval);
        }, 1000);
      };

      webview.addEventListener('dom-ready', handleDomReady);
      
      // Bloquear popups
      webview.addEventListener('new-window', (e: any) => {
        e.preventDefault();
        addLog(`🚫 Popup bloqueado: ${e.url}`, 'warn', 'discord');
      });
      
      // Configurar sesión persistente al cargar (SOLO UNA VEZ)
      let scriptsInjected = false;
      
      webview.addEventListener('did-finish-load', async () => {
        addLog('✅ Discord cargado', 'success', 'discord');
        
        // Inyectar scripts solo una vez
        if (!scriptsInjected && window.electronAPI?.credentialCapture?.inject) {
          try {
            await window.electronAPI.credentialCapture.inject(webview.getWebContentsId(), 'discord-full');
            scriptsInjected = true;
            addLog('✅ Script de Discord inyectado (autologin + captura)', 'success', 'discord');
          } catch (error) {
            console.warn('⚠️ Error inyectando script de Discord:', error);
          }
        }
        
        // Intentar restaurar token guardado
        try {
          if (window.electronAPI?.discord?.getToken) {
            const savedToken = await window.electronAPI.discord.getToken();
            
            if (savedToken) {
              addLog('🔑 Token encontrado, restaurando sesión', 'info', 'discord');
              
              // Restaurar sesión con token
              await webview.executeJavaScript(`
                try {
                  localStorage.setItem("token", '"${savedToken}"');
                  localStorage.setItem('discord_persistent_session', 'true');
                  localStorage.setItem('discord_remember_me', 'true');
                  
                  if (!location.href.includes("discord.com/app") && !location.href.includes("discord.com/channels")) {
                    console.log('🔄 Redirigiendo a Discord app...');
                    location.href = "https://discord.com/app";
                  }
                } catch (e) { console.error('Error restaurando token:', e); }
              `);
            }
          }
        } catch (e) {
          console.warn('Error recuperando token:', e);
        }
        
        // Nota: Toda la lógica de sesión, captura de tokens y bloqueo de logout
        // ahora está manejada por el script centralizado de Discord
        // que se inyecta arriba con 'discord-full'
      });

      return () => {
        webview.removeEventListener('dom-ready', handleDomReady);
      };
    }
  }, []);

  return (
    <div className={`discord-panel ${className}`}>
      {/* WebView ocupando toda la altura - sin header */}
      <div className="discord-panel__webview-container">
        <webview
          ref={webviewRef}
          src="https://discord.com/app"
          partition="persist:discord"
          preload="file://electron/preload-webview.js"
          allowpopups={false}
          disablewebsecurity={true}
          nodeintegration={false}
          webpreferences="contextIsolation=true"
          useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          className="discord-panel__webview"
        />
      </div>
    </div>
  );
};

export default DiscordPanelSimple;