import 'server-only';
import crypto from 'crypto';

/**
 * AES-256-GCM credentials vault encryption.
 * Format: base64(iv [12B] || authTag [16B] || ciphertext)
 * Key: 32 bytes, base64 in CREDENTIALS_KEY env.
 */
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const k = process.env.CREDENTIALS_KEY;
  if (!k) throw new Error('CREDENTIALS_KEY missing');
  const buf = Buffer.from(k, 'base64');
  if (buf.length !== 32) {
    throw new Error(`CREDENTIALS_KEY must decode to 32 bytes, got ${buf.length}`);
  }
  return buf;
}

export function encryptCredential(plaintext: string): string {
  if (plaintext === null || plaintext === undefined) return '';
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decryptCredential(payload: string): string {
  if (!payload) return '';
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}
