import {
  ArrowRightIcon,
  ArrowsLeftRightIcon,
  ClockCounterClockwiseIcon,
  PencilSimpleLineIcon,
  SparkleIcon,
  type Icon,
} from '@phosphor-icons/react';
import type { CSSProperties } from 'react';

import { formatDateTime, formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

import { formatActor } from '../format-actor';
import type { EditableField, FieldChange, LeadActivity } from '../types';
import { DetailSection } from './detail-section';
import { StatusBadge } from './status-badge';

const FIELD_LABELS: Record<EditableField, string> = {
  fullName: 'Name',
  email: 'Email',
  phone: 'Phone',
  notes: 'Notes',
  assignee: 'Assignee',
};

const ICONS: Record<LeadActivity['type'], Icon> = {
  LEAD_CREATED: SparkleIcon,
  STATUS_CHANGED: ArrowsLeftRightIcon,
  LEAD_UPDATED: PencilSimpleLineIcon,
};

// Tint says what kind of event it was at a glance; the sentence next to it says it in words.
const TONES: Record<LeadActivity['type'], string> = {
  LEAD_CREATED: 'bg-(--status-converted-bg) text-(--status-converted-fg)',
  STATUS_CHANGED: 'bg-(--status-qualified-bg) text-(--status-qualified-fg)',
  LEAD_UPDATED: 'bg-muted text-muted-foreground',
};

function Value({ value, previous }: { value: string | null; previous?: boolean }) {
  if (value === null) return <span className="text-muted-foreground italic">empty</span>;
  return previous ? (
    <del className="text-muted-foreground decoration-muted-foreground/60">{value}</del>
  ) : (
    <ins className="no-underline">{value}</ins>
  );
}

function FieldDiff({ changes }: { changes: Partial<Record<EditableField, FieldChange>> }) {
  const entries = Object.entries(changes) as [EditableField, FieldChange][];
  return (
    <dl className="mt-2 grid gap-1.5 rounded-lg border border-hairline bg-surface-subtle px-3 py-2.5 text-[13px]">
      {entries.map(([field, change]) => (
        <div key={field} className="grid gap-0.5 sm:grid-cols-[5rem_minmax(0,1fr)]">
          <dt className="text-muted-foreground">{FIELD_LABELS[field]}</dt>
          <dd className="flex min-w-0 flex-wrap items-center gap-1.5 break-words">
            <Value value={change.from} previous />
            <ArrowRightIcon
              aria-label="changed to"
              className="size-3 shrink-0 text-muted-foreground"
            />
            <Value value={change.to} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Description({ activity }: { activity: LeadActivity }) {
  switch (activity.type) {
    case 'LEAD_CREATED':
      return <p className="font-medium">Lead received from a Meta lead form</p>;
    case 'STATUS_CHANGED':
      return (
        <p className="flex flex-wrap items-center gap-1.5 font-medium">
          Status changed
          <StatusBadge status={activity.payload.from} />
          <ArrowRightIcon aria-label="to" className="size-3 text-muted-foreground" />
          <StatusBadge status={activity.payload.to} />
        </p>
      );
    case 'LEAD_UPDATED': {
      const count = Object.keys(activity.payload.changes).length;
      return (
        <>
          <p className="font-medium">
            Updated {count} {count === 1 ? 'field' : 'fields'}
          </p>
          <FieldDiff changes={activity.payload.changes} />
        </>
      );
    }
  }
}

/** The audit trail, newest first. Every entry says what changed, who did it and when. */
export function ActivityTimeline({ activities }: { activities: LeadActivity[] }) {
  // The API returns history oldest-first; show the latest change at the top.
  const newestFirst = activities.toReversed();

  return (
    <DetailSection title="Activity" icon={ClockCounterClockwiseIcon} meta={activities.length}>
      {/* The rail runs through the centre of the 28px icons (left 14px). */}
      <ol className="relative mt-3 grid gap-5 before:absolute before:top-3 before:bottom-3 before:left-3.5 before:w-px before:-translate-x-1/2 before:bg-linear-to-b before:from-border before:via-border before:to-transparent">
        {newestFirst.map((activity, index) => {
          const ActivityIcon = ICONS[activity.type];
          return (
            <li
              key={activity.id}
              style={{ '--i': Math.min(index, 8) } as CSSProperties}
              className="stagger relative flex animate-enter gap-3"
            >
              <span
                aria-hidden
                className={cn(
                  'relative z-10 grid size-7 shrink-0 place-items-center rounded-[30%] ring-4 ring-card',
                  TONES[activity.type],
                )}
              >
                <ActivityIcon weight="bold" className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1 pt-1 text-sm">
                <Description activity={activity} />
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{formatActor(activity.actor)}</span>
                  <span className="mx-1.5">·</span>
                  <time
                    dateTime={activity.createdAt}
                    title={formatDateTime(activity.createdAt)}
                    className="tabular"
                  >
                    {formatRelative(activity.createdAt)}
                  </time>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </DetailSection>
  );
}
