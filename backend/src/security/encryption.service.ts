/**
 * Encryption Service
 * Service for data encryption and decryption
 */

import crypto from 'crypto';
import { EncryptionConfig, EncryptedData } from './types/security.types';

export class EncryptionService {
  private algorithm: string;
  private keySize: number;
  private ivSize: number;
  private key: Buffer;

  constructor(config: EncryptionConfig) {
    this.algorithm = config.algorithm;
    this.keySize = config.keySize;
    this.ivSize = config.ivSize;
    this.key = this.generateKey();
  }

  /**
   * Encrypt data
   */
  encrypt(data: string): EncryptedData {
    const iv = crypto.randomBytes(this.ivSize);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    let authTag = '';
    // Only get auth tag for authenticated encryption algorithms
    if (this.algorithm.includes('gcm')) {
      authTag = (cipher as any).getAuthTag().toString('hex');
    }
    
    return {
      iv: iv.toString('hex'),
      encrypted,
      authTag,
    };
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData: EncryptedData): string {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    
    // Only set auth tag for authenticated encryption algorithms
    if (this.algorithm.includes('gcm') && encryptedData.authTag) {
      (decipher as any).setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    }
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Hash data
   */
  hash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Generate a random key
   */
  private generateKey(): Buffer {
    return crypto.randomBytes(this.keySize);
  }

  /**
   * Encrypt sensitive field (e.g., API keys, passwords)
   */
  encryptField(field: string): string {
    const encrypted = this.encrypt(field);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt sensitive field
   */
  decryptField(encryptedField: string): string {
    const encrypted = JSON.parse(encryptedField) as EncryptedData;
    return this.decrypt(encrypted);
  }
}
