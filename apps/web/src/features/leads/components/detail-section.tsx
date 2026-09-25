import type { Icon } from '@phosphor-icons/react';
import { useId, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** A titled group on the lead page. Flat: the surrounding Surface provides the depth. */
export function DetailSection({
  title,
  icon: IconComponent,
  meta,
  action,
  className,
  children,
}: {
  title: string;
  icon?: Icon;
  /** Quiet supporting figure next to the title, such as a count. */
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn('px-4 py-4 sm:px-5', className)}>
      <header className="mb-2 flex min-h-6 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {IconComponent ? (
            <IconComponent aria-hidden className="size-4 text-muted-foreground" />
          ) : null}
          <h2 id={headingId} className="text-[13px] font-semibold tracking-tight">
            {title}
          </h2>
          {meta !== undefined ? (
            <span className="tabular rounded-xs bg-muted px-1.5 text-[11px] leading-4.5 font-medium text-muted-foreground">
              {meta}
            </span>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Label/value rows as a real description list, divided by hairlines. */
export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    // Mobile: each label sits tight above its value. Wider: two aligned columns, the same
    // label width in every section.
    <dl className="grid text-sm">
      {items.map(({ label, value }) => (
        <div
          key={label}
          className="-mx-2 grid gap-0.5 border-b border-hairline px-2 py-2 transition-colors last:border-b-0 hover:bg-surface-subtle sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-x-6"
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "—" for a missing value, quiet enough not to compete with real data. */
export function Empty({ children = '—' }: { children?: string }) {
  return <span className="text-muted-foreground">{children}</span>;
}
