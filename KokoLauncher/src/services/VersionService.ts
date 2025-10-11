import * as semver from 'semver';

export interface VersionInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
  channel: 'stable' | 'beta' | 'dev';
  downloadUrl?: string;
  releaseNotes?: string;
  fileSize?: number;
  hash?: string;
}

export interface ReleaseInfo {
  version: string;
  downloadUrl: string;
  releaseNotes: string;
  fileSize: number;
  hash: string;
  publishedAt: string;
}

export class VersionService {
  private static readonly API_BASE = 'https://api.github.com/repos/Axel4321567/Endfield';
  private static readonly UPDATE_ENDPOINT = `${this.API_BASE}/releases`;
  private static lastCheckTime: number = 0;
  private static readonly CHECK_INTERVAL = 5 * 60 * 1000; // Aumentado a 5 minutos para reducir llamadas API
  private static cachedVersionInfo: VersionInfo | null = null;
  private static lastRequestTime: number = 0;
  private static readonly MIN_REQUEST_INTERVAL = 10000; // 10 segundos mínimo entre requests

  /**
   * Determina si es necesario verificar actualizaciones (cada 5 minutos)
   */
  static shouldCheckForUpdates(): boolean {
    const now = Date.now();
    return (now - this.lastCheckTime) >= this.CHECK_INTERVAL;
  }

  /**
   * Verifica si podemos hacer una nueva request (rate limiting)
   */
  private static canMakeRequest(): boolean {
    const now = Date.now();
    return (now - this.lastRequestTime) >= this.MIN_REQUEST_INTERVAL;
  }

