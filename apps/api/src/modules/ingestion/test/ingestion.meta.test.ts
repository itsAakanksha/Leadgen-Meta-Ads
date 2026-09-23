import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { testConfig } from '../../../../test/support/config.js';
import { createTestPrisma, resetDatabase } from '../../../../test/support/database.js';
import { withFailingActivityInserts } from '../../../../test/support/db-faults.js';
import { buildIngestion } from '../../../../test/support/ingestion.js';
import { silentLogger } from '../../../../test/support/logger.js';
import {
  createTestGraphClient,
  recreateTestLead,
  requireMetaTestEnv,
} from '../../../../test/support/meta-graph.js';
import { leadgenBody, sign } from '../../../../test/support/meta-webhook.js';
import { createApp } from '../../../app.js';

// Full pipeline against the real Graph API: signed webhook → stored event → worker fetches
// the real lead → lead + LEAD_CREATED in one transaction.
describe('ingestion pipeline (real Meta)', () => {
  const env = requireMetaTestEnv();
  const config = testConfig();
  const prisma = createTestPrisma();
  const app = createApp({ config, logger: silentLogger, prisma });
  const ingestion = buildIngestion(prisma, {
    accessToken: env.pageAccessToken,
    graphApiVersion: env.graphApiVersion,
  });
  let leadgenId: string;

  beforeAll(async () => {
    leadgenId = await recreateTestLead(createTestGraphClient(env), env.testFormId);
  }, 30_000);
  beforeEach(() => resetDatabase(prisma));
  afterAll(() => prisma.$disconnect());

  const deliver = (body: string) =>
    request(app)
      .post('/webhook/meta-lead')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', sign(body, config.meta.appSecret))
      .send(body);

  it('turns a webhook into a lead with its real answers and one LEAD_CREATED', async () => {
    await deliver(leadgenBody([{ leadgen_id: leadgenId, form_id: env.testFormId }]));

    expect(await ingestion.processNextEvent()).toBe(true);

    const lead = await prisma.lead.findUniqueOrThrow({
      where: { leadgenId },
      include: { activities: true },
    });
    expect(lead).toMatchObject({
      fullName: 'Integration Test Lead',
      email: 'integration-test@example.com',
      phone: '+15555550100',
      formId: env.testFormId,
      status: 'NEW',
      version: 1,
    });
    expect(lead.activities).toHaveLength(1);
    expect(lead.activities[0]).toMatchObject({ type: 'LEAD_CREATED', actor: 'system:meta' });

    const event = await prisma.webhookEvent.findUniqueOrThrow({ where: { leadgenId } });
    expect(event.status).toBe('done');
    expect(event.processedAt).toBeInstanceOf(Date);
  }, 30_000);

  it('never duplicates the lead or its activity, even if the event is reprocessed', async () => {
    const body = leadgenBody([{ leadgen_id: leadgenId }]);
    await deliver(body);
    await deliver(body); // Meta retry
    await ingestion.processNextEvent();

    // Simulate a crash-and-retry that re-runs an already processed event.
    await prisma.webhookEvent.updateMany({ data: { status: 'pending' } });
    await ingestion.processNextEvent();

    expect(await prisma.lead.count()).toBe(1);
    expect(await prisma.leadActivity.count()).toBe(1);
  }, 30_000);

  it('rolls back the lead if writing its audit record fails (atomicity)', async () => {
    // Real database failure injected with a temporary trigger on the activity table.
    await withFailingActivityInserts(prisma, async () => {
      await deliver(leadgenBody([{ leadgen_id: leadgenId }]));
      await ingestion.processNextEvent();
    });

    expect(await prisma.lead.count()).toBe(0); // no lead without its audit record
    const event = await prisma.webhookEvent.findUniqueOrThrow({ where: { leadgenId } });
    expect(event).toMatchObject({ status: 'pending', attempts: 1 });
  }, 30_000);
});
