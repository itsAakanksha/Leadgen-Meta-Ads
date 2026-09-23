import { NotFoundError, VersionConflictError } from '../../lib/errors.js';
import type { RunInTransaction, Tx } from '../../lib/prisma.js';
import { diffFields } from './lead-diff.js';
import type { LeadsRepository } from './leads.repository.js';
import type {
  ChangeStatusBody,
  CreateLeadInput,
  EditableValues,
  LeadDetail,
  LeadSummary,
  ListLeadsQuery,
  UpdateLeadBody,
} from './leads.schemas.js';
import { allowedTransitions, canTransition, InvalidTransitionError } from './status-workflow.js';

export type LeadsService = ReturnType<typeof createLeadsService>;

export function createLeadsService(deps: {
  leads: LeadsRepository;
  runInTransaction: RunInTransaction;
}) {
  const { leads, runInTransaction } = deps;

  async function get(id: string): Promise<LeadDetail> {
    const lead = await leads.findById(id);
    if (!lead) throw new NotFoundError('Lead not found');
    return { ...lead, allowedTransitions: allowedTransitions(lead.status) };
  }

  return {
    async list(
      query: ListLeadsQuery,
    ): Promise<{ data: LeadSummary[]; page: number; limit: number; total: number }> {
      const { leads: data, total } = await leads.list(query);
      return { data, page: query.page, limit: query.limit, total };
    },

    /** A lead with its activity timeline and the statuses it may move to next. */
    get,

    /**
     * Moves a lead through the status workflow. The status change and its STATUS_CHANGED
     * activity are written in one transaction.
     * - stale `version` → 409 (someone else changed the lead first)
     * - same status → no write, no activity
     * - transition not in the workflow → 422
     */
    async changeStatus(id: string, body: ChangeStatusBody, actor: string): Promise<LeadDetail> {
      await runInTransaction(async (tx) => {
        const current = await leads.findState(tx, id);
        if (!current) throw new NotFoundError('Lead not found');
        if (current.version !== body.version) throw new VersionConflictError(current.version);
        if (current.status === body.status) return;
        if (!canTransition(current.status, body.status)) {
          throw new InvalidTransitionError(current.status, body.status);
        }

        const applied = await leads.updateIfVersion(tx, id, body.version, { status: body.status });
        if (!applied) throw new VersionConflictError();
        await leads.addActivity(tx, {
          leadId: id,
          type: 'STATUS_CHANGED',
          actor,
          payload: { from: current.status, to: body.status },
        });
      });
      return get(id);
    },

    /**
     * Edits contact details, notes or assignee. The change and its LEAD_UPDATED activity,
     * holding a field-level { from, to } diff, are written in one transaction.
     * Values equal to the current ones are ignored; if nothing changes, nothing is written.
     */
    async updateFields(id: string, body: UpdateLeadBody, actor: string): Promise<LeadDetail> {
      const { version, ...updates } = body;
      await runInTransaction(async (tx) => {
        const current = await leads.findEditableState(tx, id);
        if (!current) throw new NotFoundError('Lead not found');
        if (current.version !== version) throw new VersionConflictError(current.version);

        const changes = diffFields<EditableValues>(current, updates);
        if (Object.keys(changes).length === 0) return;

        const data = Object.fromEntries(
          Object.entries(changes).map(([field, change]) => [field, change.to]),
        );
        const applied = await leads.updateIfVersion(tx, id, version, data);
        if (!applied) throw new VersionConflictError();
        await leads.addActivity(tx, {
          leadId: id,
          type: 'LEAD_UPDATED',
          actor,
          payload: { changes },
        });
      });
      return get(id);
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
