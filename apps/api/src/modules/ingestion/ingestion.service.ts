import type { Logger } from '../../lib/logger.js';
import type { WebhookEventsRepository } from './webhook-events.repository.js';
import type { LeadgenEvent } from './webhook-payload.js';

export type IngestionService = ReturnType<typeof createIngestionService>;

export function createIngestionService(deps: {
  webhookEvents: WebhookEventsRepository;
  logger: Logger;
}) {
  const { webhookEvents, logger } = deps;

  return {
    /**
     * Records verified leadgen events. Deliberately does no Graph API call here, so Meta
     * gets its 200 fast; the worker fetches lead details afterwards.
     */
    async receiveEvents(events: LeadgenEvent[]): Promise<void> {
      const stored = await webhookEvents.insertMany(events);
      logger.info(
        { received: events.length, stored, duplicates: events.length - stored },
        'Leadgen webhook events received',
      );
    },
  };
}
