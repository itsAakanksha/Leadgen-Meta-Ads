import { describe, expect, it } from 'vitest';

import { actorHeader, ApiError, toApiError } from './api-client';

describe('toApiError', () => {
  it("uses the server's error envelope", () => {
    const error = toApiError(409, {
      error: {
        code: 'VERSION_CONFLICT',
        message: 'Changed by someone else',
        details: { currentVersion: 3 },
      },
    });
    expect(error).toMatchObject({
      status: 409,
      code: 'VERSION_CONFLICT',
      message: 'Changed by someone else',
      details: { currentVersion: 3 },
    });
  });

  it('falls back to a generic error for non-JSON bodies (e.g. a proxy error page)', () => {
    expect(toApiError(502, null)).toMatchObject({ status: 502, code: 'HTTP_ERROR' });
  });
});

describe('ApiError.isRetryable', () => {
  it('retries network failures and server errors, never client errors', () => {
    expect(new ApiError(0, 'NETWORK_ERROR', '').isRetryable).toBe(true);
    expect(new ApiError(503, 'X', '').isRetryable).toBe(true);
    expect(new ApiError(409, 'X', '').isRetryable).toBe(false);
    expect(new ApiError(404, 'X', '').isRetryable).toBe(false);
  });
});

describe('actorHeader', () => {
  it('URI-encodes the name so non-ASCII names survive HTTP headers', () => {
    expect(actorHeader('Zoë Ōkubo')).toEqual({ 'X-Actor': 'Zo%C3%AB%20%C5%8Ckubo' });
  });

  it('sends nothing when there is no name', () => {
    expect(actorHeader(null)).toEqual({});
    expect(actorHeader('   ')).toEqual({});
  });
});
