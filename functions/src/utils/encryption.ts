import * as crypto from 'crypto';

/**
 * Encryption utility for protecting sensitive data in mappings
 * Uses AES-256-GCM for encryption
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Derives an encryption key from the environment variable
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production';
  
  // Use a fixed salt for key derivation (in production, this should be more sophisticated)
  const salt = Buffer.from('first-aid-pseudonymization-salt');
  
  // Derive a 32-byte key using PBKDF2
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
}

/**
 * Encrypts a string value using AES-256-GCM
 * @param plaintext - The text to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
}

/**
 * Decrypts a string value encrypted with AES-256-GCM
 * @param encrypted - The encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();
  
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const ciphertext = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');
  
  return plaintext;
}
