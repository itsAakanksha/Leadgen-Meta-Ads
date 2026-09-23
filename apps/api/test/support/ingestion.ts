import { createGraphClient } from '../../src/lib/graph-client.js';
import { createTransactionRunner, type PrismaClient } from '../../src/lib/prisma.js';
import { createIngestionService } from '../../src/modules/ingestion/ingestion.service.js';
import { createWebhookEventsRepository } from '../../src/modules/ingestion/webhook-events.repository.js';
import { createLeadsRepository } from '../../src/modules/leads/leads.repository.js';
import { createLeadsService } from '../../src/modules/leads/leads.service.js';
import { silentLogger } from './logger.js';

/** The real ingestion service, wired against the real Graph API with the given token. */
export function buildIngestion(
  prisma: PrismaClient,
  options: { accessToken: string; graphApiVersion?: string; maxAttempts?: number },
) {
  const runInTransaction = createTransactionRunner(prisma);
  return createIngestionService({
    webhookEvents: createWebhookEventsRepository(prisma),
    leads: createLeadsService({ leads: createLeadsRepository(prisma), runInTransaction }),
    graph: createGraphClient({
      version: options.graphApiVersion ?? 'v25.0',
      accessToken: options.accessToken,
    }),
    runInTransaction,
    logger: silentLogger,
    ...(options.maxAttempts === undefined ? {} : { maxAttempts: options.maxAttempts }),
  });
}

/** Deliberately invalid token: makes the real Graph API return error 190. */
export const INVALID_ACCESS_TOKEN = 'invalid-token-for-tests';
