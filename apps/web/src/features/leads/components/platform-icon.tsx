import { FacebookLogoIcon, InstagramLogoIcon, MegaphoneSimpleIcon } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';

const ICONS = { fb: FacebookLogoIcon, ig: InstagramLogoIcon } as const;

/** Decorative: always rendered next to the source label, which carries the meaning. */
export function PlatformIcon({
  platform,
  className,
}: {
  platform: string | null;
  className?: string;
}) {
  const Icon = ICONS[platform as keyof typeof ICONS] ?? MegaphoneSimpleIcon;
  return <Icon aria-hidden weight="fill" className={cn('size-3.5 shrink-0', className)} />;
}
