import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  SpinnerIcon,
  XCircleIcon,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';

import type { LeadStatus } from '../types';
import { STATUS_LABELS } from './status-badge';

type StatusChangerProps = {
  status: LeadStatus;
  /** Server-computed next statuses (the API owns the workflow). */
  allowedTransitions: LeadStatus[];
  /** The status currently being saved, if any. */
  pendingStatus: LeadStatus | null;
  onChange: (status: LeadStatus) => void;
};

function label(from: LeadStatus, to: LeadStatus): string {
  if (to === 'LOST') return 'Mark as lost';
  if (from === 'LOST' && to === 'NEW') return 'Reopen';
  return `Move to ${STATUS_LABELS[to]}`;
}

/** One button per allowed next status: the forward step is primary, "lost" is secondary. */
export function StatusChanger({
  status,
  allowedTransitions,
  pendingStatus,
  onChange,
}: StatusChangerProps) {
  if (allowedTransitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{STATUS_LABELS[status]} is a final status.</p>
    );
  }

  const busy = pendingStatus !== null;
  return (
    <div role="group" aria-label="Change status" className="flex flex-wrap gap-2">
      {allowedTransitions.map((next) => {
        const isForward = next !== 'LOST' && status !== 'LOST';
        const Icon =
          pendingStatus === next
            ? SpinnerIcon
            : next === 'LOST'
              ? XCircleIcon
              : status === 'LOST'
                ? ArrowCounterClockwiseIcon
                : ArrowRightIcon;
        return (
          <Button
            key={next}
            variant={isForward ? 'default' : 'outline'}
            disabled={busy}
            aria-busy={pendingStatus === next}
            onClick={() => onChange(next)}
          >
            <Icon aria-hidden className={pendingStatus === next ? 'animate-spin' : undefined} />
            {label(status, next)}
          </Button>
        );
      })}
    </div>
  );
}
