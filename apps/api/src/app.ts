import express, { type Express } from 'express';

import type { Config } from './lib/config.js';
import { createErrorHandler, notFoundHandler } from './lib/errors.js';
import { createHttpLogger, type Logger } from './lib/logger.js';
import type { PrismaClient } from './lib/prisma.js';
import { createIngestionService } from './modules/ingestion/ingestion.service.js';
import { createWebhookEventsRepository } from './modules/ingestion/webhook-events.repository.js';
import { createWebhookRouter } from './modules/ingestion/webhook.routes.js';

export type AppDeps = {
  config: Config;
  logger: Logger;
  prisma: PrismaClient;
};

/** Composition root: builds the HTTP app from explicit dependencies (no hidden singletons). */
export function createApp({ config, logger, prisma }: AppDeps): Express {
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

  const ingestion = createIngestionService({
    webhookEvents: createWebhookEventsRepository(prisma),
    logger,
  });

  app.use(
    createWebhookRouter({
      verifyToken: config.meta.verifyToken,
      appSecret: config.meta.appSecret,
      ingestion,
    }),
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}
