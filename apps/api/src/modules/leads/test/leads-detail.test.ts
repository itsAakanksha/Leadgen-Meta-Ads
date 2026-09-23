import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { testConfig } from '../../../../test/support/config.js';
import { createTestPrisma, resetDatabase } from '../../../../test/support/database.js';
import { insertLead } from '../../../../test/support/leads.js';
import { silentLogger } from '../../../../test/support/logger.js';
import { createApp } from '../../../app.js';

describe('GET /leads/:id', () => {
  const prisma = createTestPrisma();
  const app = createApp({ config: testConfig(), logger: silentLogger, prisma });

  beforeEach(() => resetDatabase(prisma));
  afterAll(() => prisma.$disconnect());

  it('returns the lead with answers, allowed transitions and its activity timeline', async () => {
    const lead = await insertLead(prisma, { fullName: 'Ada', status: 'CONTACTED' });
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'STATUS_CHANGED',
        actor: 'user:sam',
        payload: { from: 'NEW', to: 'CONTACTED' },
        createdAt: new Date(Date.now() + 1000),
      },
    });

    const res = await request(app).get(`/leads/${lead.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: lead.id,
      leadgenId: lead.leadgenId,
      fullName: 'Ada',
      status: 'CONTACTED',
      version: 1,
      fieldData: [{ name: 'full_name', values: ['Ada'] }],
      customDisclaimerResponses: [],
      allowedTransitions: ['QUALIFIED', 'LOST'],
    });
    expect(res.body.data.activities).toEqual([
      expect.objectContaining({ type: 'LEAD_CREATED', actor: 'system:meta', payload: {} }),
      expect.objectContaining({
        type: 'STATUS_CHANGED',
        actor: 'user:sam',
        payload: { from: 'NEW', to: 'CONTACTED' },
      }),
    ]);
  });

  it('does not expose the raw Graph response', async () => {
    const lead = await insertLead(prisma);
    const res = await request(app).get(`/leads/${lead.id}`);
    expect(res.body.data).not.toHaveProperty('graphResponse');
  });

  it('returns no transitions for a converted lead', async () => {
    const lead = await insertLead(prisma, { status: 'CONVERTED' });
    const res = await request(app).get(`/leads/${lead.id}`);
    expect(res.body.data.allowedTransitions).toEqual([]);
  });

  it('returns 404 for an unknown lead', async () => {
    const res = await request(app).get(`/leads/${randomUUID()}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: 'NOT_FOUND', message: 'Lead not found' });
  });

  it('returns 400 for an id that is not a UUID', async () => {
    const res = await request(app).get('/leads/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('id');
  });
});
