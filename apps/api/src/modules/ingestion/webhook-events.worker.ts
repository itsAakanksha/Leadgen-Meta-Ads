import type { Logger } from '../../lib/logger.js';
import { describeError, type IngestionService } from './ingestion.service.js';

export type WebhookEventsWorker = { stop: () => Promise<void> };

/**
 * Background loop, in the API process: drain every due event, then sleep `pollIntervalMs`.
 * Failed events are rescheduled into the future by the service, so draining always ends.
 */
export function startWebhookEventsWorker(deps: {
  ingestion: IngestionService;
  logger: Logger;
  pollIntervalMs: number;
}): WebhookEventsWorker {
  const { ingestion, logger, pollIntervalMs } = deps;
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let current: Promise<void> = Promise.resolve();

  async function drain(): Promise<void> {
    try {
      while (!stopped && (await ingestion.processNextEvent())) {
        // keep going while there is work
      }
    } catch (err) {
      logger.error({ error: describeError(err) }, 'Worker tick failed');
    }
  }

  function schedule() {
    if (stopped) return;
    timer = setTimeout(() => {
      current = drain().finally(schedule);
    }, pollIntervalMs);
  }

  schedule();
  logger.info({ pollIntervalMs }, 'Webhook events worker started');

  return {
    /** Stops polling and waits for the event in progress to finish. */
    async stop() {
      stopped = true;
      clearTimeout(timer);
      await current;
    },
  };
}
