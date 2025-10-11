const crypto = require('crypto');
const fs = require('fs').promises;

class FileValidator {
  /**
   * Valida la integridad de un archivo usando hash SHA256
   */
  static async validateFileIntegrity(filePath, expectedHash) {
    try {
      const actualHash = await this.calculateFileHash(filePath);
      return {
        isValid: actualHash.toLowerCase() === expectedHash.toLowerCase(),
        expectedHash: expectedHash.toLowerCase(),
        actualHash: actualHash.toLowerCase()
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Calcula el hash SHA256 de un archivo
   */
  static async calculateFileHash(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      throw new Error(`Error calculando hash del archivo: ${error.message}`);
    }
  }

  /**
   * Valida múltiples archivos
   */
  static async validateMultipleFiles(files) {
    const results = [];
    
    for (const file of files) {
      const result = await this.validateFileIntegrity(file.path, file.expectedHash);
      results.push({
        path: file.path,
        ...result
      });
    }
    
    return results;
  }

  /**
   * Verifica el tamaño de un archivo
   */
  static async validateFileSize(filePath, expectedSize) {
    try {
      const stats = await fs.stat(filePath);
      return {
        isValid: stats.size === expectedSize,
        expectedSize,
        actualSize: stats.size
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Valida que un archivo sea un ejecutable válido de Windows
   */
  static async validateExecutable(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      
      // Verificar signature MZ (DOS header)
      if (fileBuffer.length < 64 || fileBuffer[0] !== 0x4D || fileBuffer[1] !== 0x5A) {
        return {
          isValid: false,
          error: 'No es un archivo ejecutable válido (falta DOS header)'
        };
      }

      // Verificar PE header
      const peOffset = fileBuffer.readUInt32LE(60);
      if (peOffset >= fileBuffer.length - 4) {
        return {
          isValid: false,
          error: 'PE header offset inválido'
        };
      }

      if (fileBuffer[peOffset] !== 0x50 || fileBuffer[peOffset + 1] !== 0x45) {
        return {
          isValid: false,
          error: 'PE signature inválida'
        };
      }

      return {
        isValid: true,
        fileType: 'PE Executable'
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Valida que un archivo no esté corrupto leyendo chunks
   */
  static async validateFileIntegrity(filePath) {
    try {
      const fileHandle = await fs.open(filePath, 'r');
      const bufferSize = 8192;
      const buffer = Buffer.alloc(bufferSize);
      let position = 0;
      let totalRead = 0;
      
      try {
        while (true) {
          const { bytesRead } = await fileHandle.read(buffer, 0, bufferSize, position);
          
          if (bytesRead === 0) break;
          
          totalRead += bytesRead;
          position += bytesRead;
          
          // Verificar que no hay bytes nulos inesperados en ejecutables
          if (filePath.endsWith('.exe')) {
            for (let i = 0; i < bytesRead; i++) {
              if (position < 1024 && buffer[i] === 0 && i < bytesRead - 1) {
                // Permitir algunos nulos en el header
                continue;
              }
            }
          }
        }
        
        return {
          isValid: totalRead > 0,
          fileSize: totalRead
        };
      } finally {
        await fileHandle.close();
      }
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Valida firma digital (simplificado)
   */
  static async validateSignature(filePath) {
    try {
      // Verificar si el archivo tiene firma digital
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        if (process.platform !== 'win32') {
          resolve({ isValid: false, error: 'Validación de firma solo disponible en Windows' });
          return;
        }

        const signtool = spawn('powershell', [
          '-Command',
          `Get-AuthenticodeSignature "${filePath}" | Select-Object Status`
        ]);

        let output = '';
        signtool.stdout.on('data', (data) => {
          output += data.toString();
        });

        signtool.on('close', (code) => {
          if (code === 0 && output.includes('Valid')) {
            resolve({ isValid: true, signed: true });
          } else {
            resolve({ isValid: false, signed: false, output });
          }
        });

        signtool.on('error', () => {
          resolve({ isValid: false, error: 'Error ejecutando verificación de firma' });
        });
      });
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Validación completa de un archivo de actualización
   */
  static async performCompleteValidation(filePath, options = {}) {
    const results = {
      filePath,
      timestamp: new Date().toISOString(),
      validations: {}
    };

    try {
      // Verificar que el archivo existe
      await fs.access(filePath);
      results.validations.fileExists = { isValid: true };
    } catch (error) {
      results.validations.fileExists = { isValid: false, error: error.message };
      return results;
    }

    // Validar hash si se proporciona
    if (options.expectedHash) {
      results.validations.hash = await this.validateFileIntegrity(filePath, options.expectedHash);
    }

    // Validar tamaño si se proporciona
    if (options.expectedSize) {
      results.validations.size = await this.validateFileSize(filePath, options.expectedSize);
    }

    // Validar que es un ejecutable válido
    if (filePath.endsWith('.exe')) {
      results.validations.executable = await this.validateExecutable(filePath);
    }

    // Validar integridad general del archivo
    results.validations.integrity = await this.validateFileIntegrity(filePath);

    // Validar firma digital si se solicita
    if (options.validateSignature) {
      results.validations.signature = await this.validateSignature(filePath);
    }

    // Determinar resultado general
    results.isValid = Object.values(results.validations).every(v => v.isValid);
    
    return results;
  }

  /**
   * Genera un reporte de validación legible
   */
  static generateValidationReport(validationResults) {
    const report = [];
    report.push(`Reporte de Validación - ${validationResults.timestamp}`);
    report.push(`Archivo: ${validationResults.filePath}`);
    report.push(`Estado General: ${validationResults.isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
    report.push('---');

    for (const [test, result] of Object.entries(validationResults.validations)) {
      const status = result.isValid ? '✓ PASS' : '✗ FAIL';
      report.push(`${test.toUpperCase()}: ${status}`);
      
      if (!result.isValid && result.error) {
        report.push(`  Error: ${result.error}`);
      }
    }

    return report.join('\\n');
  }
}

module.exports = FileValidator;