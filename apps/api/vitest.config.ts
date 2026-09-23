import { defineConfig } from 'vitest/config';

// Load apps/api/.env locally; in CI the variables come from the environment.
try {
  process.loadEnvFile();
} catch {
  // No .env file.
}

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globalSetup: ['test/support/global-setup.ts'],
    // Integration tests share one database, so test files run one at a time.
    fileParallelism: false,
    // Some tests call the real Graph API, whose latency varies a lot by network.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
