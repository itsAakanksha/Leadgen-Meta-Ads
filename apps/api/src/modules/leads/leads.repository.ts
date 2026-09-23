import type { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient, Tx } from '../../lib/prisma.js';
import type { CreateLeadInput, LeadSummary, ListLeadsQuery } from './leads.schemas.js';

export const SYSTEM_META_ACTOR = 'system:meta';

const leadSummarySelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  status: true,
  platform: true,
  isOrganic: true,
  formId: true,
  campaignName: true,
  metaCreatedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LeadSelect;

/** Prisma `contains` builds a LIKE pattern without escaping, so `%` or `_` would match anything. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export type LeadsRepository = ReturnType<typeof createLeadsRepository>;

/** Leads and their activities are one unit: every lead write happens with its audit record. */
export function createLeadsRepository(prisma: PrismaClient) {
  return {
    /** One page of leads, newest first, plus the total matching the filters. */
    async list(query: ListLeadsQuery): Promise<{ leads: LeadSummary[]; total: number }> {
      const where: Prisma.LeadWhereInput = {
        ...(query.status && { status: query.status }),
        ...(query.platform && { platform: query.platform }),
        ...(query.q && {
          OR: [
            { fullName: { contains: escapeLike(query.q), mode: 'insensitive' } },
            { email: { contains: escapeLike(query.q), mode: 'insensitive' } },
            { phone: { contains: escapeLike(query.q) } },
          ],
        }),
      };
      // Both queries in one transaction so the page and the total agree.
      const [leads, total] = await prisma.$transaction([
        prisma.lead.findMany({
          where,
          select: leadSummarySelect,
          // id breaks ties so pages never overlap or skip rows with equal timestamps.
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.lead.count({ where }),
      ]);
      return { leads, total };
    },

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
