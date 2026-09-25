import { ArrowClockwiseIcon, WarningIcon } from '@phosphor-icons/react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * Shown when a save was rejected with 409: someone else changed the lead first
 * (optimistic locking). Nothing was overwritten; the user reloads and decides again.
 */
export function ConflictBanner({
  onReload,
  reloading,
  children = 'Someone else changed this lead while you were viewing it, so your change was not saved. Reload to see the latest version.',
}: {
  onReload: () => void;
  reloading: boolean;
  children?: string;
}) {
  return (
    <Alert role="alert" className="border-warning-fg/30 bg-warning-bg/50">
      <WarningIcon aria-hidden weight="fill" className="text-warning-fg" />
      <AlertTitle>This lead has changed</AlertTitle>
      <AlertDescription className="grid gap-3">
        <p>{children}</p>
        <Button variant="outline" onClick={onReload} disabled={reloading} className="w-fit">
          <ArrowClockwiseIcon aria-hidden className={reloading ? 'animate-spin' : undefined} />
          Reload latest
        </Button>
      </AlertDescription>
    </Alert>
  );
}
