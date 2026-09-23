import { Router } from 'express';

import { ValidationError } from '../../lib/errors.js';
import { listLeadsQuerySchema } from './leads.schemas.js';
import type { LeadsService } from './leads.service.js';

/** HTTP only: validate input, call the service, shape the response. */
export function createLeadsRouter({ leads }: { leads: LeadsService }): Router {
  const router = Router();

  router.get('/leads', async (req, res) => {
    const query = listLeadsQuerySchema.safeParse(req.query);
    if (!query.success) throw ValidationError.fromZod(query.error);
    res.json(await leads.list(query.data));
  });

  return router;
}
