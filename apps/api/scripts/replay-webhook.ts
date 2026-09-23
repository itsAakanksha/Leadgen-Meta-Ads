/**
 * Sends a correctly signed Meta leadgen webhook for a real leadgen ID, the same bytes Meta
 * would send. Use it to demonstrate duplicate and batch handling, which Meta's own tools
 * cannot trigger on demand.
 *
 *   pnpm webhook:replay --leadgen-id <id> [--times 3] [--batch] [--bad-signature]
 *                       [--url http://localhost:4000/webhook/meta-lead]
 *
 *   --times N        send the event N times
 *   --batch          put all N copies in ONE delivery (Meta batches) instead of N deliveries
 *   --bad-signature  sign with the wrong secret (expect 401)
 *
 * Env: META_APP_SECRET (must match the API's).
 */
import { parseArgs } from 'node:util';

import { leadgenBody, sign } from './meta-dev-tools.js';

const { values: args } = parseArgs({
  options: {
    'leadgen-id': { type: 'string' },
    'page-id': { type: 'string', default: '0' },
    'form-id': { type: 'string' },
    times: { type: 'string', default: '1' },
    batch: { type: 'boolean', default: false },
    'bad-signature': { type: 'boolean', default: false },
    url: { type: 'string', default: 'http://localhost:4000/webhook/meta-lead' },
  },
});

const appSecret = process.env.META_APP_SECRET;
const leadgenId = args['leadgen-id'];
const times = Number(args.times);
if (!appSecret || !leadgenId || !Number.isInteger(times) || times < 1) {
  console.error('Usage: pnpm webhook:replay --leadgen-id <id> [--times N] [--batch]');
  console.error('Requires META_APP_SECRET in apps/api/.env');
  process.exit(1);
}

const value = {
  leadgen_id: leadgenId,
  page_id: args['page-id'],
  ...(args['form-id'] && { form_id: args['form-id'] }),
  created_time: Math.floor(Date.now() / 1000),
};
const bodies = args.batch
  ? [
      leadgenBody(
        Array.from({ length: times }, () => value),
        args['page-id'],
      ),
    ]
  : Array.from({ length: times }, () => leadgenBody([value], args['page-id']));

for (const [index, body] of bodies.entries()) {
  const secret = args['bad-signature'] ? `${appSecret}-wrong` : appSecret;
  const response = await fetch(args.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': sign(body, secret) },
    body,
  });
  console.log(
    `Delivery ${index + 1}/${bodies.length}: ${response.status} ${await response.text()}`,
  );
}
