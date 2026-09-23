import { Router } from 'express';

import { actorFrom } from '../../lib/actor.js';
import { AppError, parseOrThrow } from '../../lib/errors.js';
import {
  changeStatusBodySchema,
  leadIdParamSchema,
  listLeadsQuerySchema,
  updateLeadBodySchema,
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

  router.patch('/leads/:id', async (req, res) => {
    const { id } = parseOrThrow(leadIdParamSchema, req.params);
    // Status changes must go through the workflow endpoint so they are always validated
    // and always recorded as STATUS_CHANGED.
    if (typeof req.body === 'object' && req.body !== null && 'status' in req.body) {
      throw new AppError(
        'STATUS_NOT_EDITABLE',
        'Status cannot be edited here. Use PATCH /leads/:id/status.',
        400,
      );
    }
    const body = parseOrThrow(updateLeadBodySchema, req.body);
    res.json({ data: await leads.updateFields(id, body, actorFrom(req)) });
  });

  return router;
}
