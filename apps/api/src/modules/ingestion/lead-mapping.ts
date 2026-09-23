import { z } from 'zod';

import type { CreateLeadInput, FieldDataItem } from '../leads/leads.schemas.js';
import type { LeadgenChangeValue } from './webhook-payload.js';

/**
 * Fields requested from GET /{leadgen_id}. The Graph API returns only
 * id, created_time, ad_id, form_id and field_data unless fields are named explicitly.
 * Attribution fields (ad/adset/campaign) are absent for organic and test leads.
 */
export const GRAPH_LEAD_FIELDS = [
  'id',
  'created_time',
  'field_data',
  'custom_disclaimer_responses',
  'platform',
  'is_organic',
  'form_id',
  'ad_id',
  'ad_name',
  'adset_id',
  'adset_name',
  'campaign_id',
  'campaign_name',
].join(',');

const graphLeadSchema = z
  .object({
    id: z.string(),
    created_time: z.string().optional(),
    field_data: z
      .array(z.object({ name: z.string(), values: z.array(z.coerce.string()).default([]) }))
      .default([]),
    custom_disclaimer_responses: z
      .array(
        z.object({
          checkbox_key: z.string(),
          // Meta returns "1"/"0" strings in some responses and booleans in others.
          is_checked: z.union([z.boolean(), z.string()]).transform((v) => v === true || v === '1'),
        }),
      )
      .default([]),
    platform: z.string().optional(),
    is_organic: z.boolean().optional(),
    form_id: z.string().optional(),
    ad_id: z.string().optional(),
    ad_name: z.string().optional(),
    adset_id: z.string().optional(),
    adset_name: z.string().optional(),
    campaign_id: z.string().optional(),
    campaign_name: z.string().optional(),
  })
  .loose();

export class InvalidGraphLeadError extends Error {
  constructor(readonly issues: string[]) {
    super(`Unexpected Graph lead response: ${issues.join('; ')}`);
    this.name = 'InvalidGraphLeadError';
  }
}

/** First non-empty trimmed value of a standard question, or null. */
function answer(fieldData: FieldDataItem[], name: string): string | null {
  const value = fieldData.find((item) => item.name === name)?.values[0]?.trim();
  return value ? value : null;
}

function fullNameOf(fieldData: FieldDataItem[]): string | null {
  const full = answer(fieldData, 'full_name');
  if (full) return full;
  const parts = [answer(fieldData, 'first_name'), answer(fieldData, 'last_name')].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * Maps a Graph API lead (plus the webhook event it came from) to a lead record.
 * Pure: no I/O. Throws InvalidGraphLeadError if the response is not a lead.
 */
export function mapGraphLead(response: unknown, event: LeadgenChangeValue): CreateLeadInput {
  const parsed = graphLeadSchema.safeParse(response);
  if (!parsed.success) {
    throw new InvalidGraphLeadError(
      parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  const lead = parsed.data;
  const createdAt = lead.created_time ? new Date(lead.created_time) : null;

  return {
    leadgenId: lead.id,
    pageId: event.page_id ?? null,
    formId: lead.form_id ?? event.form_id ?? null,
    fullName: fullNameOf(lead.field_data),
    email: answer(lead.field_data, 'email'),
    phone: answer(lead.field_data, 'phone_number'),
    fieldData: lead.field_data,
    customDisclaimerResponses: lead.custom_disclaimer_responses,
    platform: lead.platform ?? null,
    isOrganic: lead.is_organic ?? null,
    adId: lead.ad_id ?? event.ad_id ?? null,
    adName: lead.ad_name ?? null,
    adsetId: lead.adset_id ?? null,
    adsetName: lead.adset_name ?? null,
    campaignId: lead.campaign_id ?? null,
    campaignName: lead.campaign_name ?? null,
    graphResponse: response as Record<string, unknown>,
    metaCreatedAt: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null,
  };
}
