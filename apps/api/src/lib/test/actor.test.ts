import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { silentLogger } from '../../../test/support/logger.js';
import { actorFrom } from '../actor.js';
import { createErrorHandler } from '../errors.js';

const app = express();
app.get('/', (req, res) => {
  res.json({ actor: actorFrom(req) });
});
app.use(createErrorHandler(silentLogger));

const actorFor = (header?: string) => {
  const req = request(app).get('/');
  if (header !== undefined) void req.set('X-Actor', header);
  return req;
};

describe('actorFrom', () => {
  it('prefixes the name with user:', async () => {
    expect((await actorFor('Sam Lee')).body.actor).toBe('user:Sam Lee');
  });

  it('decodes URI-encoded names (browsers only allow ASCII header values)', async () => {
    expect((await actorFor(encodeURIComponent('Zoë Ōkubo'))).body.actor).toBe('user:Zoë Ōkubo');
  });

  it('defaults to user:anonymous when missing or blank', async () => {
    expect((await actorFor()).body.actor).toBe('user:anonymous');
    expect((await actorFor('   ')).body.actor).toBe('user:anonymous');
  });

  it.each([
    ['too long', 'a'.repeat(61)],
    ['control characters', encodeURIComponent('Sam\nsystem:meta')],
    ['impersonating the system actor', 'system:meta'],
    ['malformed encoding', '%E0%A4%A'],
  ])('rejects %s with 400', async (_label, header) => {
    const res = await actorFor(header);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
