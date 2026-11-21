import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export const MAX_MANAGER_PASSWORD_LENGTH = 256;

const options = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

interface PasswordHash {
  salt: Buffer;
  key: Buffer;
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 32, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export function parseManagerPasswordHash(value: string | undefined): PasswordHash | null {
  const match = value?.match(/^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{64})$/);
  return match ? { salt: Buffer.from(match[1], 'hex'), key: Buffer.from(match[2], 'hex') } : null;
}

export async function createManagerPasswordHash(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt-v1:${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function verifyManagerPassword(password: string, hash: PasswordHash): Promise<boolean> {
  const key = await deriveKey(password, hash.salt);
  return timingSafeEqual(key, hash.key);
}
