/**
 * Creates a real lead on a Meta lead form (POST /{form_id}/test_leads).
 * If the app is subscribed to the Page's leadgen webhook, Meta then delivers a real, signed
 * webhook to the API. Otherwise replay it with `pnpm webhook:replay --leadgen-id <id>`.
 *
 *   pnpm lead:create [--form <form_id>] [--name "Ada Lovelace"] [--email a@b.com] [--phone +44...]
 *
 * Env: META_PAGE_ACCESS_TOKEN, GRAPH_API_VERSION, META_DEMO_FORM_ID (default form).
 */
import { randomInt } from 'node:crypto';
import { parseArgs } from 'node:util';

import { createGraphClient, GraphApiError } from '../src/lib/graph-client.js';
import { recreateTestLead } from './meta-dev-tools.js';

const { values: args } = parseArgs({
  options: {
    form: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
  },
});

const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
const formId = args.form ?? process.env.META_DEMO_FORM_ID;
if (!accessToken || !formId) {
  console.error(
    'Set META_PAGE_ACCESS_TOKEN and META_DEMO_FORM_ID (or pass --form) in apps/api/.env',
  );
  process.exit(1);
}

const suffix = randomInt(1000, 9999);
const fieldData = [
  { name: 'full_name', values: [args.name ?? `Demo Lead ${suffix}`] },
  { name: 'email', values: [args.email ?? `demo.lead.${suffix}@example.com`] },
  { name: 'phone_number', values: [args.phone ?? `+1555555${suffix}`] },
];

const graph = createGraphClient({
  version: process.env.GRAPH_API_VERSION ?? 'v25.0',
  accessToken,
});

try {
  const leadgenId = await recreateTestLead(graph, formId, fieldData);
  console.log(`Created test lead ${leadgenId} on form ${formId}.`);
  console.log('Meta will now deliver the leadgen webhook (if the Page is subscribed).');
  console.log(`To replay it manually: pnpm webhook:replay --leadgen-id ${leadgenId}`);
} catch (err) {
  console.error(err instanceof GraphApiError ? err.message : 'Failed to create test lead');
  process.exit(1);
}
