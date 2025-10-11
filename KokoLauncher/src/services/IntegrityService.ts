import { createHash } from 'crypto';
import { readFile } from 'fs/promises';

export interface ValidationResult {
  isValid: boolean;
  expectedHash?: string;
  actualHash?: string;
  error?: string;
}

export class IntegrityService {
  /**
   * Valida la integridad de un archivo usando SHA256
   */
  static async validateFileIntegrity(
    filePath: string, 
    expectedHash: string
  ): Promise<ValidationResult> {
    try {
      const fileBuffer = await readFile(filePath);
      const actualHash = createHash('sha256').update(fileBuffer).digest('hex');
      
      const isValid = actualHash.toLowerCase() === expectedHash.toLowerCase();
      
      return {
        isValid,
        expectedHash: expectedHash.toLowerCase(),
        actualHash: actualHash.toLowerCase()
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Calcula el hash SHA256 de un archivo
   */
  static async calculateFileHash(filePath: string): Promise<string> {
    try {
      const fileBuffer = await readFile(filePath);
      return createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      throw new Error(`Error calculando hash: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Valida múltiples archivos de forma paralela
   */
  static async validateMultipleFiles(
    files: Array<{ path: string; expectedHash: string }>
  ): Promise<ValidationResult[]> {
    const validationPromises = files.map(file => 
      this.validateFileIntegrity(file.path, file.expectedHash)
    );
    
    return Promise.all(validationPromises);
  }

  /**
   * Verifica si un archivo existe y es accesible
   */
  static async isFileAccessible(filePath: string): Promise<boolean> {
    try {
      await readFile(filePath);
      return true;
    } catch {
      return false;
    }
  }
}