import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Double-bezel surface (DESIGN.md §4): a tinted outer tray holding a white inner core with
 * concentric corners (20px tray − 6px padding = 14px core). Reserved for main working areas.
 */
export function Surface({
  className,
  coreClassName,
  children,
}: {
  /** Classes for the outer tray (layout, sticky, animation). */
  className?: string;
  /** Classes for the inner core (padding, overflow, dividers). */
  coreClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('rounded-2xl bg-tray p-1.5 ring-1 ring-foreground/5', className)}>
      <div className={cn('rounded-xl bg-card shadow-core', coreClassName)}>{children}</div>
    </div>
  );
}
