import { describe, expect, it } from 'vitest';

import { loadConfig } from '../config.js';

const validEnv = { DATABASE_URL: 'postgresql://user:pass@localhost:5432/db' };

describe('loadConfig', () => {
  it('applies defaults for optional variables', () => {
    expect(loadConfig(validEnv)).toEqual({
      nodeEnv: 'development',
      port: 4000,
      logLevel: 'info',
      databaseUrl: validEnv.DATABASE_URL,
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
