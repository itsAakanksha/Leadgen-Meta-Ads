import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient, type Prisma } from '../generated/prisma/client.js';

export { PrismaClient };

/** A Prisma client bound to an interactive transaction. */
export type Tx = Prisma.TransactionClient;

export function createPrisma(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}
