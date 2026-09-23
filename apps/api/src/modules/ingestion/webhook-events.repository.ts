import type { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../lib/prisma.js';
import type { LeadgenEvent } from './webhook-payload.js';

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
  };
}