  /**
   * Espera si es necesario antes de hacer una request
   */
  private static async waitIfNeeded(): Promise<void> {
    if (!this.canMakeRequest()) {
      const waitTime = this.MIN_REQUEST_INTERVAL - (Date.now() - this.lastRequestTime);
      console.log(`Esperando ${waitTime}ms antes de la próxima request...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Fuerza una verificación manual
   */
  static forceCheck(): void {
    this.lastCheckTime = 0;
    this.cachedVersionInfo = null;
  }

  /**
   * Obtiene la versión actual instalada de Koko Browser
   */
  static async getCurrentVersion(): Promise<string> {
    try {
      // Importar LaunchService para obtener la versión real del ejecutable
      const { LaunchService } = await import('./LaunchService');
      const installedVersion = await LaunchService.getInstalledVersion();
      
      if (installedVersion) {
        return installedVersion;
      }
      
      // Si no se puede obtener la versión del archivo, usar fallback
      return '0.0.0'; // Indica que no está instalado
    } catch (error) {
      console.warn('Error obteniendo versión actual:', error);
      return '0.0.0';
    }
  }

  /**
   * Obtiene información sobre la última versión disponible desde GitHub
   */
  static async getLatestVersion(channel: string = 'stable'): Promise<ReleaseInfo | null> {
    try {
      // Aplicar rate limiting
      await this.waitIfNeeded();
      
      const response = await fetch(`${this.UPDATE_ENDPOINT}/latest`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'KokoLauncher/1.0.0'
        }
      });
      
      if (!response.ok) {
        // Si obtenemos 403 (rate limit), usar método alternativo
        if (response.status === 403) {
          console.warn('GitHub API rate limit reached, using alternative method');
          return await this.getLatestVersionAlternative();
        }
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const release = await response.json();
      
      // Filtrar por canal si es necesario
      if (channel !== 'stable' && !release.tag_name.includes(channel)) {
        return this.getVersionByChannel(channel);
      }

      // Buscar específicamente el asset del setup
      const setupAsset = release.assets.find((asset: any) => 
        asset.name.includes('Koko-Browser-Setup') && asset.name.endsWith('.exe')
      );

      if (!setupAsset) {
        throw new Error('No se encontró el archivo de instalación');
      }

      return {
        version: release.tag_name.replace('v', ''),
        downloadUrl: setupAsset.browser_download_url,
        releaseNotes: release.body || 'Sin notas de versión',
        fileSize: setupAsset.size,
        hash: setupAsset.digest || '', 
        publishedAt: release.published_at
      };
    } catch (error) {
      console.error('Error obteniendo última versión:', error);
      return null;
    }
  }

  /**
   * Método alternativo cuando se alcanza el rate limit de GitHub
   */
  static async getLatestVersionAlternative(): Promise<ReleaseInfo | null> {
    try {
      // Intentar con el endpoint de todas las releases
      const response = await fetch(this.UPDATE_ENDPOINT, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'KokoLauncher/1.0.0'
        }
      });

      if (!response.ok) {
        // Como último recurso, devolver información hardcodeada
        console.warn('Using fallback version info due to API limitations');
        return {
          version: '1.2.12',
          downloadUrl: 'https://github.com/Axel4321567/Endfield/releases/download/v1.2.12/Koko-Browser-Setup-1.2.12.exe',
          releaseNotes: 'Versión más reciente de Koko Browser',
          fileSize: 90042270,
          hash: '',
          publishedAt: new Date().toISOString()
        };
      }

      const releases = await response.json();
      if (!releases || releases.length === 0) {
        throw new Error('No se encontraron releases');
      }

      // Obtener la primera release (la más reciente)
      const latestRelease = releases[0];
      const setupAsset = latestRelease.assets.find((asset: any) => 
        asset.name.includes('Koko-Browser-Setup') && asset.name.endsWith('.exe')
      );

      if (!setupAsset) {
        throw new Error('No se encontró el archivo de instalación en release alternativa');
      }

      return {
        version: latestRelease.tag_name.replace('v', ''),
        downloadUrl: setupAsset.browser_download_url,
        releaseNotes: latestRelease.body || 'Sin notas de versión',
        fileSize: setupAsset.size,
        hash: setupAsset.digest || '',
        publishedAt: latestRelease.published_at
      };
    } catch (error) {
      console.error('Error en método alternativo:', error);
      return null;
    }
  }

  /**
   * Obtiene versión específica por canal (beta, dev)
   */
  private static async getVersionByChannel(channel: string): Promise<ReleaseInfo | null> {
    try {
      const response = await fetch(this.UPDATE_ENDPOINT);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const releases = await response.json();
      
      const channelRelease = releases.find((release: any) => 
        release.tag_name.includes(channel) || release.prerelease
      );

      if (!channelRelease) {
        return null;
      }

      const asset = channelRelease.assets.find((asset: any) => 
        asset.name.endsWith('.exe')
      );

      return asset ? {
        version: channelRelease.tag_name.replace('v', ''),
        downloadUrl: asset.browser_download_url,
        releaseNotes: channelRelease.body || 'Sin notas de versión',
        fileSize: asset.size,
        hash: '',
        publishedAt: channelRelease.published_at
      } : null;
    } catch (error) {
      console.error('Error obteniendo versión por canal:', error);
      return null;
    }
  }

  /**
   * Compara versiones y determina si hay actualización disponible con caché inteligente
   */
  static async checkForUpdates(forceCheck: boolean = false, channel: string = 'stable'): Promise<VersionInfo> {
    // Si no es una verificación forzada y aún no ha pasado el intervalo, devolver caché
    if (!forceCheck && !this.shouldCheckForUpdates() && this.cachedVersionInfo) {
      return this.cachedVersionInfo;
    }

    try {
      const currentVersion = await this.getCurrentVersion();
      let latestRelease: ReleaseInfo | null = null;
      
      try {
        latestRelease = await this.getLatestVersion(channel);
      } catch (apiError) {
        console.warn('Error de API, usando información de caché o fallback:', apiError);
        
        // Si tenemos caché, usarlo
        if (this.cachedVersionInfo) {
          return this.cachedVersionInfo;
        }
        
        // Si no hay caché, usar información de fallback
        latestRelease = {
          version: '1.2.12',
          downloadUrl: 'https://github.com/Axel4321567/Endfield/releases/download/v1.2.12/Koko-Browser-Setup-1.2.12.exe',
          releaseNotes: 'Versión más reciente de Koko Browser (información limitada por API)',
          fileSize: 90042270,
          hash: '',
          publishedAt: new Date().toISOString()
        };
      }
      
      this.lastCheckTime = Date.now();

      if (!latestRelease) {
        const versionInfo: VersionInfo = {
          current: currentVersion,
          latest: currentVersion,
          hasUpdate: false,
          channel: channel as any
        };
        this.cachedVersionInfo = versionInfo;
        return versionInfo;
      }

      const hasUpdate = semver.gt(latestRelease.version, currentVersion);
      
      const versionInfo: VersionInfo = {
        current: currentVersion,
        latest: latestRelease.version,
        hasUpdate,
        channel: channel as any,
        downloadUrl: hasUpdate ? latestRelease.downloadUrl : undefined,
        releaseNotes: hasUpdate ? latestRelease.releaseNotes : undefined,
        fileSize: hasUpdate ? latestRelease.fileSize : undefined,
        hash: hasUpdate ? latestRelease.hash : undefined
      };

      this.cachedVersionInfo = versionInfo;
      return versionInfo;
    } catch (error) {
      console.error('Error verificando actualizaciones:', error);
      
      // En caso de error, devolver información básica
      const currentVersion = await this.getCurrentVersion();
      const versionInfo: VersionInfo = {
        current: currentVersion,
        latest: currentVersion,
        hasUpdate: false,
        channel: channel as any
      };
      
      this.cachedVersionInfo = versionInfo;
      return versionInfo;
    }
  }

  /**
   * Valida si una versión es mayor que otra
   */
  static isVersionNewer(version1: string, version2: string): boolean {
    try {
      return semver.gt(version1, version2);
    } catch {
      return false;
    }
  }

  /**
   * Obtiene el canal de actualización desde configuración
   */
  static async getUpdateChannel(): Promise<string> {
    try {
      const config = await window.electronAPI?.getConfig();
      return config?.updateChannel || 'stable';
    } catch {
      return 'stable';
    }
  }

  /**
   * Establece el canal de actualización
   */
  static async setUpdateChannel(channel: string): Promise<void> {
    try {
      await window.electronAPI?.setConfig({ updateChannel: channel });
    } catch (error) {
      console.error('Error estableciendo canal:', error);
    }
  }
}