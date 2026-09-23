import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestPrisma, resetDatabase } from '../../../../test/support/database.js';
import { buildIngestion, INVALID_ACCESS_TOKEN } from '../../../../test/support/ingestion.js';
import { silentLogger } from '../../../../test/support/logger.js';
import { GraphApiError } from '../../../lib/graph-client.js';
import { describeError, retryDelayMs } from '../ingestion.service.js';
import { startWebhookEventsWorker } from '../webhook-events.worker.js';

describe('retryDelayMs', () => {
  it('doubles from 30s and caps at 1h', () => {
    expect([1, 2, 3, 4].map(retryDelayMs)).toEqual([30_000, 60_000, 120_000, 240_000]);
    expect(retryDelayMs(20)).toBe(3_600_000);
  });
});

describe('describeError', () => {
  it('keeps the sanitised Graph error message', () => {
    expect(describeError(new GraphApiError(400, 100, 'GraphMethodException', 'Atrace'))).toBe(
      'Graph API error: code 100, GraphMethodException, http 400, fbtrace_id Atrace',
    );
  });

  it('reduces unknown errors to name and code, dropping messages that may hold PII', () => {
    const prismaLike = Object.assign(new Error('Unique failed on email=ada@example.com'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
    });
    expect(describeError(prismaLike)).toBe('PrismaClientKnownRequestError P2002');
  });
});

// These tests call the real Graph API with an invalid token, so Meta itself returns the error.
describe('processing failures (real Graph API errors)', () => {
  const prisma = createTestPrisma();
  const ingestion = buildIngestion(prisma, { accessToken: INVALID_ACCESS_TOKEN, maxAttempts: 3 });

  beforeEach(() => resetDatabase(prisma));
  afterAll(() => prisma.$disconnect());

  const enqueue = (leadgenId: string) =>
    ingestion.receiveEvents([{ leadgenId, payload: { leadgen_id: leadgenId } }]);
  const makeDue = () =>
    prisma.webhookEvent.updateMany({ data: { nextAttemptAt: new Date(Date.now() - 1000) } });

  it('returns false when no event is due', async () => {
    expect(await ingestion.processNextEvent()).toBe(false);
  });

  it('schedules a retry with backoff and a sanitised error, creating no lead', async () => {
    await enqueue('555');
    const before = Date.now();

    expect(await ingestion.processNextEvent()).toBe(true);

    const event = await prisma.webhookEvent.findUniqueOrThrow({ where: { leadgenId: '555' } });
    expect(event.status).toBe('pending');
    expect(event.attempts).toBe(1);
    // Meta answers an invalid token with code 190. On a slow network the 10s client timeout
    // can fire first; either way the attempt must be recorded and retried.
    expect(event.lastError).toMatch(/^Graph API error: (code 190|network error)/);
    expect(event.lastError).not.toContain(INVALID_ACCESS_TOKEN);
    expect(event.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(before + 30_000 - 1000);
    expect(await prisma.lead.count()).toBe(0);
    expect(await prisma.leadActivity.count()).toBe(0);
  });

  it('does not pick up an event again before its retry time', async () => {
    await enqueue('555');
    await ingestion.processNextEvent();

    expect(await ingestion.processNextEvent()).toBe(false);
  });

  it('marks the event failed after the maximum number of attempts', async () => {
    await enqueue('555');
    for (let i = 0; i < 3; i++) {
      await ingestion.processNextEvent();
      await makeDue();
    }

    const event = await prisma.webhookEvent.findUniqueOrThrow({ where: { leadgenId: '555' } });
    expect(event.status).toBe('failed');
    expect(event.attempts).toBe(3);
    expect(await ingestion.processNextEvent()).toBe(false); // failed events are never retried
  });

  it('never lets two concurrent workers claim the same event (FOR UPDATE SKIP LOCKED)', async () => {
    await enqueue('1');
    await enqueue('2');

    await Promise.all([ingestion.processNextEvent(), ingestion.processNextEvent()]);

    const attempts = (await prisma.webhookEvent.findMany({ orderBy: { leadgenId: 'asc' } })).map(
      (e) => e.attempts,
    );
    expect(attempts).toEqual([1, 1]); // each attempted exactly once, not one attempted twice
  });

  it('the background worker drains due events and stops cleanly', async () => {
    await enqueue('555');
    const worker = startWebhookEventsWorker({
      ingestion,
      logger: silentLogger,
      pollIntervalMs: 50,
    });

    await expect
      .poll(async () => (await prisma.webhookEvent.findFirstOrThrow()).attempts, {
        timeout: 45_000,
      })
      .toBe(1);
    await worker.stop();
  });
});
