import {
  ArrowRightIcon,
  ArrowsLeftRightIcon,
  PencilSimpleLineIcon,
  SparkleIcon,
  type Icon,
} from '@phosphor-icons/react';

import { formatDateTime, formatRelative } from '@/lib/format';

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
    <dl className="mt-2 grid gap-1.5 rounded-md bg-muted/60 px-3 py-2 text-sm">
      {entries.map(([field, change]) => (
        <div key={field} className="grid gap-0.5 sm:grid-cols-[6rem_1fr]">
          <dt className="text-muted-foreground">{FIELD_LABELS[field]}</dt>
          <dd className="flex min-w-0 flex-wrap items-center gap-1.5 break-words">
            <Value value={change.from} previous />
            <ArrowRightIcon aria-label="changed to" className="size-3.5 shrink-0" />
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
      return <p>Lead received from a Meta lead form</p>;
    case 'STATUS_CHANGED':
      return (
        <p className="flex flex-wrap items-center gap-1.5">
          Status changed
          <StatusBadge status={activity.payload.from} />
          <ArrowRightIcon aria-label="to" className="size-3.5" />
          <StatusBadge status={activity.payload.to} />
        </p>
      );
    case 'LEAD_UPDATED': {
      const count = Object.keys(activity.payload.changes).length;
      return (
        <>
          <p>
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
    <DetailSection title="Activity">
      <ol className="relative grid gap-5">
        {newestFirst.map((activity) => {
          const ActivityIcon = ICONS[activity.type];
          return (
            <li key={activity.id} className="animate-enter relative flex gap-3">
              <span
                aria-hidden
                className="relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border bg-card text-muted-foreground"
              >
                <ActivityIcon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <Description activity={activity} />
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{formatActor(activity.actor)}</span>
                  {' · '}
                  <time dateTime={activity.createdAt} title={formatDateTime(activity.createdAt)}>
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
