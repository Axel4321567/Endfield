const { net } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class UpdateFetcher {
  constructor() {
    this.downloadProgress = null;
    this.onProgress = null;
  }

  /**
   * Obtiene información de la última versión desde GitHub
   */
  async fetchLatestVersion(channel = 'stable') {
    try {
      const apiUrl = 'https://api.github.com/repos/Axel4321567/Endfield/releases';
      const url = channel === 'stable' ? `${apiUrl}/latest` : apiUrl;
      
      return new Promise((resolve, reject) => {
        const request = net.request(url);
        
        request.on('response', (response) => {
          let data = '';
          
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            try {
              const releases = JSON.parse(data);
              const targetRelease = Array.isArray(releases) 
                ? releases.find(r => channel === 'stable' ? !r.prerelease : r.prerelease)
                : releases;
              
              if (!targetRelease) {
                reject(new Error('No se encontró versión para el canal especificado'));
                return;
              }

              const asset = targetRelease.assets.find(a => 
                a.name.endsWith('.exe') || a.name.includes('Setup')
              );

              if (!asset) {
                reject(new Error('No se encontró archivo ejecutable'));
                return;
              }

              resolve({
                version: targetRelease.tag_name.replace('v', ''),
                downloadUrl: asset.browser_download_url,
                releaseNotes: targetRelease.body || '',
                fileSize: asset.size,
                publishedAt: targetRelease.published_at,
                isPrerelease: targetRelease.prerelease
              });
            } catch (error) {
              reject(new Error(`Error parseando respuesta: ${error.message}`));
            }
          });
        });
        
        request.on('error', (error) => {
          reject(new Error(`Error de red: ${error.message}`));
        });
        
        request.end();
      });
    } catch (error) {
      throw new Error(`Error obteniendo versión: ${error.message}`);
    }
  }

  /**
   * Descarga un archivo desde una URL con reporte de progreso
   */
  async downloadFile(url, destinationPath, onProgress) {
    this.onProgress = onProgress;
    
    return new Promise((resolve, reject) => {
      const request = net.request(url);
      let downloaded = 0;
      let total = 0;
      let startTime = Date.now();
      const chunks = [];

      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Error HTTP: ${response.statusCode}`));
          return;
        }

        total = parseInt(response.headers['content-length'] || '0');
        
        response.on('data', (chunk) => {
          chunks.push(chunk);
          downloaded += chunk.length;
          
          if (this.onProgress && total > 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = downloaded / elapsed;
            const remaining = (total - downloaded) / speed;
            
            this.onProgress({
              downloaded,
              total,
              percentage: (downloaded / total) * 100,
              speed,
              timeRemaining: remaining
            });
          }
        });

        response.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            
            // Crear directorio si no existe
            const dir = path.dirname(destinationPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Escribir archivo
            await fs.writeFile(destinationPath, buffer);
            
            resolve(destinationPath);
          } catch (error) {
            reject(new Error(`Error escribiendo archivo: ${error.message}`));
          }
        });
      });

      request.on('error', (error) => {
        reject(new Error(`Error de descarga: ${error.message}`));
      });

      request.end();
    });
  }

  /**
   * Obtiene el hash SHA256 desde latest.yml o calcula desde el archivo
   */
  async getFileHash(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      throw new Error(`Error calculando hash: ${error.message}`);
    }
  }

  /**
   * Descarga el archivo latest.yml para obtener información de hash
   */
  async fetchLatestYml() {
    try {
      const ymlUrl = 'https://github.com/Axel4321567/Endfield/releases/latest/download/latest.yml';
      
      return new Promise((resolve, reject) => {
        const request = net.request(ymlUrl);
        
        request.on('response', (response) => {
          let data = '';
          
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            try {
              // Parse YAML-like content manually
              const lines = data.split('\\n');
              const ymlData = {};
              
              for (const line of lines) {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length > 0) {
                  ymlData[key.trim()] = valueParts.join(':').trim();
                }
              }
              
              resolve(ymlData);
            } catch (error) {
              reject(new Error(`Error parseando latest.yml: ${error.message}`));
            }
          });
        });
        
        request.on('error', (error) => {
          reject(new Error(`Error descargando latest.yml: ${error.message}`));
        });
        
        request.end();
      });
    } catch (error) {
      throw new Error(`Error obteniendo latest.yml: ${error.message}`);
    }
  }

  /**
   * Cancela una descarga en progreso
   */
  cancelDownload() {
    // Implementar cancelación si es necesario
    if (this.downloadProgress) {
      this.downloadProgress.abort();
      this.downloadProgress = null;
    }
  }

  /**
   * Verifica conectividad a internet
   */
  async checkConnectivity() {
    try {
      return new Promise((resolve) => {
        const request = net.request('https://github.com');
        
        request.on('response', (response) => {
          resolve(response.statusCode === 200);
        });
        
        request.on('error', () => {
          resolve(false);
        });
        
        request.setTimeout(5000, () => {
          request.abort();
          resolve(false);
        });
        
        request.end();
      });
    } catch {
      return false;
    }
  }
}

module.exports = UpdateFetcher;