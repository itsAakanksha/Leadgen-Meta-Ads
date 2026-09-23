import type { PrismaClient } from '../../src/lib/prisma.js';

/**
 * Makes every INSERT into lead_activities fail at the database level while `fn` runs.
 * Used to prove a lead change is rolled back when its audit record cannot be written.
 */
export async function withFailingActivityInserts(
  prisma: PrismaClient,
  fn: () => Promise<void>,
): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE FUNCTION test_fail_activity_insert() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'injected failure'; END; $$ LANGUAGE plpgsql`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER test_fail_activity_insert BEFORE INSERT ON lead_activities
    FOR EACH ROW EXECUTE FUNCTION test_fail_activity_insert()`);
  try {
    await fn();
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER test_fail_activity_insert ON lead_activities');
    await prisma.$executeRawUnsafe('DROP FUNCTION test_fail_activity_insert()');
  }
}
