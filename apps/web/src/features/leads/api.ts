import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { apiRequest } from '@/lib/api-client';

import {
  LEAD_STATUSES,
  type EditableField,
  type LeadDetail,
  type LeadsPage,
  type LeadsQuery,
  type LeadStatus,
} from './types';

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

export type StatusCounts = Record<LeadStatus, number>;

/**
 * How many leads sit in each status under the current search and platform filters (the status
 * filter itself is ignored, so every tab shows its own count). The API has no aggregate
 * endpoint, so this asks for one row per status and reads `total`. Lives under the list key,
 * so any change to a lead refreshes it.
 */
export function useStatusCounts({ q, platform }: Pick<LeadsQuery, 'q' | 'platform'>) {
  return useQuery({
    queryKey: [...leadKeys.all, 'list', 'counts', { q, platform }] as const,
    queryFn: async ({ signal }) => {
      const totals = await Promise.all(
        LEAD_STATUSES.map((status) =>
          apiRequest<LeadsPage>('/leads', {
            query: { q, platform, status, page: 1, limit: 1 },
            signal,
          }).then((r) => r.total),
        ),
      );
      return Object.fromEntries(
        LEAD_STATUSES.map((status, i) => [status, totals[i] ?? 0]),
      ) as StatusCounts;
    },
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

export type EditableValues = Record<EditableField, string>;

function useLeadMutation<TVariables>(
  id: string,
  request: (variables: TVariables) => Promise<LeadDetail>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (lead) => {
      // The server returns the updated lead (with its new activity): no extra fetch needed.
      queryClient.setQueryData(leadKeys.detail(id), lead);
      void queryClient.invalidateQueries({ queryKey: ['leads', 'list'] });
    },
  });
}

/**
 * PATCH /leads/:id/status with the version the user last saw (optimistic locking).
 * The actor is passed per call, so a name entered just before saving is used immediately.
 */
export function useChangeStatus(id: string) {
  return useLeadMutation(
    id,
    ({ status, version, actor }: { status: LeadStatus; version: number; actor: string }) =>
      apiRequest<{ data: LeadDetail }>(`/leads/${id}/status`, {
        method: 'PATCH',
        body: { status, version },
        actor,
      }).then((r) => r.data),
  );
}

/** PATCH /leads/:id with the editable fields. Unchanged values are ignored by the server. */
export function useUpdateLead(id: string) {
  return useLeadMutation(
    id,
    ({ version, values, actor }: { version: number; values: EditableValues; actor: string }) =>
      apiRequest<{ data: LeadDetail }>(`/leads/${id}`, {
        method: 'PATCH',
        body: { version, ...values },
        actor,
      }).then((r) => r.data),
  );
}
