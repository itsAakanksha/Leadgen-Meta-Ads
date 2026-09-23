import express, { Router } from 'express';

import { safeEqual } from '../../lib/crypto.js';
import { AppError } from '../../lib/errors.js';
import type { IngestionService } from './ingestion.service.js';
import { parseWebhookBody } from './webhook-payload.js';
import { isValidSignature } from './webhook-signature.js';

export type WebhookRouterDeps = {
  verifyToken: string;
  appSecret: string;
  ingestion: IngestionService;
};

// Meta sends an integer; accept a conservative token shape so we never reflect arbitrary text.
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;

// Meta batches up to 1000 changes per delivery.
const MAX_BODY_SIZE = '5mb';

export function createWebhookRouter({
  verifyToken,
  appSecret,
  ingestion,
}: WebhookRouterDeps): Router {
  const router = Router();

  /**
   * Verification handshake. Meta calls this once when the webhook is configured:
   * GET ?hub.mode=subscribe&hub.verify_token=<ours>&hub.challenge=<n>  → echo the challenge.
   */
  router.get('/webhook/meta-lead', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode !== 'subscribe' || typeof token !== 'string' || !safeEqual(token, verifyToken)) {
      throw new AppError('FORBIDDEN', 'Verification failed', 403);
    }
    if (typeof challenge !== 'string' || !CHALLENGE_PATTERN.test(challenge)) {
      throw new AppError('INVALID_CHALLENGE', 'Invalid hub.challenge', 400);
    }
    res.type('text/plain').send(challenge);
  });

  /**
   * Event delivery. The body is read as raw bytes (any content type) because the signature
   * is computed over the exact bytes Meta sent.
   */
  router.post(
    '/webhook/meta-lead',
    express.raw({ type: () => true, limit: MAX_BODY_SIZE }),
    async (req, res) => {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (!isValidSignature(rawBody, req.get('X-Hub-Signature-256'), appSecret)) {
        throw new AppError('INVALID_SIGNATURE', 'Invalid X-Hub-Signature-256', 401);
      }

      const events = parseWebhookBody(rawBody);
      await ingestion.receiveEvents(events);
      res.type('text/plain').send('EVENT_RECEIVED');
    },
  );

  return router;
}
