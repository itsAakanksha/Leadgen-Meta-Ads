import { ArrowClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api-client';

function describe(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status >= 500) return 'The server had a problem. It may be starting up. Try again.';
    return error.message;
  }
  return 'Something went wrong.';
}

export function ErrorState({
  title = 'Couldn’t load this',
  error,
  onRetry,
  className,
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'grid animate-enter justify-items-center gap-2 rounded-2xl bg-card px-6 py-14 text-center shadow-core',
        className,
      )}
    >
      <span className="mb-2 rounded-2xl bg-destructive/5 p-1.5 ring-1 ring-destructive/10">
        <span className="grid size-11 place-items-center rounded-xl bg-card shadow-core">
          <WarningCircleIcon aria-hidden className="size-5 text-destructive" weight="duotone" />
        </span>
      </span>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{describe(error)}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          <ArrowClockwiseIcon aria-hidden />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
