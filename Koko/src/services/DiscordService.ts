export interface DiscordSettings {
  theme: 'dark' | 'light';
  notifications: boolean;
  autoStart: boolean;
  customCSS: string;
  soundEnabled: boolean;
  showInSystemTray: boolean;
}

export interface DiscordStatus {
  connected: boolean;
  user?: {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
  };
  guilds: number;
  lastActivity?: Date;
}

export interface DiscordNotification {
  type: 'message' | 'call' | 'mention' | 'system';
  title: string;
  content: string;
  avatar?: string;
  guild?: string;
  channel?: string;
  timestamp: Date;
}

/**
 * Servicio de Discord para Koko Browser
 * Maneja la integración, configuración y comunicación con Discord embebido
 */
export class DiscordService {
  private static readonly STORAGE_PREFIX = 'koko_discord_';
  private static readonly DEFAULT_SETTINGS: DiscordSettings = {
    theme: 'dark',
    notifications: true,
    autoStart: false,
    customCSS: '',
    soundEnabled: true,
    showInSystemTray: true
  };

  /**
   * Obtiene la configuración actual de Discord
   */
  static async getSettings(): Promise<DiscordSettings> {
    try {
      console.log('📋 [DiscordService] Obteniendo configuración...');
      
      // Intentar obtener desde Electron API primero
      if (window.electronAPI?.discord?.getSettings) {
        const electronSettings = await window.electronAPI.discord.getSettings();
        return { ...this.DEFAULT_SETTINGS, ...electronSettings };
      }

      // Fallback a localStorage
      const stored = localStorage.getItem(this.STORAGE_PREFIX + 'settings');
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        return { ...this.DEFAULT_SETTINGS, ...parsedSettings };
      }

      return this.DEFAULT_SETTINGS;
    } catch (error) {
      console.error('❌ [DiscordService] Error obteniendo configuración:', error);
      return this.DEFAULT_SETTINGS;
    }
  }

  /**
   * Guarda la configuración de Discord
   */
  static async setSettings(settings: Partial<DiscordSettings>): Promise<boolean> {
    try {
      console.log('⚙️ [DiscordService] Guardando configuración:', settings);
      
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...settings };

      // Intentar guardar en Electron API primero
      if (window.electronAPI?.discord?.setSettings) {
        const result = await window.electronAPI.discord.setSettings(newSettings);
        if (result.success) {
          // También guardar en localStorage como backup
          localStorage.setItem(this.STORAGE_PREFIX + 'settings', JSON.stringify(newSettings));
          return true;
        }
      }

      // Fallback a localStorage
      localStorage.setItem(this.STORAGE_PREFIX + 'settings', JSON.stringify(newSettings));
      return true;
    } catch (error) {
      console.error('❌ [DiscordService] Error guardando configuración:', error);
      return false;
    }
  }

  /**
   * Obtiene el estado actual de Discord
   */
  static async getStatus(): Promise<DiscordStatus> {
    try {
      console.log('📊 [DiscordService] Obteniendo estado de Discord...');
      
      // Intentar obtener desde Electron API
      if (window.electronAPI?.discord?.getStatus) {
        const status = await window.electronAPI.discord.getStatus();
        return {
          connected: status.connected,
          user: status.user,
          guilds: status.guilds || 0
        };
      }

      // Fallback: estado por defecto
      return {
        connected: false,
        guilds: 0
      };
    } catch (error) {
      console.error('❌ [DiscordService] Error obteniendo estado:', error);
      return {
        connected: false,
        guilds: 0
      };
    }
  }

  /**
   * Recarga el webview de Discord
   */
  static async reload(): Promise<boolean> {
    try {
      console.log('🔄 [DiscordService] Recargando Discord...');
      
      if (window.electronAPI?.discord?.reload) {
        const result = await window.electronAPI.discord.reload();
        return result.success;
      }

      // Fallback: recargar la página completa si no hay API de Electron
      if (typeof window !== 'undefined') {
        window.location.reload();
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [DiscordService] Error recargando Discord:', error);
      return false;
    }
  }

  /**
   * Inyecta CSS personalizado en Discord
   */
  static async injectCustomCSS(css: string): Promise<boolean> {
    try {
      console.log('🎨 [DiscordService] Inyectando CSS personalizado...');
      
      if (window.electronAPI?.discord?.injectCSS) {
        const result = await window.electronAPI.discord.injectCSS(css);
        if (result.success) {
          // Guardar el CSS en la configuración
          await this.setSettings({ customCSS: css });
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('❌ [DiscordService] Error inyectando CSS:', error);
      return false;
    }
  }

  /**
   * Optimiza Discord para mejor rendimiento
   */
  static async optimize(): Promise<boolean> {
    try {
      console.log('🚀 [DiscordService] Optimizando Discord...');
      
      if (window.electronAPI?.discord?.optimize) {
        const result = await window.electronAPI.discord.optimize();
        return result.success;
      }

      return false;
    } catch (error) {
      console.error('❌ [DiscordService] Error optimizando Discord:', error);
      return false;
    }
  }

  /**
   * Configurar listeners para eventos de Discord
   */
  static setupEventListeners(): void {
    try {
      console.log('👂 [DiscordService] Configurando listeners de eventos...');
      
      // Listener para cambios de estado
      if (window.electronAPI?.discord?.onStatusChange) {
        window.electronAPI.discord.onStatusChange((_, status) => {
          console.log('🔄 [Discord] Estado cambiado:', status);
          // Emitir evento personalizado para que los componentes puedan reaccionar
          const customEvent = new CustomEvent('discord-status-changed', { detail: status });
          window.dispatchEvent(customEvent);
        });
      }

      // Listener para notificaciones
      if (window.electronAPI?.discord?.onNotification) {
        window.electronAPI.discord.onNotification((_, notification) => {
          console.log('🔔 [Discord] Nueva notificación:', notification);
          // Emitir evento personalizado para notificaciones
          const customEvent = new CustomEvent('discord-notification', { detail: notification });
          window.dispatchEvent(customEvent);
          
          // Mostrar notificación del sistema si está habilitado
          this.showSystemNotification(notification);
        });
      }
    } catch (error) {
      console.error('❌ [DiscordService] Error configurando listeners:', error);
    }
  }

  /**
   * Limpiar listeners de eventos
   */
  static cleanupEventListeners(): void {
    try {
      console.log('🧹 [DiscordService] Limpiando listeners de eventos...');
      
      if (window.electronAPI?.discord?.removeStatusChangeListener) {
        window.electronAPI.discord.removeStatusChangeListener();
      }

      if (window.electronAPI?.discord?.removeNotificationListener) {
        window.electronAPI.discord.removeNotificationListener();
      }
    } catch (error) {
      console.error('❌ [DiscordService] Error limpiando listeners:', error);
    }
  }

  /**
   * Mostrar notificación del sistema
   */
  private static async showSystemNotification(notification: DiscordNotification): Promise<void> {
    try {
      const settings = await this.getSettings();
      
      if (!settings.notifications || !('Notification' in window)) {
        return;
      }

      // Solicitar permiso si es necesario
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      if (Notification.permission === 'granted') {
        const systemNotification = new Notification(notification.title, {
          body: notification.content,
          icon: notification.avatar || '/vite.svg',
          tag: 'discord-notification',
          requireInteraction: false
        });

        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
          systemNotification.close();
        }, 5000);

        // Manejar clic en la notificación
        systemNotification.onclick = () => {
          window.focus();
          systemNotification.close();
        };
      }
    } catch (error) {
      console.error('❌ [DiscordService] Error mostrando notificación del sistema:', error);
    }
  }

  /**
   * Obtener CSS personalizado predefinido para Discord
   */
  static getPresetCSS(): Record<string, string> {
    return {
      'Koko Theme': `
        /* Tema personalizado de Koko para Discord */
        .app-2rEoOp {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        }
        
        .sidebar-2K8pFh {
          background: rgba(0, 0, 0, 0.2) !important;
        }
        
        .content-98HsJk {
          background: rgba(255, 255, 255, 0.05) !important;
        }
        
        .messageListItem-1-AZ7G {
          background: rgba(255, 255, 255, 0.03) !important;
          border-radius: 8px !important;
          margin: 4px 0 !important;
        }
      `,
      'Dark Mode+': `
        /* Modo oscuro mejorado */
        .app-2rEoOp {
          background: #0d1117 !important;
        }
        
        .sidebar-2K8pFh {
          background: #161b22 !important;
        }
        
        .content-98HsJk {
          background: #0d1117 !important;
        }
      `,
      'Compact Mode': `
        /* Modo compacto para espacios pequeños */
        .sidebar-2K8pFh {
          width: 200px !important;
        }
        
        .messageListItem-1-AZ7G {
          padding: 2px 16px !important;
        }
        
        .avatar-1BDn8e {
          width: 32px !important;
          height: 32px !important;
        }
      `
    };
  }

  /**
   * Inicializar el servicio de Discord
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🚀 [DiscordService] Inicializando servicio...');
      
      // Configurar listeners de eventos
      this.setupEventListeners();
      
      // Cargar configuración y aplicar CSS personalizado si existe
      const settings = await this.getSettings();
      if (settings.customCSS) {
        await this.injectCustomCSS(settings.customCSS);
      }
      
      // Optimizar Discord si está configurado
      if (settings.autoStart) {
        await this.optimize();
      }
      
      console.log('✅ [DiscordService] Servicio inicializado correctamente');
    } catch (error) {
      console.error('❌ [DiscordService] Error inicializando servicio:', error);
    }
  }

  /**
   * Limpiar el servicio al desmontar
   */
  static cleanup(): void {
    console.log('🧹 [DiscordService] Limpiando servicio...');
    this.cleanupEventListeners();
  }
}