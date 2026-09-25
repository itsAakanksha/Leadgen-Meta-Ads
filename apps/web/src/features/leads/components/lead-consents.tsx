import { CheckCircleIcon, MinusCircleIcon, ShieldCheckIcon } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';

import { humanizeKey } from '../humanize-key';
import type { DisclaimerResponse } from '../types';
import { DetailSection } from './detail-section';

/** Custom disclaimer checkboxes: evidence of what the person agreed to. */
export function LeadConsents({ responses }: { responses: DisclaimerResponse[] }) {
  return (
    <DetailSection title="Consents" icon={ShieldCheckIcon} meta={responses.length || undefined}>
      {responses.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">The form had no consent checkboxes.</p>
      ) : (
        <ul className="grid text-sm">
          {responses.map((response) => (
            <li
              key={response.checkbox_key}
              className="-mx-2 flex items-center gap-2.5 border-b border-hairline px-2 py-2 last:border-b-0"
            >
              {response.is_checked ? (
                <CheckCircleIcon
                  aria-hidden
                  weight="fill"
                  className="size-4 shrink-0 text-primary"
                />
              ) : (
                <MinusCircleIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 break-words">
                {humanizeKey(response.checkbox_key)}
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 text-xs leading-5 font-medium',
                  response.is_checked
                    ? 'bg-(--status-converted-bg) text-(--status-converted-fg)'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {response.is_checked ? 'Agreed' : 'Not agreed'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DetailSection>
  );
}
