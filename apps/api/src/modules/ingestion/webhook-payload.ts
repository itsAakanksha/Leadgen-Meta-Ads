import { z } from 'zod';

import { ValidationError } from '../../lib/errors.js';

/** One leadgen notification: IDs only. The lead's answers are fetched later from the Graph API. */
export type LeadgenEvent = {
  leadgenId: string;
  /** The `change.value` object, with every ID as a string. */
  payload: LeadgenChangeValue;
};

const leadgenChangeValueSchema = z
  .object({
    leadgen_id: z.string().min(1),
    page_id: z.string().optional(),
    form_id: z.string().optional(),
    ad_id: z.string().optional(),
    adgroup_id: z.string().optional(),
    created_time: z.number().int().optional(),
  })
  .loose();

export type LeadgenChangeValue = z.infer<typeof leadgenChangeValueSchema>;

const webhookBodySchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string().optional(),
      time: z.number().optional(),
      changes: z.array(z.object({ field: z.string(), value: z.unknown() })).default([]),
    }),
  ),
});

/**
 * Parses JSON while keeping every ID exactly as written.
 *
 * Meta's docs show IDs as JSON numbers (e.g. "leadgen_id": 123123123123). Real IDs exceed
 * Number.MAX_SAFE_INTEGER, and JSON.parse would silently round them. The reviver's third
 * argument (Node 22+) exposes the original source text, so numeric values under `id` or
 * `*_id` keys are returned as that text instead.
 */
export function parseJsonKeepingIds(text: string): unknown {
  const reviver = (key: string, value: unknown, context?: { source?: string }) =>
    typeof value === 'number' && (key === 'id' || key.endsWith('_id')) && context?.source
      ? context.source
      : value;
  return JSON.parse(text, reviver);
}

/**
 * Turns a raw webhook body into leadgen events.
 * Anything that is not a Page `leadgen` change is ignored (Meta may send other subscribed fields).
 * Throws ValidationError when the body is not the shape Meta sends.
 */
export function parseWebhookBody(rawBody: Buffer): LeadgenEvent[] {
  let json: unknown;
  try {
    json = parseJsonKeepingIds(rawBody.toString('utf8'));
  } catch {
    throw new ValidationError('Request body is not valid JSON');
  }

  const body = webhookBodySchema.safeParse(json);
  if (!body.success) throw ValidationError.fromZod(body.error);
  if (body.data.object !== 'page') return [];

  const events: LeadgenEvent[] = [];
  for (const entry of body.data.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'leadgen') continue;
      const value = leadgenChangeValueSchema.safeParse(change.value);
      if (!value.success) throw ValidationError.fromZod(value.error);
      events.push({ leadgenId: value.data.leadgen_id, payload: value.data });
    }
  }
  return events;
}
