import { CheckCircleIcon, MinusCircleIcon } from '@phosphor-icons/react';

import { humanizeKey } from '../humanize-key';
import type { DisclaimerResponse } from '../types';
import { DetailSection } from './detail-section';

/** Custom disclaimer checkboxes: evidence of what the person agreed to. */
export function LeadConsents({ responses }: { responses: DisclaimerResponse[] }) {
  return (
    <DetailSection title="Consents">
      {responses.length === 0 ? (
        <p className="text-sm text-muted-foreground">The form had no consent checkboxes.</p>
      ) : (
        <ul className="grid gap-2 text-sm">
          {responses.map((response) => (
            <li key={response.checkbox_key} className="flex items-center gap-2">
              {response.is_checked ? (
                <CheckCircleIcon aria-hidden weight="fill" className="size-4 text-primary" />
              ) : (
                <MinusCircleIcon aria-hidden className="size-4 text-muted-foreground" />
              )}
              <span>{humanizeKey(response.checkbox_key)}</span>
              <span className="text-muted-foreground">
                {response.is_checked ? 'Agreed' : 'Not agreed'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DetailSection>
  );
}
