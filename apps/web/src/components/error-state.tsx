import { ArrowClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
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
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="grid justify-items-center gap-2 rounded-lg border border-destructive/30 bg-card px-6 py-12 text-center"
    >
      <WarningCircleIcon aria-hidden className="size-8 text-destructive" weight="duotone" />
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
