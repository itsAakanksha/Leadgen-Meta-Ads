import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        // Shimmer sweep instead of a pulse: reads as loading, not as a disabled block.
        'relative overflow-hidden rounded-md bg-muted after:absolute after:inset-0 after:animate-shimmer after:bg-linear-to-r after:from-transparent after:via-white/70 after:to-transparent',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
