import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { testConfig } from '../../../../test/support/config.js';
import { createTestPrisma, resetDatabase } from '../../../../test/support/database.js';
import { withFailingActivityInserts } from '../../../../test/support/db-faults.js';
import { insertLead } from '../../../../test/support/leads.js';
import { silentLogger } from '../../../../test/support/logger.js';
import { createApp } from '../../../app.js';

describe('PATCH /leads/:id', () => {
  const prisma = createTestPrisma();
  const app = createApp({ config: testConfig(), logger: silentLogger, prisma });

  beforeEach(() => resetDatabase(prisma));
  afterAll(() => prisma.$disconnect());

  const update = (id: string, body: object, actor = 'Sam') =>
    request(app).patch(`/leads/${id}`).set('X-Actor', actor).send(body);
  const updates = (leadId: string) =>
    prisma.leadActivity.findMany({ where: { leadId, type: 'LEAD_UPDATED' } });

  it('updates fields, bumps the version and records a field-level diff', async () => {
    const lead = await insertLead(prisma, { fullName: 'Ada', email: 'ada@example.com' });

    const res = await update(lead.id, {
      version: 1,
      fullName: 'Ada Lovelace',
      notes: 'Wants a call on Monday',
      email: 'ada@example.com', // unchanged: must not appear in the diff
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      fullName: 'Ada Lovelace',
      notes: 'Wants a call on Monday',
      version: 2,
    });
    const [activity] = await updates(lead.id);
    expect(activity).toMatchObject({
      actor: 'user:Sam',
      payload: {
        changes: {
          fullName: { from: 'Ada', to: 'Ada Lovelace' },
          notes: { from: null, to: 'Wants a call on Monday' },
        },
      },
    });
  });

  it('clears a field with null or an empty string', async () => {
    const lead = await insertLead(prisma, { phone: '+447700900123', assignee: 'Kim' });

    const res = await update(lead.id, { version: 1, phone: '', assignee: null });

    expect(res.body.data).toMatchObject({ phone: null, assignee: null });
    expect((await updates(lead.id))[0]?.payload).toEqual({
      changes: {
        phone: { from: '+447700900123', to: null },
        assignee: { from: 'Kim', to: null },
      },
    });
  });

  it('treats identical values as a no-op: no write, no activity', async () => {
    const lead = await insertLead(prisma, { fullName: 'Ada', notes: 'x' });

    const res = await update(lead.id, { version: 1, fullName: '  Ada  ', notes: 'x' });

    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(1);
    expect(await updates(lead.id)).toHaveLength(0);
  });

  it('rejects status with STATUS_NOT_EDITABLE, pointing at the status endpoint', async () => {
    const lead = await insertLead(prisma);

    const res = await update(lead.id, { version: 1, status: 'LOST' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('STATUS_NOT_EDITABLE');
    expect(res.body.error.message).toContain('/status');
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe('NEW');
  });

  it('rejects a stale version with 409', async () => {
    const lead = await insertLead(prisma, { version: 2 });

    const res = await update(lead.id, { version: 1, notes: 'late edit' });

    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual({ currentVersion: 2 });
    expect(await updates(lead.id)).toHaveLength(0);
  });

  it('lets exactly one of two concurrent edits win, across both PATCH endpoints', async () => {
    const lead = await insertLead(prisma);

    const results = await Promise.all([
      update(lead.id, { version: 1, notes: 'from Alice' }, 'Alice'),
      request(app).patch(`/leads/${lead.id}/status`).send({ status: 'CONTACTED', version: 1 }),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).version).toBe(2);
    expect(await prisma.leadActivity.count({ where: { leadId: lead.id } })).toBe(2); // created + 1
  });

  it('rolls back the edit if its audit record cannot be written', async () => {
    const lead = await insertLead(prisma, { notes: 'before' });

    await withFailingActivityInserts(prisma, async () => {
      expect((await update(lead.id, { version: 1, notes: 'after' })).status).toBe(500);
    });

    expect(await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).toMatchObject({
      notes: 'before',
      version: 1,
    });
  });

  it('returns 404 for an unknown lead', async () => {
    expect((await update(randomUUID(), { version: 1, notes: 'x' })).status).toBe(404);
  });

  it.each([
    [{ notes: 'x' }, 'version'],
    [{ version: 1, email: 'not-an-email' }, 'email'],
    [{ version: 1, phone: 'call me' }, 'phone'],
    [{ version: 1, fullName: 'x'.repeat(201) }, 'fullName'],
    [{ version: 1, assignee: 42 }, 'assignee'],
    [{ version: 1, leadgenId: 'hijack' }, ''],
    [{ version: 1, fieldData: [] }, ''],
  ])('rejects invalid body %o with 400', async (body, path) => {
    const lead = await insertLead(prisma);
    const res = await update(lead.id, body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toBe(path);
  });
});
