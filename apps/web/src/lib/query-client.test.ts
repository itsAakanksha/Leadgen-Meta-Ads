import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { shouldRetry } from './query-client';

describe('shouldRetry', () => {
  it('retries a sleeping/starting server a few times', () => {
    const coldStart = new ApiError(502, 'HTTP_ERROR', '');
    expect(shouldRetry(0, coldStart)).toBe(true);
    expect(shouldRetry(3, coldStart)).toBe(true);
    expect(shouldRetry(4, coldStart)).toBe(false);
  });

  it('never retries client errors like 404 or 400', () => {
    expect(shouldRetry(0, new ApiError(404, 'NOT_FOUND', ''))).toBe(false);
    expect(shouldRetry(0, new ApiError(400, 'VALIDATION_ERROR', ''))).toBe(false);
  });

  it('does not retry unknown errors (likely bugs)', () => {
    expect(shouldRetry(0, new TypeError('x'))).toBe(false);
  });
});
