import {
  ArrowLeftIcon,
  CaretRightIcon,
  EnvelopeSimpleIcon,
  IdentificationCardIcon,
  PhoneIcon,
  SpinnerIcon,
  UserFocusIcon,
} from '@phosphor-icons/react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Skeleton } from '@/components/ui/skeleton';
import { useLead } from '@/features/leads/api';
import { ActivityTimeline } from '@/features/leads/components/activity-timeline';
import { ConflictBanner } from '@/features/leads/components/conflict-banner';
import { DetailList, DetailSection, Empty } from '@/features/leads/components/detail-section';
import { LeadActions } from '@/features/leads/components/lead-actions';
import { LeadAnswers } from '@/features/leads/components/lead-answers';
import { LeadAttribution } from '@/features/leads/components/lead-attribution';
import { LeadAvatar } from '@/features/leads/components/lead-avatar';
import { LeadConsents } from '@/features/leads/components/lead-consents';
import { PlatformIcon } from '@/features/leads/components/platform-icon';
import { StatusBadge } from '@/features/leads/components/status-badge';
import { StatusPipeline } from '@/features/leads/components/status-pipeline';
import { sourceLabel } from '@/features/leads/source-label';
import type { LeadDetail } from '@/features/leads/types';
import { ApiError } from '@/lib/api-client';
import { formatDateTime, formatRelative } from '@/lib/format';

/** Position in the entrance sequence (see the `stagger` utility). */
const order = (i: number) => ({ '--i': i }) as CSSProperties;

function Breadcrumb({ current }: { current?: string }) {
  const location = useLocation();
  const backTo = (location.state as { backTo?: unknown } | null)?.backTo;
  // Only ever navigate to an in-app path.
  const target =
    typeof backTo === 'string' && backTo.startsWith('/') && !backTo.startsWith('//') ? backTo : '/';
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to={target}>
          <ArrowLeftIcon aria-hidden />
          Leads
        </Link>
      </Button>
      {current ? (
        <>
          <CaretRightIcon aria-hidden className="size-3 shrink-0 text-muted-foreground" />
          <span aria-current="page" className="truncate px-1 font-medium">
            {current}
          </span>
        </>
      ) : null}
    </nav>
  );
}

const inlineLink =
  'inline-flex min-w-0 items-center gap-1.5 rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring';

function ContactLine({ lead }: { lead: LeadDetail }) {
  if (!lead.email && !lead.phone) return null;
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {lead.email ? (
        <a href={`mailto:${lead.email}`} className={inlineLink}>
          <EnvelopeSimpleIcon aria-hidden className="size-4 shrink-0" />
          <span className="truncate">{lead.email}</span>
        </a>
      ) : null}
      {lead.phone ? (
        <a href={`tel:${lead.phone}`} className={inlineLink}>
          <PhoneIcon aria-hidden className="size-4 shrink-0" />
          <span className="tabular">{lead.phone}</span>
        </a>
      ) : null}
    </p>
  );
}

function SourceLine({ lead }: { lead: LeadDetail }) {
  const submitted = lead.metaCreatedAt ?? lead.createdAt;
  const dot = <span aria-hidden>·</span>;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
        <PlatformIcon platform={lead.platform} />
        {sourceLabel(lead.platform, lead.isOrganic)}
      </span>
      {lead.campaignName ? (
        <>
          {dot}
          <span className="max-w-64 truncate">{lead.campaignName}</span>
        </>
      ) : null}
      {dot}
      <span>
        Submitted{' '}
        <time dateTime={submitted} title={formatDateTime(submitted)} className="tabular">
          {formatRelative(submitted)}
        </time>
      </span>
    </p>
  );
}

