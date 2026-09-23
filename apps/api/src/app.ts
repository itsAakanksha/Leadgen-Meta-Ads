import express, { type Express } from 'express';

import type { Config } from './lib/config.js';
import { createErrorHandler, notFoundHandler } from './lib/errors.js';
import { createGraphClient } from './lib/graph-client.js';
import { createHttpLogger, type Logger } from './lib/logger.js';
import { createTransactionRunner, type PrismaClient } from './lib/prisma.js';
import { createIngestionService } from './modules/ingestion/ingestion.service.js';
import { createWebhookEventsRepository } from './modules/ingestion/webhook-events.repository.js';
import { createWebhookRouter } from './modules/ingestion/webhook.routes.js';
import { createLeadsRepository } from './modules/leads/leads.repository.js';
import { createLeadsService } from './modules/leads/leads.service.js';

export type AppDeps = {
  config: Config;
  logger: Logger;
  prisma: PrismaClient;
};

export type Services = ReturnType<typeof createServices>;

/** Composition root: wires libraries, repositories and services once. No hidden singletons. */
export function createServices({ config, logger, prisma }: AppDeps) {
  const graph = createGraphClient({
    version: config.meta.graphApiVersion,
    accessToken: config.meta.pageAccessToken,
  });
  const leads = createLeadsService({ leads: createLeadsRepository() });
  const ingestion = createIngestionService({
    webhookEvents: createWebhookEventsRepository(prisma),
    leads,
    graph,
    runInTransaction: createTransactionRunner(prisma),
    logger,
  });
  return { leads, ingestion };
}

export function createApp(deps: AppDeps, services: Services = createServices(deps)): Express {
  const { config, logger, prisma } = deps;
  const app = express();
  app.disable('x-powered-by');
  app.use(createHttpLogger(logger));

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok' });
    } catch (err) {
      logger.error({ err }, 'Health check: database unreachable');
      res.status(503).json({ status: 'unavailable' });
    }
  });

  app.use(
    createWebhookRouter({
      verifyToken: config.meta.verifyToken,
      appSecret: config.meta.appSecret,
      ingestion: services.ingestion,
    }),
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}
