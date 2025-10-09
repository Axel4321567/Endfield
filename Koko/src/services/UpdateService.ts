export interface UpdateInfo {
  hasUpdate: boolean;
  latestCommit?: string;
  currentCommit?: string;
  commitMessage?: string;
  author?: string;
  date?: string;
}

/**
 * Servicio de actualización para Koko Browser
 * Detecta cambios en la rama main del repositorio Axel4321567/Endfield
 */
export class UpdateService {
  private static readonly REPO_OWNER = 'Axel4321567';
  private static readonly REPO_NAME = 'Endfield';
  private static readonly BRANCH = 'main';
  private static readonly STORAGE_KEY = 'koko_last_commit';

  /**
   * Verifica si hay una nueva versión disponible
   */
  static async checkForNewVersion(): Promise<UpdateInfo> {
    try {
      console.log('🔍 [UpdateService] Verificando actualizaciones...');
      
      const response = await fetch(
        `https://api.github.com/repos/${this.REPO_OWNER}/${this.REPO_NAME}/commits/${this.BRANCH}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Koko-Browser'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API responded with ${response.status}`);
      }

      const data = await response.json();
      const latestCommit = data.sha;
      const commitMessage = data.commit.message;
      const author = data.commit.author.name;
      const date = data.commit.author.date;

      console.log('📦 [UpdateService] Último commit:', {
        sha: latestCommit.substring(0, 7),
        message: commitMessage.split('\n')[0],
        author,
        date
      });

      const storedCommit = localStorage.getItem(this.STORAGE_KEY);
      const hasUpdate = storedCommit ? storedCommit !== latestCommit : false;

      if (!storedCommit) {
        // Primera vez ejecutando, guardar commit actual
        localStorage.setItem(this.STORAGE_KEY, latestCommit);
      }

      return {
        hasUpdate,
        latestCommit,
        currentCommit: storedCommit || undefined,
        commitMessage,
        author,
        date
      };
    } catch (error) {
      console.error('❌ [UpdateService] Error verificando actualizaciones:', error);
      return { hasUpdate: false };
    }
  }

  /**
   * Actualiza a la última versión desde GitHub
   */
  static async updateToLatestVersion(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🚀 [UpdateService] Iniciando actualización...');
      
      if (!window.electronAPI) {
        reject(new Error('API de Electron no disponible'));
        return;
      }

      // Usar la API de Electron para ejecutar comandos del sistema
      (window as any).electronAPI.system?.executeUpdate()
        .then((result: any) => {
          console.log('✅ [UpdateService] Actualización completada:', result);
          
          // Actualizar el commit almacenado
          this.markAsUpdated();
          resolve();
        })
        .catch((error: any) => {
          console.error('❌ [UpdateService] Error en actualización:', error);
          reject(error);
        });
    });
  }

  /**
   * Marca la aplicación como actualizada
   */
  static async markAsUpdated(): Promise<void> {
    try {
      const updateInfo = await this.checkForNewVersion();
      if (updateInfo.latestCommit) {
        localStorage.setItem(this.STORAGE_KEY, updateInfo.latestCommit);
        console.log('✅ [UpdateService] Commit actualizado marcado como actual');
      }
    } catch (error) {
      console.error('❌ [UpdateService] Error marcando como actualizado:', error);
    }
  }

  /**
   * Obtiene información del commit actual
   */
  static getCurrentCommit(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * Resetea el estado de actualización (útil para testing)
   */
  static resetUpdateState(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🔄 [UpdateService] Estado de actualización reseteado');
  }
}