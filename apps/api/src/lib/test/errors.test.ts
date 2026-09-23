import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { silentLogger } from '../../../test/support/logger.js';
import { AppError, createErrorHandler, notFoundHandler, ValidationError } from '../errors.js';

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '1kb' }));
  app.get('/app-error', () => {
    throw new AppError('SOMETHING_WRONG', 'Specific problem', 422, { hint: 'x' });
  });
  app.get('/validation', () => {
    const result = z.object({ email: z.email() }).safeParse({ email: 'nope' });
    if (!result.success) throw ValidationError.fromZod(result.error);
  });
  app.get('/crash', () => {
    throw new Error('db password is hunter2');
  });
  app.post('/json', (req, res) => {
    res.json(req.body);
  });
  app.use(notFoundHandler);
  app.use(createErrorHandler(silentLogger));
  return app;
}

describe('error handler', () => {
  const app = buildApp();

  it('maps AppError to its status and the error envelope', async () => {
    const res = await request(app).get('/app-error');
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: { code: 'SOMETHING_WRONG', message: 'Specific problem', details: { hint: 'x' } },
    });
  });

  it('turns zod issues into VALIDATION_ERROR with field paths', async () => {
    const res = await request(app).get('/validation');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([expect.objectContaining({ path: 'email' })]);
  });

  it('hides internal details of unexpected errors', async () => {
    const res = await request(app).get('/crash');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
  });

  it('rejects malformed JSON with 400 INVALID_JSON', async () => {
    const res = await request(app)
      .post('/json')
      .set('Content-Type', 'application/json')
      .send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('rejects oversized bodies with 413', async () => {
    const res = await request(app)
      .post('/json')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ big: 'x'.repeat(2000) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns 404 NOT_FOUND for unknown routes', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
