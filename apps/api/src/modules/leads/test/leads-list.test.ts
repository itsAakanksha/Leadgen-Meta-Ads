import request, { type Response } from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { testConfig } from '../../../../test/support/config.js';
import { createTestPrisma, resetDatabase } from '../../../../test/support/database.js';
import { insertLead } from '../../../../test/support/leads.js';
import { silentLogger } from '../../../../test/support/logger.js';
import { createApp } from '../../../app.js';

type ListBody = { data: { id: string; fullName: string }[] };
const fullNames = (res: Response) => (res.body as ListBody).data.map((lead) => lead.fullName);
const ids = (res: Response) => (res.body as ListBody).data.map((lead) => lead.id);

describe('GET /leads', () => {
  const prisma = createTestPrisma();
  const app = createApp({ config: testConfig(), logger: silentLogger, prisma });

  beforeEach(() => resetDatabase(prisma));
  afterAll(() => prisma.$disconnect());

  const list = (query: Record<string, string | number> = {}) =>
    request(app).get('/leads').query(query);
  const names = async (q: string) => fullNames(await list({ q }));

  it('returns an empty page when there are no leads', async () => {
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], page: 1, limit: 20, total: 0 });
  });

  it('lists leads newest first with summary fields only', async () => {
    await insertLead(prisma, { fullName: 'Older', createdAt: new Date('2026-01-01') });
    await insertLead(prisma, { fullName: 'Newer', createdAt: new Date('2026-02-01') });

    const res = await list();

    expect(fullNames(res)).toEqual(['Newer', 'Older']);
    expect(res.body.total).toBe(2);
    expect(res.body.data[0]).not.toHaveProperty('graphResponse');
    expect(res.body.data[0]).not.toHaveProperty('fieldData');
  });

  it('filters by status', async () => {
    await insertLead(prisma, { fullName: 'A', status: 'NEW' });
    await insertLead(prisma, { fullName: 'B', status: 'CONTACTED' });

    const res = await list({ status: 'CONTACTED' });

    expect(fullNames(res)).toEqual(['B']);
    expect(res.body.total).toBe(1);
  });

  it('filters by platform', async () => {
    await insertLead(prisma, { fullName: 'Insta', platform: 'ig' });
    await insertLead(prisma, { fullName: 'Face', platform: 'fb' });

    const res = await list({ platform: 'ig' });

    expect(fullNames(res)).toEqual(['Insta']);
  });

  it('searches name and email case-insensitively, and phone', async () => {
    await insertLead(prisma, { fullName: 'Ada Lovelace', email: 'ada@example.com' });
    await insertLead(prisma, { fullName: 'Grace Hopper', email: 'grace@EXAMPLE.org' });
    await insertLead(prisma, { fullName: 'Alan Turing', phone: '+447700900123' });

    expect(await names('lovelace')).toEqual(['Ada Lovelace']);
    expect(await names('example.org')).toEqual(['Grace Hopper']);
    expect(await names('7700900')).toEqual(['Alan Turing']);
    expect(await names('nobody')).toEqual([]);
  });

  it('treats % and _ in the search as literal characters', async () => {
    await insertLead(prisma, { fullName: 'Plain Name' });
    await insertLead(prisma, { fullName: '100% Match' });
    await insertLead(prisma, { fullName: 'snake_case' });

    expect(await names('%')).toEqual(['100% Match']);
    expect(await names('_')).toEqual(['snake_case']);
  });

  it('combines filters and search', async () => {
    await insertLead(prisma, { fullName: 'Ada One', status: 'NEW' });
    await insertLead(prisma, { fullName: 'Ada Two', status: 'LOST' });

    const res = await list({ q: 'ada', status: 'LOST' });

    expect(fullNames(res)).toEqual(['Ada Two']);
  });

  it('paginates with page and limit, reporting the total', async () => {
    for (let i = 1; i <= 5; i++) {
      await insertLead(prisma, { fullName: `Lead ${i}`, createdAt: new Date(2026, 0, i) });
    }

    const page2 = await list({ page: 2, limit: 2 });

    expect(page2.body).toMatchObject({ page: 2, limit: 2, total: 5 });
    expect(fullNames(page2)).toEqual(['Lead 3', 'Lead 2']);
    expect((await list({ page: 4, limit: 2 })).body.data).toEqual([]);
  });

  it('never repeats or skips leads across pages when timestamps are equal', async () => {
    const sameTime = new Date('2026-03-01T00:00:00Z');
    for (let i = 0; i < 5; i++) await insertLead(prisma, { createdAt: sameTime });

    const pages = await Promise.all([1, 2, 3].map((page) => list({ page, limit: 2 })));
    const allIds = pages.flatMap(ids);

    expect(allIds).toHaveLength(5);
    expect(new Set(allIds).size).toBe(5);
  });

  it.each([
    [{ status: 'WON' }, 'status'],
    [{ platform: 'tiktok' }, 'platform'],
    [{ limit: 101 }, 'limit'],
    [{ limit: 0 }, 'limit'],
    [{ page: 0 }, 'page'],
    [{ page: 'abc' }, 'page'],
  ])('rejects invalid query %o with 400', async (query, field) => {
    const res = await list(query);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toBe(field);
  });
});
