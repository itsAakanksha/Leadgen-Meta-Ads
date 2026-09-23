import { beforeAll, describe, expect, it } from 'vitest';

import {
  createTestGraphClient,
  recreateTestLead,
  requireMetaTestEnv,
} from '../../../../test/support/meta-graph.js';
import { mapGraphLead, GRAPH_LEAD_FIELDS } from '../lead-mapping.js';
import { createGraphClient, GraphApiError } from '../../../lib/graph-client.js';

// Real Graph API. Needs META_PAGE_ACCESS_TOKEN and META_TEST_FORM_ID.
describe('Graph API client (real Meta)', () => {
  const env = requireMetaTestEnv();
  const graph = createTestGraphClient(env);
  let leadgenId: string;

  beforeAll(async () => {
    leadgenId = await recreateTestLead(graph, env.testFormId);
  });

  it('fetches a real lead with the fields we request, and it maps cleanly', async () => {
    const response = await graph.get(leadgenId, { fields: GRAPH_LEAD_FIELDS });

    const lead = mapGraphLead(response, { leadgen_id: leadgenId });
    expect(lead.leadgenId).toBe(leadgenId);
    expect(lead.formId).toBe(env.testFormId);
    expect(lead.fullName).toBe('Integration Test Lead');
    expect(lead.email).toBe('integration-test@example.com');
    expect(lead.phone).toBe('+15555550100');
    expect(lead.metaCreatedAt).toBeInstanceOf(Date);
  });

  it("returns Meta's error code 100 for an unknown lead, without leaking the token", async () => {
    const error = await graph.get('1', { fields: 'id' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GraphApiError);
    expect((error as GraphApiError).code).toBe(100);
    expect((error as GraphApiError).message).not.toContain(env.pageAccessToken);
  });

  it("returns Meta's error code 190 for an invalid token, without leaking it", async () => {
    const badToken = 'EAAinvalid-token-for-test';
    const badGraph = createGraphClient({ version: env.graphApiVersion, accessToken: badToken });

    const error = await badGraph.get(leadgenId, { fields: 'id' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GraphApiError);
    expect((error as GraphApiError).code).toBe(190);
    expect((error as GraphApiError).message).not.toContain(badToken);
  });
});
