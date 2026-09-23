import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './api-client';

const MAX_RETRIES = 4;

/** Retry network errors and 5xx (the free API host cold-starts in ~50s); never retry 4xx. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_RETRIES && error instanceof ApiError && error.isRetryable;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: (attempt) => Math.min(2_000 * 2 ** attempt, 20_000),
        staleTime: 10_000,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  });
}
