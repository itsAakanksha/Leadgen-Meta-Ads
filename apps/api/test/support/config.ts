import type { Config } from '../../src/lib/config.js';
import { requireTestDatabaseUrl } from './database.js';

/** Config for tests. Values are test-only fixtures, never real credentials. */
export function testConfig(): Config {
  return {
    nodeEnv: 'test',
    port: 0,
    logLevel: 'fatal',
    databaseUrl: requireTestDatabaseUrl(),
    meta: {
      verifyToken: 'test-verify-token-0123456789',
    },
  };
}
