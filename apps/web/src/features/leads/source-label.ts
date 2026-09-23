const PLATFORM_NAMES: Record<string, string> = { fb: 'Facebook', ig: 'Instagram' };

/** "Instagram · Paid", "Facebook · Organic", or "—" when Meta did not say. */
export function sourceLabel(platform: string | null, isOrganic: boolean | null): string {
  const name = platform ? (PLATFORM_NAMES[platform] ?? platform) : null;
  const reach = isOrganic === null ? null : isOrganic ? 'Organic' : 'Paid';
  return [name, reach].filter(Boolean).join(' · ') || '—';
}
