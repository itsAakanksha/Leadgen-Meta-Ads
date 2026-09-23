import { Router } from 'express';

import { ValidationError } from '../../lib/errors.js';
import { leadIdParamSchema, listLeadsQuerySchema } from './leads.schemas.js';
import type { LeadsService } from './leads.service.js';

/** HTTP only: validate input, call the service, shape the response. */
export function createLeadsRouter({ leads }: { leads: LeadsService }): Router {
  const router = Router();

  router.get('/leads', async (req, res) => {
    const query = listLeadsQuerySchema.safeParse(req.query);
    if (!query.success) throw ValidationError.fromZod(query.error);
    res.json(await leads.list(query.data));
  });

  router.get('/leads/:id', async (req, res) => {
    const params = leadIdParamSchema.safeParse(req.params);
    if (!params.success) throw ValidationError.fromZod(params.error);
    res.json({ data: await leads.get(params.data.id) });
  });

  return router;
}
