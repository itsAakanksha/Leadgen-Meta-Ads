import { createApp } from './app.js';
import { loadConfig } from './lib/config.js';
import { createLogger } from './lib/logger.js';
import { createPrisma } from './lib/prisma.js';

const config = loadConfig();
const logger = createLogger(config.logLevel);
const prisma = createPrisma(config.databaseUrl);

const app = createApp({ logger, prisma });
const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'API listening');
});

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');
  // Stop accepting requests, let in-flight ones finish, then release DB connections.
  server.close(() => {
    prisma
      .$disconnect()
      .catch((err: unknown) => logger.error({ err }, 'Error while disconnecting Prisma'))
      .finally(() => process.exit(0));
  });
  // Hard stop if something hangs (Render gives ~30s before SIGKILL).
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
