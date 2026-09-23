import { defineConfig } from 'prisma/config';

// Prisma CLI does not load .env files; use Node's built-in loader when one exists.
try {
  process.loadEnvFile();
} catch {
  // No .env file (CI, containers): variables come from the environment.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Migrations need a direct (non-pooled) connection; the app itself uses DATABASE_URL.
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
});
