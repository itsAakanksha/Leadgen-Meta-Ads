import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
}: {
  icon: Icon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-2 rounded-lg border border-dashed bg-card px-6 py-16 text-center">
      <IconComponent aria-hidden className="size-8 text-muted-foreground" weight="duotone" />
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
