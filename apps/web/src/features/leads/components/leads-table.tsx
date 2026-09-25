import { CaretRightIcon } from '@phosphor-icons/react';
import { Link, useLocation } from 'react-router';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime, formatRelative } from '@/lib/format';

import { sourceLabel } from '../source-label';
import type { LeadSummary } from '../types';
import { LeadAvatar } from './lead-avatar';
import { PlatformIcon } from './platform-icon';
import { StatusBadge } from './status-badge';

const displayName = (lead: LeadSummary) => lead.fullName ?? 'Unnamed lead';
const contactLine = (lead: LeadSummary) => lead.email ?? lead.phone ?? 'No contact details';
const submittedIso = (lead: LeadSummary) => lead.metaCreatedAt ?? lead.createdAt;

const COLUMNS = ['Lead', 'Status', 'Source', 'Campaign', 'Submitted'] as const;

/**
 * Table on wide screens, stacked list on narrow ones. Each lead links to its detail page.
 * Borderless: it sits inside the list's view panel.
 */
export function LeadsTable({
  leads,
  onLeadIntent,
}: {
  leads: LeadSummary[];
  /** Hover/focus on a lead: a hint to start loading it. */
  onLeadIntent?: (id: string) => void;
}) {
  // Remember the filtered list URL so "Back to leads" returns to the same view.
  const location = useLocation();
  const linkState = { backTo: `${location.pathname}${location.search}` };

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-hairline hover:bg-transparent">
              {COLUMNS.map((column) => (
                <TableHead
                  key={column}
                  className="h-10 text-xs font-medium text-muted-foreground first:pl-5 last:pr-5"
                >
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead, index) => (
              // The name link is stretched over the row: the whole row is clickable, yet it
              // stays one properly labelled link for keyboard and screen-reader users.
              <TableRow
                key={lead.id}
                style={{ '--i': Math.min(index, 10) } as React.CSSProperties}
                className="group stagger relative animate-enter border-hairline transition-colors focus-within:bg-muted/60 hover:bg-surface-subtle"
              >
                <TableCell className="py-3 pl-5">
                  <div className="flex items-center gap-3">
                    <LeadAvatar name={lead.fullName} />
                    <div className="min-w-0">
                      <Link
                        to={`/leads/${lead.id}`}
                        state={linkState}
                        onMouseEnter={() => onLeadIntent?.(lead.id)}
                        onFocus={() => onLeadIntent?.(lead.id)}
                        className="block max-w-80 truncate font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                      >
                        {displayName(lead)}
                      </Link>
                      <div className="max-w-80 truncate text-xs text-muted-foreground">
                        {contactLine(lead)}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <PlatformIcon platform={lead.platform} />
                    <span className="text-foreground">
                      {sourceLabel(lead.platform, lead.isOrganic)}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="max-w-48 truncate">
                  {lead.campaignName ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="relative pr-12">
                  <time
                    dateTime={submittedIso(lead)}
                    title={formatDateTime(submittedIso(lead))}
                    className="tabular grid"
                  >
                    <span>{formatRelative(submittedIso(lead))}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(submittedIso(lead))}
                    </span>
                  </time>
                  <CaretRightIcon
                    aria-hidden
                    className="absolute top-1/2 right-4 box-content size-3.5 -translate-x-1 -translate-y-1/2 rounded-full bg-card p-1.5 text-muted-foreground opacity-0 shadow-control transition-[opacity,transform] duration-300 group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:translate-x-0 group-hover:opacity-100"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y divide-hairline md:hidden">
        {leads.map((lead) => (
          <li key={lead.id}>
            <Link
              to={`/leads/${lead.id}`}
              state={linkState}
              onTouchStart={() => onLeadIntent?.(lead.id)}
              onFocus={() => onLeadIntent?.(lead.id)}
              className="flex gap-3 px-4 py-3.5 outline-none focus-visible:bg-muted/60 active:bg-muted/60"
            >
              <LeadAvatar name={lead.fullName} className="mt-0.5" />
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="flex min-w-0 items-center justify-between gap-3">
                  <span className="truncate font-medium">{displayName(lead)}</span>
                  <StatusBadge status={lead.status} />
                </span>
                <span className="truncate text-sm text-muted-foreground">{contactLine(lead)}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PlatformIcon platform={lead.platform} className="size-3" />
                  {sourceLabel(lead.platform, lead.isOrganic)} ·{' '}
                  <time
                    dateTime={submittedIso(lead)}
                    title={formatDateTime(submittedIso(lead))}
                    className="tabular"
                  >
                    {formatRelative(submittedIso(lead))}
                  </time>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Loading placeholder with the same shape as the table, so nothing jumps when data lands. */
export function LeadsTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-hidden>
      <div className="hidden h-10 border-b border-hairline md:block" />
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-6 border-b border-hairline px-4 py-3.5 last:border-b-0 md:px-5"
        >
          <Skeleton className="size-8 shrink-0 rounded-[30%]" />
          <div className="-ml-3 grid flex-1 gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="hidden h-4 w-28 md:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="hidden h-8 w-32 md:block" />
        </div>
      ))}
    </div>
  );
}
