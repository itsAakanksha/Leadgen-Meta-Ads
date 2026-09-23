import { Router } from 'express';

import { actorFrom } from '../../lib/actor.js';
import { parseOrThrow } from '../../lib/errors.js';
import {
  changeStatusBodySchema,
  leadIdParamSchema,
  listLeadsQuerySchema,
} from './leads.schemas.js';
import type { LeadsService } from './leads.service.js';

/** HTTP only: validate input, call the service, shape the response. */
export function createLeadsRouter({ leads }: { leads: LeadsService }): Router {
  const router = Router();

  router.get('/leads', async (req, res) => {
    const query = parseOrThrow(listLeadsQuerySchema, req.query);
    res.json(await leads.list(query));
  });

  router.get('/leads/:id', async (req, res) => {
    const { id } = parseOrThrow(leadIdParamSchema, req.params);
    res.json({ data: await leads.get(id) });
  });

  router.patch('/leads/:id/status', async (req, res) => {
    const { id } = parseOrThrow(leadIdParamSchema, req.params);
    const body = parseOrThrow(changeStatusBodySchema, req.body);
    res.json({ data: await leads.changeStatus(id, body, actorFrom(req)) });
  });

  return router;
}
