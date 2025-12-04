import { createHash } from 'crypto';

/**
 * SHA-256 hash for cache keys (optimized in Bun 1.3)
 */
export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * MD5 hash for ETags (optimized in Bun 1.3)
 */
export function md5(data: string | Buffer): string {
  return createHash('md5').update(data).digest('hex');
}
