import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiRequest } from '@/lib/api-client';
import type { LeadDetail, LeadsPage, LeadsQuery } from './types';

export const PAGE_SIZE = 20;

export const leadKeys = {
  all: ['leads'] as const,
  list: (query: LeadsQuery) => ['leads', 'list', query] as const,
  detail: (id: string) => ['leads', 'detail', id] as const,
};

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
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: ({ signal }) => apiRequest<{ data: LeadDetail }>(`/leads/${id}`, { signal }),
    select: (response) => response.data,
  });
}
