import { execSync } from 'node:child_process';

import { requireTestDatabaseUrl } from './database.js';

/** Runs once before all tests: bring the test database schema up to date. */
export default function setup() {
  const url = requireTestDatabaseUrl();
  execSync('pnpm exec prisma migrate deploy', {
    env: { ...process.env, DIRECT_URL: url, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
