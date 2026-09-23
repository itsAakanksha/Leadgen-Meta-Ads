import { GraphApiError, type GraphClient } from '../../lib/graph-client.js';
import type { Logger } from '../../lib/logger.js';
import type { RunInTransaction } from '../../lib/prisma.js';
import type { LeadsService } from '../leads/leads.service.js';
import { GRAPH_LEAD_FIELDS, InvalidGraphLeadError, mapGraphLead } from './lead-mapping.js';
import type { ClaimedEvent, WebhookEventsRepository } from './webhook-events.repository.js';
import type { LeadgenEvent } from './webhook-payload.js';

/** After this many failed attempts an event is marked `failed` and left for a human. */
export const MAX_ATTEMPTS = 8;
const BASE_RETRY_DELAY_MS = 30_000;
const MAX_RETRY_DELAY_MS = 60 * 60_000;

/** Exponential backoff: 30s, 1m, 2m, 4m ... capped at 1h. `attempts` counts failures so far. */
export function retryDelayMs(attempts: number): number {
  return Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempts - 1), MAX_RETRY_DELAY_MS);
}

/**
 * A description of an error that is safe to log and store: no PII, no tokens.
 * Unknown errors (e.g. Prisma errors, whose messages can include query arguments) are
 * reduced to their class name.
 */
export function describeError(err: unknown): string {
  if (err instanceof GraphApiError || err instanceof InvalidGraphLeadError) return err.message;
  if (err instanceof Error) return `${err.name}${'code' in err ? ` ${String(err.code)}` : ''}`;
  return 'Unknown error';
}

export type IngestionService = ReturnType<typeof createIngestionService>;

export function createIngestionService(deps: {
  webhookEvents: WebhookEventsRepository;
  leads: LeadsService;
  graph: GraphClient;
  runInTransaction: RunInTransaction;
  logger: Logger;
  maxAttempts?: number;
}) {
  const { webhookEvents, leads, graph, runInTransaction, logger } = deps;
  const maxAttempts = deps.maxAttempts ?? MAX_ATTEMPTS;

  async function handleFailure(event: ClaimedEvent, err: unknown): Promise<void> {
    const attempts = event.attempts + 1;
    const giveUp = attempts >= maxAttempts;
    const lastError = describeError(err);
    await webhookEvents.recordFailure(event.id, {
      attempts,
      lastError,
      nextAttemptAt: giveUp ? null : new Date(Date.now() + retryDelayMs(attempts)),
    });
    logger[giveUp ? 'error' : 'warn'](
      { eventId: event.id, leadgenId: event.leadgenId, attempts, error: lastError },
      giveUp ? 'Webhook event failed permanently' : 'Webhook event failed; will retry',
    );
  }

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

    /**
     * Processes the oldest due event, all in one transaction:
     * claim → fetch lead from Graph → create lead + LEAD_CREATED → mark done.
     * A crash or error at any point rolls everything back, so no half-written lead or
     * orphan activity can exist, and reprocessing is safe.
     *
     * Returns false when no event was due (the worker then sleeps).
     */
    async processNextEvent(): Promise<boolean> {
      // Assigned inside the callback; the cast stops TS narrowing it to `null` afterwards.
      let claimed = null as ClaimedEvent | null;
      try {
        return await runInTransaction(async (tx) => {
          const event = await webhookEvents.claimNextDue(tx);
          if (!event) return false;
          claimed = event;

          const response = await graph.get(event.leadgenId, { fields: GRAPH_LEAD_FIELDS });
          const { created } = await leads.createFromMeta(mapGraphLead(response, event.payload), tx);
          await webhookEvents.markDone(tx, event.id);

          logger.info(
            { eventId: event.id, leadgenId: event.leadgenId, created },
            created ? 'Lead created' : 'Lead already existed',
          );
          return true;
        });
      } catch (err) {
        if (!claimed) throw err; // failed before claiming anything (e.g. DB down)
        await handleFailure(claimed, err);
        return true;
      }
    },
  };
}
