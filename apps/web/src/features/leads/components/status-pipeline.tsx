import { CheckIcon } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';

import type { LeadStatus } from '../types';
import { STATUS_LABELS } from './status-badge';

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED'] as const satisfies LeadStatus[];

/**
 * Where the lead sits in the sales workflow. The status badge carries the meaning; this adds
 * the sense of progress. A lost lead dims the whole track instead of pointing at a stage.
 */
export function StatusPipeline({ status }: { status: LeadStatus }) {
  const lost = status === 'LOST';
  const current = STAGES.indexOf(status as (typeof STAGES)[number]);

  return (
    <ol aria-label="Pipeline" className={cn('grid grid-cols-4 gap-2', lost && 'opacity-60')}>
      {STAGES.map((stage, index) => {
        const done = !lost && index < current;
        const active = index === current;
        return (
          <li key={stage} aria-current={active ? 'step' : undefined} className="grid gap-2">
            <span aria-hidden className="relative flex h-2.5 items-center">
              <span className="h-0.5 w-full overflow-hidden rounded-full bg-foreground/10">
                <span
                  className={cn(
                    'block h-full origin-left rounded-full bg-primary transition-transform duration-700',
                    done || active ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </span>
              {active ? (
                <span className="absolute left-0 size-2.5 animate-in rounded-full bg-card ring-2 ring-primary duration-500 zoom-in-50" />
              ) : null}
            </span>
            <span
              className={cn(
                'flex min-w-0 items-center gap-1 text-xs',
                active ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {done ? (
                <CheckIcon aria-hidden weight="bold" className="size-3 text-primary" />
              ) : null}
              <span className="truncate">{STATUS_LABELS[stage]}</span>
              {done ? <span className="sr-only">(done)</span> : null}
              {active ? <span className="sr-only">(current)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
