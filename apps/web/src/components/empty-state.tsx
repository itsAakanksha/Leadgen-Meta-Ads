import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  className,
}: {
  icon: Icon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid animate-enter justify-items-center gap-2 rounded-2xl border border-dashed border-foreground/10 bg-card px-6 py-16 text-center',
        className,
      )}
    >
      <span className="mb-2 rounded-2xl bg-tray p-1.5 ring-1 ring-foreground/5">
        <span className="grid size-11 place-items-center rounded-xl bg-card shadow-core">
          <IconComponent aria-hidden className="size-5 text-muted-foreground" weight="duotone" />
        </span>
      </span>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
