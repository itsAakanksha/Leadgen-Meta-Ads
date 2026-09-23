import { Router } from 'express';

import { safeEqual } from '../../lib/crypto.js';
import { AppError } from '../../lib/errors.js';

export type WebhookRouterDeps = {
  verifyToken: string;
};

// Meta sends an integer; accept a conservative token shape so we never reflect arbitrary text.
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;

export function createWebhookRouter({ verifyToken }: WebhookRouterDeps): Router {
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

  return router;
}
