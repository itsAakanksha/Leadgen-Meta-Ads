import { createPrisma, type PrismaClient } from '../../src/lib/prisma.js';

export function requireTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Start the test database with `docker compose --profile test up -d test-db` and copy apps/api/.env.example to apps/api/.env.',
    );
  }
  return url;
}

export function createTestPrisma(): PrismaClient {
  return createPrisma(requireTestDatabaseUrl());
}

/** Empties every table. TRUNCATE is used because the audit trigger blocks DELETE. */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE lead_activities, leads, webhook_events');
}
