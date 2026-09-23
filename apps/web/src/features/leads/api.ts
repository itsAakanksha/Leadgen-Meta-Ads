import { keepPreviousData, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { apiRequest } from '@/lib/api-client';

import type { LeadDetail, LeadsPage, LeadsQuery } from './types';

export const PAGE_SIZE = 20;

export const leadKeys = {
  all: ['leads'] as const,
  list: (query: LeadsQuery) => ['leads', 'list', query] as const,
  detail: (id: string) => ['leads', 'detail', id] as const,
};

const leadDetailOptions = (id: string) =>
  queryOptions({
    queryKey: leadKeys.detail(id),
    queryFn: ({ signal }) =>
      apiRequest<{ data: LeadDetail }>(`/leads/${id}`, { signal }).then((r) => r.data),
  });

export function useLeads(query: LeadsQuery) {
  return useQuery({
    queryKey: leadKeys.list(query),
    queryFn: ({ signal }) =>
      apiRequest<LeadsPage>('/leads', { query: { ...query, limit: PAGE_SIZE }, signal }),
    // Keep showing the current page while the next one loads (no flash of skeletons).
    placeholderData: keepPreviousData,
  });
}

export function useLead(id: string) {
  return useQuery(leadDetailOptions(id));
}

/**
 * Starts loading a lead on hover/focus, so opening it feels instant. The result is cached
 * for the default stale time, so repeated hovers do not refetch.
 */
export function usePrefetchLead() {
  const queryClient = useQueryClient();
  return useCallback(
    (id: string) => {
      void queryClient.prefetchQuery(leadDetailOptions(id));
    },
    [queryClient],
  );
}
