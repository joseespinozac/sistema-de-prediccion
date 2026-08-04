// Encriptación simétrica AES-256-GCM para los tokens OAuth de Google en reposo.
//
// Requisitos del plan (§6.2, §10):
// - La clave maestra vive SOLO en la variable de entorno ENCRYPTION_KEY.
// - Los tokens se desencriptan solo en memoria, en el momento de llamar a Google.
// - Nada de esto se expone jamás al cliente.
//
// Formato del texto cifrado almacenado (string, base64):
//   [ iv(12 bytes) | authTag(16 bytes) | ciphertext ]  → base64
import crypto from 'node:crypto';
import { env, isValidHexKey } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits, recomendado para GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

// La clave se resuelve de forma perezosa para que la app pueda arrancar
// (y servir el frontend / login) aunque ENCRYPTION_KEY aún no esté puesta.
// Solo se exige al momento real de encriptar/desencriptar un token.
function getKey() {
  if (!isValidHexKey(env.encryptionKey)) {
    throw new Error(
      'ENCRYPTION_KEY inválida o ausente: se requieren 32 bytes en hex (64 chars). ' +
        'Configúrala antes de conectar cuentas de Google.'
    );
  }
  return Buffer.from(env.encryptionKey, 'hex');
}

/**
 * Encripta una cadena de texto plano (p. ej. un access/refresh token).
 * @param {string} plaintext
 * @returns {string} texto cifrado en base64 (iv + authTag + ciphertext)
 */
export function encrypt(plaintext) {
  if (typeof plaintext !== 'string') {
    throw new TypeError('encrypt() espera un string.');
  }
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

/**
 * Desencripta una cadena producida por encrypt().
 * @param {string} payloadB64
 * @returns {string} texto plano original
 */
export function decrypt(payloadB64) {
  if (typeof payloadB64 !== 'string') {
    throw new TypeError('decrypt() espera un string en base64.');
  }
  const key = getKey();
  const data = Buffer.from(payloadB64, 'base64');
  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Texto cifrado corrupto o con formato inválido.');
  }
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

// Encripta solo si el valor existe (útil cuando un token es opcional/nulo).
export function encryptNullable(value) {
  return value == null || value === '' ? null : encrypt(value);
}

export function decryptNullable(value) {
  return value == null || value === '' ? null : decrypt(value);
}
