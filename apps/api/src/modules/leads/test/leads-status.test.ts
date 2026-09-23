import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { testConfig } from '../../../../test/support/config.js';
import { createTestPrisma, resetDatabase } from '../../../../test/support/database.js';
import { withFailingActivityInserts } from '../../../../test/support/db-faults.js';
import { insertLead } from '../../../../test/support/leads.js';
import { silentLogger } from '../../../../test/support/logger.js';
import { createApp } from '../../../app.js';

describe('PATCH /leads/:id/status', () => {
  const prisma = createTestPrisma();
  const app = createApp({ config: testConfig(), logger: silentLogger, prisma });

  beforeEach(() => resetDatabase(prisma));
  afterAll(() => prisma.$disconnect());

  const changeStatus = (id: string, body: object, actor?: string) => {
    const req = request(app).patch(`/leads/${id}/status`);
    if (actor !== undefined) void req.set('X-Actor', actor);
    return req.send(body);
  };
  const statusChanges = (leadId: string) =>
    prisma.leadActivity.findMany({ where: { leadId, type: 'STATUS_CHANGED' } });

  it('moves the lead, bumps the version and records who did it', async () => {
    const lead = await insertLead(prisma);

    const res = await changeStatus(lead.id, { status: 'CONTACTED', version: 1 }, 'Sam');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'CONTACTED',
      version: 2,
      allowedTransitions: ['QUALIFIED', 'LOST'],
    });
    const activities = res.body.data.activities as unknown[];
    expect(activities.at(-1)).toMatchObject({
      type: 'STATUS_CHANGED',
      actor: 'user:Sam',
      payload: { from: 'NEW', to: 'CONTACTED' },
    });
  });

  it('records a URI-encoded non-ASCII actor name correctly', async () => {
    const lead = await insertLead(prisma);
    await changeStatus(lead.id, { status: 'LOST', version: 1 }, encodeURIComponent('José Núñez'));
    expect((await statusChanges(lead.id))[0]?.actor).toBe('user:José Núñez');
  });

  it('records user:anonymous when no actor is given', async () => {
    const lead = await insertLead(prisma);
    await changeStatus(lead.id, { status: 'LOST', version: 1 });
    expect((await statusChanges(lead.id))[0]?.actor).toBe('user:anonymous');
  });

  it('treats setting the current status as a no-op: no write, no activity', async () => {
    const lead = await insertLead(prisma, { status: 'CONTACTED' });

    const res = await changeStatus(lead.id, { status: 'CONTACTED', version: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(1);
    expect(await statusChanges(lead.id)).toHaveLength(0);
  });

  it('rejects a transition outside the workflow with 422 and changes nothing', async () => {
    const lead = await insertLead(prisma, { status: 'NEW' });

    const res = await changeStatus(lead.id, { status: 'CONVERTED', version: 1 });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({
      code: 'INVALID_TRANSITION',
      details: { from: 'NEW', to: 'CONVERTED', allowed: ['CONTACTED', 'LOST'] },
    });
    const after = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(after).toMatchObject({ status: 'NEW', version: 1 });
    expect(await statusChanges(lead.id)).toHaveLength(0);
  });

  it('rejects any change to a converted lead', async () => {
    const lead = await insertLead(prisma, { status: 'CONVERTED' });
    const res = await changeStatus(lead.id, { status: 'LOST', version: 1 });
    expect(res.status).toBe(422);
  });

  it('rejects a stale version with 409 and the current version', async () => {
    const lead = await insertLead(prisma, { version: 3 });

    const res = await changeStatus(lead.id, { status: 'CONTACTED', version: 2 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'VERSION_CONFLICT',
      details: { currentVersion: 3 },
    });
    expect(await statusChanges(lead.id)).toHaveLength(0);
  });

  it('lets exactly one of two concurrent edits of the same version win', async () => {
    const lead = await insertLead(prisma);

    const results = await Promise.all([
      changeStatus(lead.id, { status: 'CONTACTED', version: 1 }, 'Alice'),
      changeStatus(lead.id, { status: 'LOST', version: 1 }, 'Bob'),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const after = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(after.version).toBe(2);
    const changes = await statusChanges(lead.id);
    expect(changes).toHaveLength(1);
    expect((changes[0]?.payload as { to: string }).to).toBe(after.status);
  });

  it('rolls back the status change if its audit record cannot be written', async () => {
    const lead = await insertLead(prisma);

    await withFailingActivityInserts(prisma, async () => {
      const res = await changeStatus(lead.id, { status: 'CONTACTED', version: 1 });
      expect(res.status).toBe(500);
    });

    const after = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(after).toMatchObject({ status: 'NEW', version: 1 });
  });

  it('returns 404 for an unknown lead', async () => {
    const res = await changeStatus(randomUUID(), { status: 'CONTACTED', version: 1 });
    expect(res.status).toBe(404);
  });

  it.each([
    [{ status: 'CONTACTED' }, 'version'],
    [{ version: 1 }, 'status'],
    [{ status: 'WON', version: 1 }, 'status'],
    [{ status: 'CONTACTED', version: 0 }, 'version'],
    [{ status: 'CONTACTED', version: '1' }, 'version'],
    [{ status: 'CONTACTED', version: 1, notes: 'x' }, ''],
  ])('rejects invalid body %o with 400', async (body, path) => {
    const lead = await insertLead(prisma);
    const res = await changeStatus(lead.id, body);
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe(path);
  });

  it('rejects an invalid X-Actor with 400', async () => {
    const lead = await insertLead(prisma);
    const res = await changeStatus(lead.id, { status: 'LOST', version: 1 }, 'x'.repeat(61));
    expect(res.status).toBe(400);
    expect(await statusChanges(lead.id)).toHaveLength(0);
  });
});
