import { z } from 'zod';

import { LeadStatus } from '../../generated/prisma/enums.js';

export { LeadStatus };
export type LeadStatusValue = (typeof LeadStatus)[keyof typeof LeadStatus];

/** One answer from a Meta lead form: `field_data[]` item. */
export type FieldDataItem = { name: string; values: string[] };

/** One custom disclaimer checkbox response. */
export type DisclaimerResponse = { checkbox_key: string; is_checked: boolean };

/** Everything needed to create a lead from a Meta leadgen event. */
export type CreateLeadInput = {
  leadgenId: string;
  pageId: string | null;
  formId: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  fieldData: FieldDataItem[];
  customDisclaimerResponses: DisclaimerResponse[];
  platform: string | null;
  isOrganic: boolean | null;
  adId: string | null;
  adName: string | null;
  adsetId: string | null;
  adsetName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  /** Full Graph response, kept because Meta deletes leads after 90 days. */
  graphResponse: Record<string, unknown>;
  metaCreatedAt: Date | null;
};

/** GET /leads query string. */
export const listLeadsQuerySchema = z.object({
  status: z.enum(LeadStatus).optional(),
  platform: z.enum(['fb', 'ig']).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;

/** A row in the lead list. */
export type LeadSummary = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatusValue;
  platform: string | null;
  isOrganic: boolean | null;
  formId: string | null;
  campaignName: string | null;
  metaCreatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Route parameter for /leads/:id. */
export const leadIdParamSchema = z.object({ id: z.uuid() });

export type ActivityTypeValue = 'LEAD_CREATED' | 'LEAD_UPDATED' | 'STATUS_CHANGED';

/** One audit-trail entry. `payload` depends on `type` (see LeadActivity in schema.prisma). */
export type LeadActivityDto = {
  id: string;
  type: ActivityTypeValue;
  actor: string;
  payload: unknown;
  createdAt: Date;
};

/** Everything the detail view needs. The raw Graph response stays in the database. */
export type LeadDetail = LeadSummary & {
  leadgenId: string;
  pageId: string | null;
  fieldData: unknown;
  customDisclaimerResponses: unknown;
  adId: string | null;
  adName: string | null;
  adsetId: string | null;
  adsetName: string | null;
  campaignId: string | null;
  notes: string | null;
  assignee: string | null;
  version: number;
  allowedTransitions: readonly LeadStatusValue[];
  activities: LeadActivityDto[];
};

/** PATCH /leads/:id/status body. `version` is the version the client last saw. */
export const changeStatusBodySchema = z.strictObject({
  status: z.enum(LeadStatus),
  version: z.number().int().min(1),
});

export type ChangeStatusBody = z.infer<typeof changeStatusBodySchema>;
