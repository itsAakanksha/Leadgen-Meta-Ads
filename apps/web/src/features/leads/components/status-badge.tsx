import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { LeadStatus } from '../types';

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  CONVERTED: 'Converted',
  LOST: 'Lost',
};

// Colour supports the label; the text alone carries the meaning (never colour only).
const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: 'bg-(--status-new-bg) text-(--status-new-fg)',
  CONTACTED: 'bg-(--status-contacted-bg) text-(--status-contacted-fg)',
  QUALIFIED: 'bg-(--status-qualified-bg) text-(--status-qualified-fg)',
  CONVERTED: 'bg-(--status-converted-bg) text-(--status-converted-fg)',
  LOST: 'bg-(--status-lost-bg) text-(--status-lost-fg)',
};

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <Badge variant="secondary" className={cn(STATUS_STYLES[status], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
