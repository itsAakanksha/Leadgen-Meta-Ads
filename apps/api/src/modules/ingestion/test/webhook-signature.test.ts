import { describe, expect, it } from 'vitest';

import { sign } from '../../../../test/support/meta-webhook.js';
import { isValidSignature } from '../webhook-signature.js';

const secret = 'app-secret';
const body = Buffer.from('{"object":"page","entry":[]}');

describe('isValidSignature', () => {
  it('accepts a correct signature', () => {
    expect(isValidSignature(body, sign(body, secret), secret)).toBe(true);
  });

  it('accepts an upper-case hex digest', () => {
    const digest = sign(body, secret).slice('sha256='.length);
    expect(isValidSignature(body, `sha256=${digest.toUpperCase()}`, secret)).toBe(true);
  });

  it('rejects when the body was tampered with', () => {
    const tampered = Buffer.from('{"object":"page","entry":[{}]}');
    expect(isValidSignature(tampered, sign(body, secret), secret)).toBe(false);
  });

  it('rejects a signature made with a different secret', () => {
    expect(isValidSignature(body, sign(body, 'other-secret'), secret)).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(isValidSignature(body, undefined, secret)).toBe(false);
  });

  it('rejects a digest without the sha256= prefix', () => {
    expect(isValidSignature(body, sign(body, secret).slice('sha256='.length), secret)).toBe(false);
  });

  it('rejects the legacy sha1= header format', () => {
    expect(isValidSignature(body, 'sha1=' + 'a'.repeat(40), secret)).toBe(false);
  });

  it('rejects a truncated or non-hex digest without throwing', () => {
    expect(isValidSignature(body, 'sha256=abc', secret)).toBe(false);
    expect(isValidSignature(body, 'sha256=' + 'z'.repeat(64), secret)).toBe(false);
  });

  it('verifies the exact bytes, so re-serialised JSON does not match', () => {
    // Meta sends non-ASCII characters \u-escaped and signs those bytes.
    const metaBytes = Buffer.from('{"name":"Jos\\u00e9"}');
    const header = sign(metaBytes, secret);
    expect(isValidSignature(metaBytes, header, secret)).toBe(true);

    const reserialised = Buffer.from(JSON.stringify(JSON.parse(metaBytes.toString())));
    expect(isValidSignature(reserialised, header, secret)).toBe(false);
  });
});
