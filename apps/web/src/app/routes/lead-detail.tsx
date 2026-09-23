import { ArrowLeftIcon, EnvelopeSimpleIcon, PhoneIcon, UserFocusIcon } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLead } from '@/features/leads/api';
import { ActivityTimeline } from '@/features/leads/components/activity-timeline';
import { ConflictBanner } from '@/features/leads/components/conflict-banner';
import { DetailList, DetailSection } from '@/features/leads/components/detail-section';
import { LeadActions } from '@/features/leads/components/lead-actions';
import { LeadAnswers } from '@/features/leads/components/lead-answers';
import { LeadAttribution } from '@/features/leads/components/lead-attribution';
import { LeadConsents } from '@/features/leads/components/lead-consents';
import { StatusBadge } from '@/features/leads/components/status-badge';
import type { LeadDetail } from '@/features/leads/types';
import { ApiError } from '@/lib/api-client';

function BackLink() {
  const location = useLocation();
  const backTo = (location.state as { backTo?: unknown } | null)?.backTo;
  // Only ever navigate to an in-app path.
  const target =
    typeof backTo === 'string' && backTo.startsWith('/') && !backTo.startsWith('//') ? backTo : '/';
  return (
    <Button asChild variant="ghost" className="-ml-2.5 w-fit text-muted-foreground">
      <Link to={target}>
        <ArrowLeftIcon aria-hidden />
        Leads
      </Link>
    </Button>
  );
}

function LeadHeader({ lead, actions }: { lead: LeadDetail; actions: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid min-w-0 gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {lead.fullName ?? 'Unnamed lead'}
          </h1>
          {/* Remounts on change, so the new status animates in. */}
          <StatusBadge
            key={lead.status}
            status={lead.status}
            className="animate-in duration-300 fade-in zoom-in-90"
          />
        </div>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {lead.email ? (
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <EnvelopeSimpleIcon aria-hidden className="size-4" />
              {lead.email}
            </a>
          ) : null}
          {lead.phone ? (
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <PhoneIcon aria-hidden className="size-4" />
              <span className="tabular">{lead.phone}</span>
            </a>
          ) : null}
        </p>
      </div>
      {actions}
    </header>
  );
}

function LeadDetails({ lead }: { lead: LeadDetail }) {
  return (
    <DetailSection title="Details">
      <DetailList
        items={[
          { label: 'Name', value: lead.fullName ?? '—' },
          { label: 'Email', value: lead.email ?? '—' },
          { label: 'Phone', value: lead.phone ?? '—' },
          { label: 'Assignee', value: lead.assignee ?? 'Unassigned' },
          {
            label: 'Notes',
            value: lead.notes ? <p className="whitespace-pre-line">{lead.notes}</p> : '—',
          },
        ]}
      />
    </DetailSection>
  );
}

function LeadDetailSkeleton() {
  return (
    <div aria-hidden className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid gap-4">
          <Skeleton className="h-44 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}

export function LeadDetailRoute() {
  const { id = '' } = useParams();
  const lead = useLead(id);

  if (lead.isPending) {
    return (
      <div className="grid gap-4">
        <BackLink />
        {lead.failureCount > 0 ? (
          <p role="status" className="text-sm text-muted-foreground">
            Waking up the server. This can take up to a minute on the free tier.
          </p>
        ) : null}
        <LeadDetailSkeleton />
      </div>
    );
  }

  if (lead.isError) {
    const notFound =
      lead.error instanceof ApiError && (lead.error.status === 404 || lead.error.status === 400);
    return (
      <div className="grid gap-4">
        <BackLink />
        {notFound ? (
          <EmptyState
            icon={UserFocusIcon}
            title="Lead not found"
            description="It may have been removed, or the link is wrong."
          />
        ) : (
          <ErrorState
            title="Couldn’t load this lead"
            error={lead.error}
            onRetry={() => void lead.refetch()}
          />
        )}
      </div>
    );
  }

  return <LeadPage lead={lead.data} reload={() => lead.refetch().then((r) => r.data)} />;
}

function LeadPage({
  lead,
  reload,
}: {
  lead: LeadDetail;
  reload: () => Promise<LeadDetail | undefined>;
}) {
  const [conflict, setConflict] = useState(false);
  const [reloading, setReloading] = useState(false);

  async function reloadAfterConflict() {
    setReloading(true);
    await reload();
    setReloading(false);
    setConflict(false);
  }

  return (
    <article className="grid gap-5">
      <title>{`${lead.fullName ?? 'Unnamed lead'} · Lead Intake`}</title>
      <BackLink />
      {conflict ? (
        <ConflictBanner onReload={() => void reloadAfterConflict()} reloading={reloading} />
      ) : null}
      <LeadHeader
        lead={lead}
        actions={<LeadActions lead={lead} reload={reload} onConflict={() => setConflict(true)} />}
      />
      {/* One grid, so on mobile the timeline follows Details instead of sinking below every
          section; on desktop it becomes a sticky right-hand column. */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <LeadDetails lead={lead} />
        <div className="lg:sticky lg:top-20 lg:col-start-2 lg:row-span-4 lg:row-start-1">
          <ActivityTimeline activities={lead.activities} />
        </div>
        <LeadAnswers fieldData={lead.fieldData} />
        <LeadConsents responses={lead.customDisclaimerResponses} />
        <LeadAttribution lead={lead} />
      </div>
    </article>
  );
}
