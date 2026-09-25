import { UserIcon } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';

/** "Ada Lovelace" → "AL", "cher" → "C". */
function initials(name: string): string {
  // Letters and digits only, so Meta's "<test lead: …>" placeholders don't render "<T".
  const parts = name
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

const SIZES = {
  sm: 'size-7 text-[11px]',
  md: 'size-8 text-xs',
  lg: 'size-12 text-base sm:size-14 sm:text-lg',
} as const;

/** Decorative monogram. The name is always shown next to it, so it is hidden from assistive tech. */
export function LeadAvatar({
  name,
  size = 'md',
  className,
}: {
  name: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const text = name ? initials(name) : '';
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-[30%] font-semibold tracking-tight ring-1 select-none ring-inset',
        // Neutral on purpose: tangerine is reserved for actions and progress, status owns the
        // other hues, so an avatar never competes with either.
        'bg-linear-to-b from-white to-stone-100 text-stone-700 shadow-control ring-stone-900/10',
        SIZES[size],
        className,
      )}
    >
      {text || <UserIcon weight="bold" className="size-[45%]" />}
    </span>
  );
}
