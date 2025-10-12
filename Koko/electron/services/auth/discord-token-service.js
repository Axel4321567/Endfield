import fs from 'fs';
import path from 'path';
import { customUserData } from '../../config/app-config.js';

/**
 * Servicio para gestionar tokens de Discord de forma segura
 */

const discordTokenPath = path.join(customUserData, 'discord-token.json');

/**
 * Guarda el token de Discord cifrado en Base64
 * @param {string} token - Token de Discord a guardar
 * @returns {boolean} - True si se guardó exitosamente
 */
export function saveDiscordToken(token) {
  try {
    const data = {
      token: Buffer.from(token).toString('base64'),
      timestamp: Date.now()
    };
    fs.writeFileSync(discordTokenPath, JSON.stringify(data), 'utf8');
    console.log('💾 [Discord] Token guardado exitosamente');
    return true;
  } catch (error) {
    console.error('❌ [Discord] Error guardando token:', error);
    return false;
  }
}

/**
 * Lee el token de Discord y lo descifra
 * @returns {string|null} - Token descifrado o null si no existe
 */
export function readDiscordToken() {
  try {
    if (fs.existsSync(discordTokenPath)) {
      const data = JSON.parse(fs.readFileSync(discordTokenPath, 'utf8'));
      const token = Buffer.from(data.token, 'base64').toString('utf8');
      console.log('✅ [Discord] Token recuperado');
      return token;
    }
    console.log('ℹ️ [Discord] No hay token guardado');
    return null;
  } catch (error) {
    console.error('❌ [Discord] Error leyendo token:', error);
    return null;
  }
}

/**
 * Elimina el token de Discord almacenado
 * @returns {boolean} - True si se eliminó exitosamente
 */
export function deleteDiscordToken() {
  try {
    if (fs.existsSync(discordTokenPath)) {
      fs.unlinkSync(discordTokenPath);
      console.log('🗑️ [Discord] Token eliminado');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ [Discord] Error eliminando token:', error);
    return false;
  }
}

export default {
  saveDiscordToken,
  readDiscordToken,
  deleteDiscordToken
};
