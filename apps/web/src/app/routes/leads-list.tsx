import { ArrowClockwiseIcon, FunnelSimpleXIcon, TrayIcon } from '@phosphor-icons/react';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { PAGE_SIZE, useLeads, usePrefetchLead, useStatusCounts } from '@/features/leads/api';
import { LeadFilters, StatusTabs } from '@/features/leads/components/lead-filters';
import { LeadsTable, LeadsTableSkeleton } from '@/features/leads/components/leads-table';
import {
  hasFilters,
  parseLeadsQuery,
  withFilters,
  withPage,
  type LeadsFilterPatch,
} from '@/features/leads/leads-query';
import { formatDateTime, formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

import { loadLeadDetailRoute } from '../lazy-routes';

/** When the list was last loaded, with a manual refresh: new leads arrive from Meta at any time. */
function Freshness({
  updatedAt,
  refreshing,
  onRefresh,
}: {
  updatedAt: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const iso = updatedAt ? new Date(updatedAt).toISOString() : null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {/* The one perpetual motion in the app: leads arrive live. */}
      <span aria-hidden className="relative mr-0.5 flex size-2">
        <span className="absolute inset-0 animate-live rounded-full bg-primary" />
        <span className="relative size-2 rounded-full bg-primary" />
      </span>
      {iso ? (
        <span>
          Updated{' '}
          <time dateTime={iso} title={formatDateTime(iso)}>
            {formatRelative(iso)}
          </time>
        </span>
      ) : null}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Refresh leads"
        onClick={onRefresh}
        disabled={refreshing}
      >
        <ArrowClockwiseIcon aria-hidden className={cn(refreshing && 'animate-spin')} />
      </Button>
    </div>
  );
}

export function LeadsListRoute() {
  const [params, setParams] = useSearchParams();
  const query = parseLeadsQuery(params);
  const leads = useLeads(query);
  const counts = useStatusCounts({ q: query.q, platform: query.platform });
  const prefetchLead = usePrefetchLead();

  // Hovering or focusing a lead starts loading its page code and data before the click.
  const handleLeadIntent = (id: string) => {
    void loadLeadDetailRoute();
    prefetchLead(id);
  };

  // Functional updates read the latest URL, so a debounced search never overwrites a newer filter.
  const changeFilters = (patch: LeadsFilterPatch) =>
    setParams((current) => withFilters(current, patch), { replace: true });
  const clearFilters = () => setParams({}, { replace: true });
  const changePage = (page: number) => setParams((current) => withPage(current, page));
  const refresh = () => {
    void leads.refetch();
    void counts.refetch();
  };

  const total = leads.data?.total;
  const pageCount = total === undefined ? 0 : Math.ceil(total / PAGE_SIZE);

  return (
    <section aria-labelledby="leads-heading" className="grid gap-7">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="grid gap-1.5">
          <h1
            id="leads-heading"
            className="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] sm:text-[2rem]"
          >
            Leads
          </h1>
          <p className="text-sm text-muted-foreground">
            Leads received from Meta Lead Ads, with their audit trail.
          </p>
        </div>
        <Freshness
          updatedAt={leads.dataUpdatedAt}
          refreshing={leads.isFetching && !leads.isPending}
          onRefresh={refresh}
        />
      </header>

      {leads.isPending && leads.failureCount > 0 ? (
        <p
          role="status"
          className="flex w-fit items-center gap-2.5 rounded-full bg-card px-3.5 py-1.5 text-sm text-muted-foreground shadow-core"
        >
          <span aria-hidden className="relative flex size-2">
            <span className="absolute inset-0 animate-live rounded-full bg-warning-fg" />
            <span className="relative size-2 rounded-full bg-warning-fg" />
          </span>
          Waking up the server. This can take up to a minute on the free tier.
        </p>
      ) : null}

      {/* One view: status tabs, filters, results and paging share a single surface. */}
      <Surface className="animate-enter" coreClassName="overflow-hidden">
        <div className="grid gap-3 border-b border-hairline p-3 sm:p-4">
          <StatusTabs
            value={query.status}
            counts={counts.data}
            onChange={(status) => changeFilters({ status })}
          />
          <LeadFilters query={query} onChange={changeFilters} onClear={clearFilters} />
        </div>

        {/* Announces result changes to screen readers without moving focus. */}
        <p aria-live="polite" className="sr-only">
          {total === undefined ? '' : `${total} ${total === 1 ? 'lead' : 'leads'} found`}
        </p>

        {leads.isPending ? (
          <LeadsTableSkeleton />
        ) : leads.isError && !leads.data ? (
          <ErrorState
            title="Couldn’t load leads"
            error={leads.error}
            onRetry={() => void leads.refetch()}
            className="rounded-none border-0 shadow-none"
          />
        ) : leads.data.total === 0 ? (
          hasFilters(query) ? (
            <EmptyState
              icon={FunnelSimpleXIcon}
              title="No leads match these filters"
              description="Try a different search, or clear the filters to see every lead."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
              className="rounded-none border-0"
            />
          ) : (
            <EmptyState
              icon={TrayIcon}
              title="No leads yet"
              description="Leads appear here a few seconds after someone submits a Meta lead form."
              className="rounded-none border-0"
            />
          )
        ) : (
          <div
            aria-busy={leads.isPlaceholderData}
            className={cn('transition-opacity', leads.isPlaceholderData && 'opacity-60')}
          >
            <LeadsTable leads={leads.data.data} onLeadIntent={handleLeadIntent} />
            <footer className="flex min-h-12 items-center border-t border-hairline bg-surface-subtle/60 px-4 py-2 sm:px-5">
              {pageCount > 1 ? (
                <div className="w-full">
                  <Pagination
                    page={query.page}
                    pageSize={PAGE_SIZE}
                    total={leads.data.total}
                    onPageChange={changePage}
                  />
                </div>
              ) : (
                <p className="tabular text-sm text-muted-foreground">
                  {leads.data.total} {leads.data.total === 1 ? 'lead' : 'leads'}
                </p>
              )}
            </footer>
          </div>
        )}
      </Surface>
    </section>
  );
}
