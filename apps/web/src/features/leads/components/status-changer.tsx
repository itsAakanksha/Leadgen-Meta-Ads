import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  SpinnerIcon,
  XCircleIcon,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      <p className="flex h-9 items-center text-sm text-muted-foreground">
        {STATUS_LABELS[status]} is a final status.
      </p>
    );
  }

  const busy = pendingStatus !== null;
  return (
    <div role="group" aria-label="Change status" className="flex min-w-0 flex-1 gap-2 sm:flex-none">
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
        const pending = pendingStatus === next;
        return (
          <Button
            key={next}
            variant={isForward ? 'default' : 'outline'}
            size="lg"
            className={cn(
              'h-10 px-4 max-sm:px-3',
              isForward && 'flex-1 pr-1.5 pl-4.5 sm:flex-none',
              next === 'LOST' && 'hover:text-destructive',
            )}
            disabled={busy}
            aria-busy={pending}
            onClick={() => onChange(next)}
          >
            {isForward ? null : (
              <Icon aria-hidden className={pending ? 'animate-spin' : undefined} />
            )}
            {/* Secondary actions go icon-only on phones so the row fits; the label stays for AT. */}
            <span className={isForward ? undefined : 'max-sm:sr-only'}>{label(status, next)}</span>
            {isForward ? (
              <span
                aria-hidden
                className="ml-1.5 grid size-7 place-items-center rounded-full bg-white/15 transition-transform duration-300 group-hover/button:translate-x-0.5"
              >
                <Icon weight="bold" className={cn('size-3.5!', pending && 'animate-spin')} />
              </span>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}
