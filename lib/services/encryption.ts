import 'server-only';
import crypto from 'crypto';

/**
 * AES-GCM encryption for credential / DSC PIN storage.
 * Key source: process.env.CREDENTIALS_KEY (base64-encoded 32-byte key).
 *
 * Encoded format (string):  v1:<iv-base64>:<authTag-base64>:<ciphertext-base64>
 * Authenticated additional data (AAD): a per-row identifier (e.g. credential id)
 * is NOT used here so that callers can encrypt before persisting and obtaining
 * an id; if needed, encrypt + re-encrypt with AAD on update.
 */

const KEY_ENV = 'CREDENTIALS_KEY';

function getKey(): Buffer {
  const raw = process.env[KEY_ENV];
  if (!raw) {
    throw new Error(`Missing ${KEY_ENV}. Generate one with: openssl rand -base64 32`);
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error(`${KEY_ENV} must decode to exactly 32 bytes (got ${buf.length}).`);
  }
  return buf;
}

export function encryptString(plaintext: string): string {
  if (!plaintext) return '';
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

export function decryptString(payload: string | null | undefined): string {
  if (!payload) return '';
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Invalid ciphertext format');
  }
  const key = getKey();
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const ct = Buffer.from(parts[3], 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}
