/** Same-origin prefix. Vite (dev) and Vercel (prod) forward /api/* to the Express API. */
const API_BASE = '/api';

/** An API failure, carrying the server's error envelope: { error: { code, message, details } }. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Worth retrying: network failure, or the server is (re)starting / overloaded. */
  get isRetryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

type ErrorEnvelope = { error?: { code?: string; message?: string; details?: unknown } };

/** Builds an ApiError from a non-2xx response body (which may not be JSON, e.g. a proxy page). */
export function toApiError(status: number, body: unknown): ApiError {
  const error = (body as ErrorEnvelope | null)?.error;
  return new ApiError(
    status,
    error?.code ?? 'HTTP_ERROR',
    error?.message ?? `Request failed (${status})`,
    error?.details,
  );
}

/**
 * Header value for X-Actor. Browsers only allow ASCII in header values, so the display name
 * is URI-encoded; the API decodes it.
 */
export function actorHeader(actor: string | null): Record<string, string> {
  const name = actor?.trim();
  return name ? { 'X-Actor': encodeURIComponent(name) } : {};
}

type RequestOptions = {
  method?: 'GET' | 'PATCH';
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  actor?: string | null;
  signal?: AbortSignal;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...actorHeader(options.actor ?? null),
      },
      body: options.body === undefined ? null : JSON.stringify(options.body),
      signal: options.signal ?? null,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw toApiError(response.status, body);
  return body as T;
}
