import { createHmac } from 'node:crypto';

/** "sha256=<hex>" exactly as Meta computes it over the raw body. */
export function sign(rawBody: string | Buffer, appSecret: string): string {
  return `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
}

type ChangeValue = Record<string, unknown> & { leadgen_id?: unknown };

/** A webhook body in Meta's documented shape: { object: 'page', entry: [{ changes: [...] }] }. */
export function leadgenBody(values: ChangeValue[], pageId = '1000000000001'): string {
  return JSON.stringify({
    object: 'page',
    entry: [
      {
        id: pageId,
        time: 1758700000,
        changes: values.map((value) => ({ field: 'leadgen', value })),
      },
    ],
  });
}
