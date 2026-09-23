import { LEAD_STATUSES, PLATFORMS, type LeadsQuery, type LeadStatus, type Platform } from './types';

const isStatus = (value: string | null): value is LeadStatus =>
  LEAD_STATUSES.includes(value as LeadStatus);
const isPlatform = (value: string | null): value is Platform =>
  PLATFORMS.includes(value as Platform);

/**
 * Reads list filters from the URL so every view is shareable and survives reloads.
 * Unknown or malformed values are ignored rather than sent to the API.
 */
export function parseLeadsQuery(params: URLSearchParams): LeadsQuery {
  const status = params.get('status');
  const platform = params.get('platform');
  const q = params.get('q')?.trim();
  const page = Number(params.get('page'));
  return {
    ...(q ? { q } : {}),
    ...(isStatus(status) ? { status } : {}),
    ...(isPlatform(platform) ? { platform } : {}),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export type LeadsFilterPatch = Partial<Pick<LeadsQuery, 'q' | 'status' | 'platform'>>;

/** Applies filter changes. Changing any filter returns to page 1. */
export function withFilters(params: URLSearchParams, patch: LeadsFilterPatch): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(patch)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  next.delete('page');
  return next;
}

export function withPage(params: URLSearchParams, page: number): URLSearchParams {
  const next = new URLSearchParams(params);
  if (page > 1) next.set('page', String(page));
  else next.delete('page');
  return next;
}

export const hasFilters = (query: LeadsQuery) => Boolean(query.q ?? query.status ?? query.platform);
