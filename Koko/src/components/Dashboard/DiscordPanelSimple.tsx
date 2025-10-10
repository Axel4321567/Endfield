import React, { useRef, useEffect } from 'react';
import { useLogger } from '../../contexts/LogsContext';
import './DiscordPanel.css';

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
      
      const handleDomReady = () => {
        addLog('🎯 Discord WebView cargado, aplicando estilos Opera', 'info', 'discord');
        console.log('🎯 [Discord] Aplicando estilos Opera');
        
        // JavaScript para ocultar modales y mantener sesión
        const discordScript = `
          // Función para ocultar modales de 2FA/seguridad
          function hideSecurityModals() {
            const modals = document.querySelectorAll(
              '.modal-yWgWj-, .backdrop-1wrmKB, [class*="modal"], [class*="backdrop"], ' +
              '[aria-label*="seguridad"], [aria-label*="clave"], [aria-label*="security"]'
            );
            modals.forEach(modal => {
              modal.style.display = 'none';
              modal.style.visibility = 'hidden';
              modal.style.opacity = '0';
              modal.remove();
            });
          }
          
          // Función para eliminar líneas azules dinámicamente
          function removeBlueLines() {
            const elements = document.querySelectorAll('*');
            elements.forEach(el => {
              const style = window.getComputedStyle(el);
              if (style.borderColor.includes('blue') || style.borderColor.includes('#5865f2') || 
                  style.borderColor.includes('rgb(88, 101, 242)')) {
                el.style.border = 'none';
                el.style.borderRight = 'none';
                el.style.borderLeft = 'none';
              }
            });
          }
          
          // Ejecutar funciones cada 100ms
          setInterval(() => {
            hideSecurityModals();
            removeBlueLines();
            
            // Mantener sesión activa
            try {
              if (localStorage.getItem('discord_persistent_session') !== 'true') {
                localStorage.setItem('discord_persistent_session', 'true');
              }
              
              // Verificar si estamos en página de login y hay token guardado
              if (window.location.href.includes('/login') && localStorage.getItem('token')) {
                console.log('🔄 [Discord] Detectada sesión existente, redirigiendo...');
                window.location.href = '/app';
              }
              
              // Simular actividad para evitar timeout de sesión
              if (window.location.href.includes('/app') || window.location.href.includes('/channels')) {
                try {
                  // Disparar eventos de mouse para simular actividad
                  const mouseEvent = new MouseEvent('mousemove', {
                    bubbles: true,
                    cancelable: true,
                    clientX: Math.random() * 100,
                    clientY: Math.random() * 100
                  });
                  document.dispatchEvent(mouseEvent);
                  
                  // Mantener el documento como "activo"
                  if (document.hidden) {
                    Object.defineProperty(document, 'hidden', {
                      value: false,
                      writable: false
                    });
                  }
                  
                  if (document.visibilityState === 'hidden') {
                    Object.defineProperty(document, 'visibilityState', {
                      value: 'visible',
                      writable: false
                    });
                  }
                } catch (e) {
                  // Ignorar errores de simulación de actividad
                }
              }
            } catch (e) {
              // Ignorar errores de localStorage
            }
          }, 100);
          
          // Ejecutar inmediatamente
          hideSecurityModals();
          removeBlueLines();
        `;
        
        // Ejecutar JavaScript
        try {
          webview.executeJavaScript(discordScript);
          addLog('✅ JavaScript ejecutado en Discord WebView', 'success', 'discord');
        } catch (e) {
          addLog('❌ Error al ejecutar JavaScript en Discord', 'error', 'discord');
          console.warn('No se pudo ejecutar JavaScript:', e);
        }
        
        // CSS para eliminar bordes y hacer Discord más limpio
        const operaCSS = `
          /* ELIMINAR ABSOLUTAMENTE TODAS LAS LÍNEAS AZULES */
          * {
            border: none !important;
            border-right: none !important;
            border-left: none !important;
            border-top: none !important;
            border-bottom: none !important;
            outline: none !important;
            box-shadow: none !important;
          }
          
          *:hover, *:focus, *:active {
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
          }
          
          *::before, *::after {
            border: none !important;
            background: none !important;
            box-shadow: none !important;
            display: none !important;
          }
          
          /* Ocultar TODOS los modales de seguridad */
          .modal-yWgWj-, .backdrop-1wrmKB, 
          [class*="modal"], [class*="backdrop"],
          [aria-label*="seguridad"], [aria-label*="clave"], 
          [aria-label*="security"], [aria-label*="key"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            position: absolute !important;
            top: -9999px !important;
            left: -9999px !important;
          }
          
          /* Eliminar divisores específicos */
          .resizeHandle-PBRzPC,
          .divider-JfaTT5,
          .dividerDefault-3C2-ws,
          .dividerBefore-2Xt3g_,
          .dividerAfter-2o5uqK,
          .sidebar-2K8pFh,
          .container-3w7J-x,
          .chatContent-a9vAAp,
          .content-yTz4x3,
          .membersWrap-2h-GB4,
          .members-1998pB,
          .searchBar-3dMhjb,
          .titleBar-AC4pGV,
          .divider-3_HH5L,
          [class*="divider"],
          [class*="border"],
          [class*="Border"] {
            border: none !important;
            border-right: none !important;
            border-left: none !important;
            border-top: none !important;
            border-bottom: none !important;
          }
          
          /* Hacer el sidebar de servidores más pequeño como Opera */
          .sidebar-2K8pFh .scrollerBase-289Jih {
            width: 50px !important;
          }
          
          .sidebar-2K8pFh {
            width: 50px !important;
            min-width: 50px !important;
            flex: 0 0 50px !important;
          }
          
          /* Iconos de servidores más pequeños */
          .listItem-2P_4kh .wrapper-25eVIn {
            width: 40px !important;
            height: 40px !important;
          }
          
          /* Ajustar contenedor principal */
          .container-1r6BKw {
            margin-left: 50px !important;
          }
          
          /* Panel de canales más estrecho */
          .sidebar-2K8pFh + .container-3w7J-x {
            width: 180px !important;
            min-width: 180px !important;
            flex: 0 0 180px !important;
          }
          
          /* Lista de amigos más compacta */
          .peopleList-3c4jOR {
            padding: 8px !important;
          }
          
          /* Elementos de la lista más pequeños */
          .peopleListItem-2nzedh {
            padding: 8px 16px !important;
            margin: 2px 0 !important;
          }
          
          /* Avatares más pequeños */
          .avatar-1BDn8e {
            width: 28px !important;
            height: 28px !important;
          }
          
          /* Header más compacto */
          .toolbar-1t6TWx {
            height: 40px !important;
            padding: 0 8px !important;
          }
          
          /* Eliminar padding excesivo */
          .content-yTz4x3 {
            padding: 0 !important;
          }
          
          /* Hacer la búsqueda más pequeña */
          .searchBar-3dMhjb {
            height: 32px !important;
            margin: 8px 16px !important;
          }
          
          /* Botones más compactos */
          .button-1YfofB {
            height: 32px !important;
            padding: 0 12px !important;
          }
          
          /* Lista de usuarios conectados más compacta */
          .member-3-YXUe {
            padding: 4px 8px !important;
            height: 36px !important;
          }
          
          /* Eliminar espacios innecesarios */
          .scroller-2FKFPG {
            padding: 8px 0 !important;
          }
          
          /* Hacer toda la interfaz más densa */
          .container-3w7J-x .content-yTz4x3 {
            padding: 0 !important;
          }
        `;
        
        // Aplicar CSS inmediatamente
        webview.insertCSS(operaCSS).catch(console.warn);
        
        // Aplicar CSS cada segundo durante 10 segundos para asegurar que se aplique
        let attempts = 0;
        const applyInterval = setInterval(() => {
          attempts++;
          webview.insertCSS(operaCSS).catch(console.warn);
          
          if (attempts >= 10) {
            clearInterval(applyInterval);
          }
        }, 1000);
      };

      webview.addEventListener('dom-ready', handleDomReady);
      
      // Configurar webview con persistencia de sesión
      webview.partition = 'persist:discord'; // Mantener sesión persistente
      
      // Manejar navegación para evitar popups de seguridad
      webview.addEventListener('new-window', (e: any) => {
        e.preventDefault();
        addLog(`🚫 Popup bloqueado: ${e.url}`, 'warn', 'discord');
        console.log('🚫 [Discord] Popup bloqueado:', e.url);
      });
      
      // Mantener sesión al cargar
      webview.addEventListener('did-finish-load', () => {
        addLog('✅ Carga completa - configurando sesión persistente', 'success', 'discord');
        console.log('✅ [Discord] Carga completa - configurando sesión persistente');
        
        // Inyectar script para mantener sesión
        const sessionScript = `
          // CONFIGURACIÓN AGRESIVA DE PERSISTENCIA DE SESIÓN
          try {
            console.log('💾 [Discord] Configurando persistencia de sesión...');
            
            // Configurar localStorage para mantener sesión
            if (localStorage) {
              localStorage.setItem('discord_auto_login', 'true');
              localStorage.setItem('discord_remember_me', 'true');
              localStorage.setItem('discord_skip_2fa', 'true');
              localStorage.setItem('discord_persistent_session', 'true');
              localStorage.setItem('discord_keep_alive', 'true');
            }
            
            // Configurar sessionStorage también
            if (sessionStorage) {
              sessionStorage.setItem('discord_persistent', 'true');
              sessionStorage.setItem('discord_auto_auth', 'true');
            }
            
            // Configurar cookies manualmente para persistencia
            document.cookie = 'discord_persistent=true; max-age=31536000; secure; samesite=none';
            document.cookie = 'discord_remember=true; max-age=31536000; secure; samesite=none';
            document.cookie = 'discord_auto_login=true; max-age=31536000; secure; samesite=none';
            
            // Interceptar beforeunload para prevenir logout automático
            window.addEventListener('beforeunload', function(e) {
              e.preventDefault();
              e.returnValue = '';
              return '';
            });
            
            // Interceptar pagehide que Discord usa para logout
            window.addEventListener('pagehide', function(e) {
              e.preventDefault();
              e.stopPropagation();
            });
            
            // Interceptar unload
            window.addEventListener('unload', function(e) {
              e.preventDefault();
              e.stopPropagation();
            });
            
            // Interceptar visibilitychange que puede triggear logout
            document.addEventListener('visibilitychange', function(e) {
              if (document.hidden) {
                e.preventDefault();
                e.stopPropagation();
              }
            });
            
            // Interceptar blur del window
            window.addEventListener('blur', function(e) {
              e.preventDefault();
              e.stopPropagation();
            });
            
            // Interceptar y prevenir logout requests
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
              const url = args[0];
              if (typeof url === 'string' && (url.includes('/logout') || url.includes('/auth/logout'))) {
                console.log('🚫 [Discord] Logout request bloqueado:', url);
                return Promise.resolve(new Response('{"success": true}', { 
                  status: 200,
                  headers: {'Content-Type': 'application/json'}
                }));
              }
              return originalFetch.apply(this, args);
            };
            
            // Override XMLHttpRequest para bloquear logout
            const originalXHR = window.XMLHttpRequest.prototype.open;
            window.XMLHttpRequest.prototype.open = function(method, url, ...args) {
              if (typeof url === 'string' && (url.includes('/logout') || url.includes('/auth/logout'))) {
                console.log('🚫 [Discord] XHR Logout request bloqueado:', url);
                url = '/api/v9/users/@me'; // Redirigir a endpoint seguro
              }
              return originalXHR.call(this, method, url, ...args);
            };
            
            // Interceptar clicks en botones de logout
            document.addEventListener('click', function(e) {
              const target = e.target;
              if (target && (
                target.textContent?.includes('Cerrar sesión') ||
                target.textContent?.includes('Log Out') ||
                target.textContent?.includes('Logout') ||
                target.getAttribute('aria-label')?.includes('logout') ||
                target.getAttribute('aria-label')?.includes('Cerrar sesión')
              )) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚫 [Discord] Click en logout bloqueado');
                return false;
              }
            }, true);
            
            console.log('✅ [Discord] Persistencia de sesión configurada correctamente');
          } catch (e) {
            console.warn('❌ [Discord] Error configurando persistencia:', e);
          }
        `;
        
        try {
          webview.executeJavaScript(sessionScript);
        } catch (e) {
          console.warn('No se pudo configurar sesión:', e);
        }
      });

      return () => {
        webview.removeEventListener('dom-ready', handleDomReady);
      };
    }
  }, []);

  return (
    <div className={`discord-panel ${className}`} style={{ height: '100vh', overflow: 'hidden' }}>
      {/* WebView ocupando toda la altura - sin header */}
      <div style={{ height: '100vh', width: '100%' }}>
        <webview
          ref={webviewRef}
          src="https://discord.com/app"
          partition="persist:discord"
          allowpopups={false}
          disablewebsecurity={true}
          nodeintegration={false}
          useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none'
          }}
        />
      </div>
    </div>
  );
};

export default DiscordPanelSimple;