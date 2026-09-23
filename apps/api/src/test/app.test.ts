import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { createTestPrisma } from '../../test/support/database.js';
import { silentLogger } from '../../test/support/logger.js';
import { createApp } from '../app.js';
import { createPrisma } from '../lib/prisma.js';

describe('app', () => {
  const prisma = createTestPrisma();
  const app = createApp({ logger: silentLogger, prisma });

  afterAll(() => prisma.$disconnect());

  it('GET /health returns ok when the database is reachable', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /health returns 503 when the database is unreachable', async () => {
    const deadPrisma = createPrisma('postgresql://postgres:postgres@127.0.0.1:1/none');
    const deadApp = createApp({ logger: silentLogger, prisma: deadPrisma });
    const res = await request(deadApp).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'unavailable' });
    await deadPrisma.$disconnect();
  });

  it('sets a generated X-Request-Id on every response', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('echoes a caller-supplied X-Request-Id', async () => {
    const res = await request(app).get('/health').set('X-Request-Id', 'trace-123');
    expect(res.headers['x-request-id']).toBe('trace-123');
  });

  it('does not advertise Express', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
