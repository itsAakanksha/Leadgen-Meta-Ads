import express, { type Express } from 'express';

import { createErrorHandler, notFoundHandler } from './lib/errors.js';
import { createHttpLogger, type Logger } from './lib/logger.js';
import type { PrismaClient } from './lib/prisma.js';

export type AppDeps = {
  logger: Logger;
  prisma: PrismaClient;
};

/** Composition root: builds the HTTP app from explicit dependencies (no hidden singletons). */
export function createApp({ logger, prisma }: AppDeps): Express {
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

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}
