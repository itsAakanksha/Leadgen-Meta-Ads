import { describe, expect, it } from 'vitest';

import { loadConfig } from '../config.js';

const validEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  META_VERIFY_TOKEN: 'verify-token-0123456789',
};

describe('loadConfig', () => {
  it('applies defaults for optional variables', () => {
    expect(loadConfig(validEnv)).toEqual({
      nodeEnv: 'development',
      port: 4000,
      logLevel: 'info',
      databaseUrl: validEnv.DATABASE_URL,
      meta: { verifyToken: validEnv.META_VERIFY_TOKEN },
    });
  });

  it('coerces PORT from string to number', () => {
    expect(loadConfig({ ...validEnv, PORT: '8080' }).port).toBe(8080);
  });

  it('lists every invalid variable in one error', () => {
    expect(() => loadConfig({ PORT: 'abc', LOG_LEVEL: 'loud' })).toThrow(
      /DATABASE_URL[\s\S]*PORT|PORT[\s\S]*DATABASE_URL/,
    );
  });

  it('rejects a verify token too short to be a real secret', () => {
    expect(() => loadConfig({ ...validEnv, META_VERIFY_TOKEN: 'short' })).toThrow(
      /META_VERIFY_TOKEN/,
    );
  });

  it('never echoes variable values in the error (they may be secrets)', () => {
    const secretLooking = 'not-a-url-but-a-secret-s3cr3t';
    let message = '';
    try {
      loadConfig({ DATABASE_URL: secretLooking });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('DATABASE_URL');
    expect(message).not.toContain(secretLooking);
  });
});
