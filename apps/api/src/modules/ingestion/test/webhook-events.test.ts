import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { testConfig } from '../../../../test/support/config.js';
import { createTestPrisma, resetDatabase } from '../../../../test/support/database.js';
import { silentLogger } from '../../../../test/support/logger.js';
import { leadgenBody, sign } from '../../../../test/support/meta-webhook.js';
import { createApp } from '../../../app.js';

describe('POST /webhook/meta-lead', () => {
  const config = testConfig();
  const prisma = createTestPrisma();
  const app = createApp({ config, logger: silentLogger, prisma });

  beforeEach(() => resetDatabase(prisma));
  afterAll(() => prisma.$disconnect());

  const deliver = (body: string, signature = sign(body, config.meta.appSecret)) =>
    request(app)
      .post('/webhook/meta-lead')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', signature)
      .send(body);

  it('acknowledges a signed delivery with 200 EVENT_RECEIVED and stores the event', async () => {
    const body = leadgenBody([{ leadgen_id: '444', page_id: '111', form_id: '222' }]);

    const res = await deliver(body);

    expect(res.status).toBe(200);
    expect(res.text).toBe('EVENT_RECEIVED');
    const events = await prisma.webhookEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      leadgenId: '444',
      status: 'pending',
      attempts: 0,
      payload: { leadgen_id: '444', page_id: '111', form_id: '222' },
    });
  });

  it('rejects an invalid signature with 401 and stores nothing', async () => {
    const body = leadgenBody([{ leadgen_id: '444' }]);

    const res = await deliver(body, sign(body, 'not-the-app-secret'));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    expect(await prisma.webhookEvent.count()).toBe(0);
  });

  it('rejects a missing signature with 401', async () => {
    const res = await request(app)
      .post('/webhook/meta-lead')
      .set('Content-Type', 'application/json')
      .send(leadgenBody([{ leadgen_id: '444' }]));
    expect(res.status).toBe(401);
  });

  it('stores a redelivered event only once (Meta retries for up to 36h)', async () => {
    const body = leadgenBody([{ leadgen_id: '444' }]);

    const first = await deliver(body);
    const second = await deliver(body);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200); // still 200, so Meta stops retrying
    expect(await prisma.webhookEvent.count()).toBe(1);
  });

  it('stores each lead once when a batch contains duplicates', async () => {
    const body = leadgenBody([
      { leadgen_id: '1' },
      { leadgen_id: '2' },
      { leadgen_id: '1' },
      { leadgen_id: '3' },
    ]);

    const res = await deliver(body);

    expect(res.status).toBe(200);
    const ids = (await prisma.webhookEvent.findMany()).map((e) => e.leadgenId).sort();
    expect(ids).toEqual(['1', '2', '3']);
  });

  it('handles concurrent deliveries of the same event without duplicates or errors', async () => {
    const body = leadgenBody([{ leadgen_id: '777' }]);

    const results = await Promise.all(Array.from({ length: 5 }, () => deliver(body)));

    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    expect(await prisma.webhookEvent.count()).toBe(1);
  });

  it('preserves an ID sent as a JSON number above 2^53', async () => {
    const body =
      '{"object":"page","entry":[{"changes":[{"field":"leadgen","value":{"leadgen_id":12345678901234567890}}]}]}';

    await deliver(body);

    const event = await prisma.webhookEvent.findFirstOrThrow();
    expect(event.leadgenId).toBe('12345678901234567890');
  });

  it('rejects a signed but malformed body with 400', async () => {
    const res = await deliver('{"object":"page"}');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await prisma.webhookEvent.count()).toBe(0);
  });

  it('acknowledges but ignores deliveries with no leadgen changes', async () => {
    const body = JSON.stringify({
      object: 'page',
      entry: [{ changes: [{ field: 'feed', value: {} }] }],
    });
    const res = await deliver(body);
    expect(res.status).toBe(200);
    expect(await prisma.webhookEvent.count()).toBe(0);
  });
});
