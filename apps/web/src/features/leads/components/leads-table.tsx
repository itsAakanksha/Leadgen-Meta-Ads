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
import { formatDateTime } from '@/lib/format';

import { sourceLabel } from '../source-label';
import type { LeadSummary } from '../types';
import { StatusBadge } from './status-badge';

const displayName = (lead: LeadSummary) => lead.fullName ?? 'Unnamed lead';
const contactLine = (lead: LeadSummary) => lead.email ?? lead.phone ?? 'No contact details';
const submittedAt = (lead: LeadSummary) => formatDateTime(lead.metaCreatedAt ?? lead.createdAt);

const COLUMNS = ['Lead', 'Status', 'Source', 'Campaign', 'Submitted'] as const;

/** Table on wide screens, stacked list on narrow ones. Each lead links to its detail page. */
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
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map((column) => (
                <TableHead key={column} className="text-xs text-muted-foreground">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              // The name link is stretched over the row: the whole row is clickable, yet it
              // stays one properly labelled link for keyboard and screen-reader users.
              <TableRow key={lead.id} className="relative focus-within:bg-muted/50">
                <TableCell className="py-3">
                  <Link
                    to={`/leads/${lead.id}`}
                    state={linkState}
                    onMouseEnter={() => onLeadIntent?.(lead.id)}
                    onFocus={() => onLeadIntent?.(lead.id)}
                    className="font-medium outline-none after:absolute after:inset-0 after:rounded-sm focus-visible:after:ring-2 focus-visible:after:ring-ring"
                  >
                    {displayName(lead)}
                  </Link>
                  <div className="text-muted-foreground">{contactLine(lead)}</div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell>{sourceLabel(lead.platform, lead.isOrganic)}</TableCell>
                <TableCell className="max-w-48 truncate">{lead.campaignName ?? '—'}</TableCell>
                <TableCell className="tabular font-mono text-xs text-muted-foreground">
                  {submittedAt(lead)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y rounded-lg border bg-card md:hidden">
        {leads.map((lead) => (
          <li key={lead.id}>
            <Link
              to={`/leads/${lead.id}`}
              state={linkState}
              onTouchStart={() => onLeadIntent?.(lead.id)}
              onFocus={() => onLeadIntent?.(lead.id)}
              className="grid gap-1 px-4 py-3 outline-none focus-visible:bg-muted/50 active:bg-muted/50"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="truncate font-medium">{displayName(lead)}</span>
                <StatusBadge status={lead.status} />
              </span>
              <span className="truncate text-sm text-muted-foreground">{contactLine(lead)}</span>
              <span className="text-xs text-muted-foreground">
                {sourceLabel(lead.platform, lead.isOrganic)} ·{' '}
                <span className="tabular font-mono">{submittedAt(lead)}</span>
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
    <div aria-hidden className="rounded-lg border bg-card">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-6 border-b px-4 py-3.5 last:border-b-0">
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="hidden h-4 w-28 md:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="hidden h-3.5 w-32 md:block" />
        </div>
      ))}
    </div>
  );
}
