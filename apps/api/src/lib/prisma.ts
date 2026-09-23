import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient, type Prisma } from '../generated/prisma/client.js';

export { PrismaClient };

/** A Prisma client bound to an interactive transaction. */
export type Tx = Prisma.TransactionClient;

/**
 * Runs `fn` in one database transaction. Services receive this instead of the Prisma
 * client, so they own transaction boundaries without touching Prisma directly.
 */
export type RunInTransaction = <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;

export function createPrisma(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

export function createTransactionRunner(prisma: PrismaClient): RunInTransaction {
  // 15s leaves room for the worker's Graph API call (10s timeout) inside the transaction.
  return (fn) => prisma.$transaction(fn, { timeout: 15_000 });
}
