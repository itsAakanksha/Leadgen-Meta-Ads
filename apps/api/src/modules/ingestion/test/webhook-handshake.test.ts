import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { testConfig } from '../../../../test/support/config.js';
import { createTestPrisma } from '../../../../test/support/database.js';
import { silentLogger } from '../../../../test/support/logger.js';
import { createApp } from '../../../app.js';

describe('GET /webhook/meta-lead (verification handshake)', () => {
  const config = testConfig();
  const prisma = createTestPrisma();
  const app = createApp({ config, logger: silentLogger, prisma });
  afterAll(() => prisma.$disconnect());

  const handshake = (query: Record<string, string>) =>
    request(app).get('/webhook/meta-lead').query(query);

  it('echoes hub.challenge as plain text when the verify token matches', async () => {
    const res = await handshake({
      'hub.mode': 'subscribe',
      'hub.verify_token': config.meta.verifyToken,
      'hub.challenge': '1158201444',
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/plain/);
    expect(res.text).toBe('1158201444');
  });

  it('rejects a wrong verify token with 403', async () => {
    const res = await handshake({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong-token',
      'hub.challenge': '1158201444',
    });
    expect(res.status).toBe(403);
    expect(res.text).not.toContain('1158201444');
  });

  it('rejects a verify token that is only a prefix of the real one', async () => {
    const res = await handshake({
      'hub.mode': 'subscribe',
      'hub.verify_token': config.meta.verifyToken.slice(0, -1),
      'hub.challenge': '1',
    });
    expect(res.status).toBe(403);
  });

  it('rejects a mode other than subscribe with 403', async () => {
    const res = await handshake({
      'hub.mode': 'unsubscribe',
      'hub.verify_token': config.meta.verifyToken,
      'hub.challenge': '1',
    });
    expect(res.status).toBe(403);
  });

  it('rejects a request with no parameters with 403', async () => {
    const res = await handshake({});
    expect(res.status).toBe(403);
  });

  it('refuses to reflect a challenge that is not a plain token', async () => {
    const res = await handshake({
      'hub.mode': 'subscribe',
      'hub.verify_token': config.meta.verifyToken,
      'hub.challenge': '<script>alert(1)</script>',
    });
    expect(res.status).toBe(400);
    expect(res.text).not.toContain('<script>');
  });
});
