const GRAPH_BASE_URL = 'https://graph.facebook.com';
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * A failed Graph API call. Holds only Meta's error code, type and trace id, never Meta's
 * message text (it can echo request data) and never the access token, so it is safe to
 * log and to store as WebhookEvent.lastError.
 */
export class GraphApiError extends Error {
  constructor(
    readonly httpStatus: number | undefined,
    readonly code: number | undefined,
    readonly type: string | undefined,
    readonly fbtraceId: string | undefined,
  ) {
    const parts = [
      code === undefined ? 'network error' : `code ${code}`,
      type,
      httpStatus === undefined ? undefined : `http ${httpStatus}`,
      fbtraceId === undefined ? undefined : `fbtrace_id ${fbtraceId}`,
    ].filter(Boolean);
    super(`Graph API error: ${parts.join(', ')}`);
    this.name = 'GraphApiError';
  }
}

type GraphErrorBody = {
  error?: { code?: number; type?: string; fbtrace_id?: string };
};

type Params = Record<string, string>;

export type GraphClient = ReturnType<typeof createGraphClient>;

export function createGraphClient({
  version,
  accessToken,
}: {
  version: string;
  accessToken: string;
}) {
  async function call(method: 'GET' | 'POST' | 'DELETE', path: string, params: Params = {}) {
    const url = new URL(`${GRAPH_BASE_URL}/${version}/${path}`);
    const init: RequestInit = {
      method,
      // Token in a header, not the query string, so it never lands in URL logs.
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    };
    if (method === 'POST') {
      init.body = new URLSearchParams(params);
    } else {
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch {
      // Timeout / DNS / connection reset. The original error can include the URL; drop it.
      throw new GraphApiError(undefined, undefined, undefined, undefined);
    }

    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const error = (body as GraphErrorBody | undefined)?.error;
      throw new GraphApiError(response.status, error?.code, error?.type, error?.fbtrace_id);
    }
    return body;
  }

  return {
    get: (path: string, params?: Params) => call('GET', path, params),
    post: (path: string, params?: Params) => call('POST', path, params),
    delete: (path: string) => call('DELETE', path),
  };
}
