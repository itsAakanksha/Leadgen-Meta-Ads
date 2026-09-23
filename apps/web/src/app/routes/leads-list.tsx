import { FunnelSimpleXIcon, TrayIcon } from '@phosphor-icons/react';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { PAGE_SIZE, useLeads, usePrefetchLead } from '@/features/leads/api';
import { LeadFilters } from '@/features/leads/components/lead-filters';
import { LeadsTable, LeadsTableSkeleton } from '@/features/leads/components/leads-table';
import {
  hasFilters,
  parseLeadsQuery,
  withFilters,
  withPage,
  type LeadsFilterPatch,
} from '@/features/leads/leads-query';
import { cn } from '@/lib/utils';

import { loadLeadDetailRoute } from '../lazy-routes';

export function LeadsListRoute() {
  const [params, setParams] = useSearchParams();
  const query = parseLeadsQuery(params);
  const leads = useLeads(query);
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

  const total = leads.data?.total;

  return (
    <section aria-labelledby="leads-heading" className="grid gap-5">
      <header className="flex items-baseline gap-2">
        <h1 id="leads-heading" className="text-xl font-semibold tracking-tight">
          Leads
        </h1>
        {total === undefined ? null : (
          <span className="tabular text-sm text-muted-foreground">{total}</span>
        )}
      </header>

      <LeadFilters query={query} onChange={changeFilters} onClear={clearFilters} />

      {/* Announces result changes to screen readers without moving focus. */}
      <p aria-live="polite" className="sr-only">
        {total === undefined ? '' : `${total} ${total === 1 ? 'lead' : 'leads'} found`}
      </p>

      {leads.isPending ? (
        <div className="grid gap-2">
          {leads.failureCount > 0 ? (
            <p role="status" className="text-sm text-muted-foreground">
              Waking up the server. This can take up to a minute on the free tier.
            </p>
          ) : null}
          <LeadsTableSkeleton />
        </div>
      ) : leads.isError && !leads.data ? (
        <ErrorState
          title="Couldn’t load leads"
          error={leads.error}
          onRetry={() => void leads.refetch()}
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
          />
        ) : (
          <EmptyState
            icon={TrayIcon}
            title="No leads yet"
            description="Leads appear here a few seconds after someone submits a Meta lead form."
          />
        )
      ) : (
        <div
          aria-busy={leads.isPlaceholderData}
          className={cn('grid gap-4 transition-opacity', leads.isPlaceholderData && 'opacity-60')}
        >
          <LeadsTable leads={leads.data.data} onLeadIntent={handleLeadIntent} />
          <Pagination
            page={query.page}
            pageSize={PAGE_SIZE}
            total={leads.data.total}
            onPageChange={changePage}
          />
        </div>
      )}
    </section>
  );
}
