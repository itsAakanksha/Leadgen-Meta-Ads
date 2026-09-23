import type { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient, Tx } from '../../lib/prisma.js';
import type { LeadgenChangeValue, LeadgenEvent } from './webhook-payload.js';

export type ClaimedEvent = {
  id: string;
  leadgenId: string;
  payload: LeadgenChangeValue;
  attempts: number;
};

export type WebhookEventsRepository = ReturnType<typeof createWebhookEventsRepository>;

export function createWebhookEventsRepository(prisma: PrismaClient) {
  return {
    /**
     * Stores events for the worker. Duplicates (same leadgen_id, within this batch or from an
     * earlier delivery) are skipped by the unique index: INSERT ... ON CONFLICT DO NOTHING.
     * Returns how many new events were stored.
     */
    async insertMany(events: LeadgenEvent[]): Promise<number> {
      if (events.length === 0) return 0;
      const result = await prisma.webhookEvent.createMany({
        data: events.map((event) => ({
          leadgenId: event.leadgenId,
          // Came from JSON.parse, so every value is JSON-serialisable.
          payload: event.payload as Prisma.InputJsonObject,
        })),
        skipDuplicates: true,
      });
      return result.count;
    },

    /**
     * Locks the oldest due pending event for the rest of the transaction.
     * SKIP LOCKED lets several workers (or instances) run without claiming the same row.
     * If the transaction rolls back, the lock is released and the event stays pending.
     */
    async claimNextDue(tx: Tx): Promise<ClaimedEvent | null> {
      const rows = await tx.$queryRaw<ClaimedEvent[]>`
        SELECT id, leadgen_id AS "leadgenId", payload, attempts
        FROM webhook_events
        WHERE status = 'pending' AND next_attempt_at <= now()
        ORDER BY next_attempt_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED`;
      return rows[0] ?? null;
    },

    async markDone(tx: Tx, id: string): Promise<void> {
      await tx.webhookEvent.update({
        where: { id },
        data: { status: 'done', processedAt: new Date(), lastError: null },
      });
    },

    /** Records a failed attempt. Runs outside the (rolled back) processing transaction. */
    async recordFailure(
      id: string,
      failure: { attempts: number; lastError: string; nextAttemptAt: Date | null },
    ): Promise<void> {
      await prisma.webhookEvent.update({
        where: { id },
        data: {
          attempts: failure.attempts,
          lastError: failure.lastError,
          ...(failure.nextAttemptAt
            ? { nextAttemptAt: failure.nextAttemptAt }
            : { status: 'failed' }),
        },
      });
    },
  };
}