/** WHO, then STATUS, then SOURCE, then the actions — in reading order. */
function LeadHeader({ lead, actions }: { lead: LeadDetail; actions: ReactNode }) {
  return (
    <header className="grid gap-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
          <LeadAvatar name={lead.fullName} size="lg" />
          <div className="grid min-w-0 gap-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="min-w-0 text-[1.625rem] leading-tight font-semibold tracking-[-0.025em] break-words sm:text-[2rem]">
                {lead.fullName ?? 'Unnamed lead'}
              </h1>
              {/* Remounts on change, so the new status animates in. */}
              <StatusBadge
                key={lead.status}
                status={lead.status}
                className="animate-in duration-300 fade-in zoom-in-90"
              />
            </div>
            <ContactLine lead={lead} />
            <SourceLine lead={lead} />
          </div>
        </div>
        {actions}
      </div>
      <StatusPipeline status={lead.status} />
    </header>
  );
}

function LeadDetails({ lead }: { lead: LeadDetail }) {
  return (
    <DetailSection title="Details" icon={IdentificationCardIcon}>
      <DetailList
        items={[
          { label: 'Name', value: lead.fullName ?? <Empty /> },
          { label: 'Email', value: lead.email ?? <Empty /> },
          {
            label: 'Phone',
            value: lead.phone ? <span className="tabular">{lead.phone}</span> : <Empty />,
          },
          { label: 'Assignee', value: lead.assignee ?? <Empty>Unassigned</Empty> },
          {
            label: 'Notes',
            value: lead.notes ? <p className="whitespace-pre-line">{lead.notes}</p> : <Empty />,
          },
        ]}
      />
    </DetailSection>
  );
}

/** Same shape as the loaded page, so nothing jumps when data lands. */
function LeadDetailSkeleton() {
  return (
    <div aria-hidden className="grid gap-6">
      <div className="flex items-start gap-4">
        <Skeleton className="size-12 rounded-[30%] sm:size-14" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-3.5 w-60 max-w-full" />
        </div>
        <Skeleton className="hidden h-9 w-64 md:block" />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-1 rounded-full" />
        ))}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Surface coreClassName="grid gap-3 p-5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-5" />
          ))}
        </Surface>
        <Surface coreClassName="grid gap-5 p-5">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-7 rounded-[30%]" />
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </Surface>
      </div>
    </div>
  );
}

export function LeadDetailRoute() {
  const { id = '' } = useParams();
  const lead = useLead(id);

  if (lead.isPending) {
    return (
      <div className="grid gap-5">
        <Breadcrumb />
        {lead.failureCount > 0 ? (
          <p
            role="status"
            className="flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground shadow-panel"
          >
            <SpinnerIcon aria-hidden className="size-3.5 animate-spin" />
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
      <div className="grid gap-5">
        <Breadcrumb />
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
  const name = lead.fullName ?? 'Unnamed lead';

  async function reloadAfterConflict() {
    setReloading(true);
    await reload();
    setReloading(false);
    setConflict(false);
  }

  return (
    <article className="grid gap-6">
      <title>{`${name} · Lead Intake`}</title>
      <Breadcrumb current={name} />
      {conflict ? (
        <ConflictBanner onReload={() => void reloadAfterConflict()} reloading={reloading} />
      ) : null}
      <LeadHeader
        lead={lead}
        actions={<LeadActions lead={lead} reload={reload} onConflict={() => setConflict(true)} />}
      />
      {/* The record reads top to bottom; history sits beside it on desktop (sticky) and after
          it on smaller screens. */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Surface className="stagger animate-enter" coreClassName="divide-y divide-hairline">
          <LeadDetails lead={lead} />
          <LeadAnswers fieldData={lead.fieldData} />
          <LeadConsents responses={lead.customDisclaimerResponses} />
          <LeadAttribution lead={lead} />
        </Surface>
        <div style={order(2)} className="stagger animate-enter lg:sticky lg:top-6">
          <Surface coreClassName="lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto">
            <ActivityTimeline activities={lead.activities} />
          </Surface>
        </div>
      </div>
    </article>
  );
}
