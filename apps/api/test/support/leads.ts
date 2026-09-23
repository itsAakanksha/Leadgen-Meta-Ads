import { randomUUID } from 'node:crypto';

import type { Lead } from '../../src/generated/prisma/client.js';
import type { PrismaClient } from '../../src/lib/prisma.js';

type LeadOverrides = Partial<
  Pick<
    Lead,
    | 'fullName'
    | 'email'
    | 'phone'
    | 'status'
    | 'platform'
    | 'notes'
    | 'assignee'
    | 'version'
    | 'createdAt'
    | 'campaignName'
  >
>;

/**
 * Inserts a lead row (and its LEAD_CREATED activity) directly, for tests of the lead APIs.
 * The ingestion pipeline itself is covered against the real Graph API elsewhere.
 */
export async function insertLead(
  prisma: PrismaClient,
  overrides: LeadOverrides = {},
): Promise<Lead> {
  const leadgenId = randomUUID();
  const fullName = overrides.fullName ?? 'Test Person';
  return prisma.lead.create({
    data: {
      leadgenId,
      formId: 'form-1',
      fullName,
      email: overrides.email ?? null,
      phone: overrides.phone ?? null,
      fieldData: [{ name: 'full_name', values: [fullName] }],
      graphResponse: { id: leadgenId },
      ...overrides,
      activities: { create: { type: 'LEAD_CREATED', actor: 'system:meta', payload: {} } },
    },
  });
}
