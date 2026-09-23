import type { Tx } from '../../lib/prisma.js';
import type { LeadsRepository } from './leads.repository.js';
import type { CreateLeadInput, LeadSummary, ListLeadsQuery } from './leads.schemas.js';

export type LeadsService = ReturnType<typeof createLeadsService>;

export function createLeadsService(deps: { leads: LeadsRepository }) {
  const { leads } = deps;

  return {
    async list(
      query: ListLeadsQuery,
    ): Promise<{ data: LeadSummary[]; page: number; limit: number; total: number }> {
      const { leads: data, total } = await leads.list(query);
      return { data, page: query.page, limit: query.limit, total };
    },

    /**
     * Creates a lead from Meta data, with its LEAD_CREATED activity, inside the caller's
     * transaction (the ingestion worker's). A lead that already exists is left untouched.
     */
    createFromMeta(input: CreateLeadInput, tx: Tx): Promise<{ created: boolean }> {
      return leads.createFromMeta(tx, input);
    },
  };
}
