import { createHmac } from 'node:crypto';

import type { GraphClient } from '../src/lib/graph-client.js';

/** "sha256=<hex>" exactly as Meta computes X-Hub-Signature-256 over the raw body. */
export function sign(rawBody: string | Buffer, appSecret: string): string {
  return `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
}

type ChangeValue = Record<string, unknown> & { leadgen_id?: unknown };

/** A webhook body in Meta's documented shape: { object: 'page', entry: [{ changes: [...] }] }. */
export function leadgenBody(values: ChangeValue[], pageId = '0'): string {
  return JSON.stringify({
    object: 'page',
    entry: [
      {
        id: pageId,
        time: Math.floor(Date.now() / 1000),
        changes: values.map((value) => ({ field: 'leadgen', value })),
      },
    ],
  });
}

export type FieldData = { name: string; values: string[] }[];

/**
 * Creates a real lead on a form via Meta's POST /{form_id}/test_leads.
 * Meta allows one test lead per form, so any existing one is deleted first.
 * `fieldData` names must match questions on the form. Returns the new leadgen ID.
 */
export async function recreateTestLead(
  graph: GraphClient,
  formId: string,
  fieldData: FieldData,
): Promise<string> {
  const existing = (await graph.get(`${formId}/test_leads`, { fields: 'id' })) as {
    data?: { id: string }[];
  };
  for (const lead of existing.data ?? []) {
    await graph.delete(lead.id);
  }
  const created = (await graph.post(`${formId}/test_leads`, {
    field_data: JSON.stringify(fieldData),
  })) as { id: string };
  return created.id;
}
