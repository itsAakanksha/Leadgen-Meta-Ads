import { createApp, createServices } from './app.js';
import { loadConfig } from './lib/config.js';
import { createLogger } from './lib/logger.js';
import { createPrisma } from './lib/prisma.js';
import { startWebhookEventsWorker } from './modules/ingestion/webhook-events.worker.js';

const config = loadConfig();
const logger = createLogger(config.logLevel);
const prisma = createPrisma(config.databaseUrl);

const deps = { config, logger, prisma };
const services = createServices(deps);
const app = createApp(deps, services);

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'API listening');
});
const worker = startWebhookEventsWorker({
  ingestion: services.ingestion,
  logger,
  pollIntervalMs: config.workerPollMs,
});

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');
  // Stop taking requests and new events, let in-flight work finish, then release DB connections.
  server.close(() => {
    worker
      .stop()
      .then(() => prisma.$disconnect())
      .catch((err: unknown) => logger.error({ err }, 'Error during shutdown'))
      .finally(() => process.exit(0));
  });
  // Hard stop if something hangs (Render gives ~30s before SIGKILL).
  setTimeout(() => process.exit(1), 20_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
