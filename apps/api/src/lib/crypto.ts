import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison for secrets.
 * Both sides are hashed first so inputs of different lengths take the same time
 * (timingSafeEqual itself throws on a length mismatch, which would leak the length).
 */
export function safeEqual(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a).digest();
  const digestB = createHash('sha256').update(b).digest();
  return timingSafeEqual(digestA, digestB);
}
