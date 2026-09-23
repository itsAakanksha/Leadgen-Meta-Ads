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
      appSecret: 'test-app-secret',
      // Real values only matter for tests that call the Graph API (see meta-graph.ts).
      pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN ?? '',
      graphApiVersion: process.env.GRAPH_API_VERSION ?? 'v25.0',
    },
  };
}
