import { recreateTestLead as recreateMetaTestLead } from '../../scripts/meta-dev-tools.js';
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

/** Creates a fresh real lead on the test form (Meta test_leads API). Returns its leadgen ID. */
export function recreateTestLead(graph: GraphClient, formId: string): Promise<string> {
  return recreateMetaTestLead(graph, formId, TEST_LEAD_FIELD_DATA);
}
