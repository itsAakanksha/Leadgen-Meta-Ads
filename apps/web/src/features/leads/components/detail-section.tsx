import { useId, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** A titled group on the lead page. One flat surface; no nested cards. */
export function DetailSection({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn('rounded-lg border bg-card', className)}>
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 id={headingId} className="text-sm font-semibold">
          {title}
        </h2>
        {action}
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

/** Label/value rows as a real description list. */
export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    // Mobile: each label sits tight above its value. Wider: two aligned columns, the same
    // label width in every section.
    <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr] sm:gap-x-6 sm:gap-y-2.5">
      {items.map(({ label, value }) => (
        <div key={label} className="grid gap-0.5 sm:contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
