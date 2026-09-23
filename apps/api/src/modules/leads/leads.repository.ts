import type { Prisma } from '../../generated/prisma/client.js';
import type { Tx } from '../../lib/prisma.js';
import type { CreateLeadInput } from './leads.schemas.js';

export const SYSTEM_META_ACTOR = 'system:meta';

export type LeadsRepository = ReturnType<typeof createLeadsRepository>;

/** Leads and their activities are one unit: every lead write happens with its audit record. */
export function createLeadsRepository() {
  return {
    /**
     * Creates the lead and its LEAD_CREATED activity in one statement, inside the caller's
     * transaction. If the lead already exists nothing is written (UNIQUE(leadgen_id) is the
     * final guard if two writers race).
     */
    async createFromMeta(tx: Tx, input: CreateLeadInput): Promise<{ created: boolean }> {
      const existing = await tx.lead.findUnique({
        where: { leadgenId: input.leadgenId },
        select: { id: true },
      });
      if (existing) return { created: false };

      await tx.lead.create({
        data: {
          ...input,
          graphResponse: input.graphResponse as Prisma.InputJsonObject,
          activities: {
            create: { type: 'LEAD_CREATED', actor: SYSTEM_META_ACTOR, payload: {} },
          },
        },
      });
      return { created: true };
    },
  };
}
