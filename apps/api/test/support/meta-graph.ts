import { createGraphClient, type GraphClient } from '../../src/lib/graph-client.js';

export type MetaTestEnv = {
  pageAccessToken: string;
  graphApiVersion: string;
  testFormId: string;
};

/**
 * Tests that talk to the real Graph API need real credentials. Missing ones fail the run
 * loudly instead of silently skipping, so a green suite always means Meta was exercised.
 */
export function requireMetaTestEnv(): MetaTestEnv {
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const testFormId = process.env.META_TEST_FORM_ID;
  const missing = [
    !pageAccessToken && 'META_PAGE_ACCESS_TOKEN',
    !testFormId && 'META_TEST_FORM_ID',
  ].filter(Boolean);
  if (!pageAccessToken || !testFormId) {
    throw new Error(
      `Real Meta Graph API tests need ${missing.join(', ')} in apps/api/.env (see README "Meta setup").`,
    );
  }
  return {
    pageAccessToken,
    testFormId,
    graphApiVersion: process.env.GRAPH_API_VERSION ?? 'v25.0',
  };
}

export function createTestGraphClient(env: MetaTestEnv): GraphClient {
  return createGraphClient({ version: env.graphApiVersion, accessToken: env.pageAccessToken });
}

/** Answers submitted with the test lead. Real submission through Meta's test_leads API. */
export const TEST_LEAD_FIELD_DATA = [
  { name: 'full_name', values: ['Integration Test Lead'] },
  { name: 'email', values: ['integration-test@example.com'] },
  { name: 'phone_number', values: ['+15555550100'] },
];

/**
 * Creates a fresh real lead on the test form via POST /{form_id}/test_leads.
 * Meta allows one test lead per form, so any existing one is deleted first.
 * Returns the new leadgen ID.
 */
export async function recreateTestLead(graph: GraphClient, formId: string): Promise<string> {
  const existing = (await graph.get(`${formId}/test_leads`, { fields: 'id' })) as {
    data?: { id: string }[];
  };
  for (const lead of existing.data ?? []) {
    await graph.delete(lead.id);
  }
  const created = (await graph.post(`${formId}/test_leads`, {
    field_data: JSON.stringify(TEST_LEAD_FIELD_DATA),
  })) as { id: string };
  return created.id;
}
