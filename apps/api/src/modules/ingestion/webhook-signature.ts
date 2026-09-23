import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_PATTERN = /^sha256=([0-9a-f]{64})$/i;

/**
 * Verifies Meta's X-Hub-Signature-256 header: "sha256=" + hex HMAC-SHA256 of the raw
 * request body keyed with the App Secret.
 *
 * Must run on the exact bytes received. Meta signs its unicode-escaped JSON, so hashing
 * a re-serialised object would not match.
 */
export function isValidSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  const match = signatureHeader ? SIGNATURE_PATTERN.exec(signatureHeader) : null;
  if (!match?.[1]) return false;

  const received = Buffer.from(match[1], 'hex');
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  // Both are 32 bytes (the pattern guarantees it), so timingSafeEqual cannot throw.
  return timingSafeEqual(received, expected);
}
