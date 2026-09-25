import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import type { StatusCounts } from '../api';
import { hasFilters, type LeadsFilterPatch } from '../leads-query';
import { LEAD_STATUSES, type LeadsQuery, type LeadStatus, type Platform } from '../types';
import { STATUS_LABELS } from './status-badge';

// Radix Select cannot use "" as an item value, so "any" stands for "no filter".
const ANY = 'any';
const SEARCH_DEBOUNCE_MS = 300;

const DOTS: Record<LeadStatus, string> = {
  NEW: 'bg-(--status-new-fg)',
  CONTACTED: 'bg-(--status-contacted-fg)',
  QUALIFIED: 'bg-(--status-qualified-fg)',
  CONVERTED: 'bg-(--status-converted-fg)',
  LOST: 'bg-(--status-lost-fg)/60',
};

/**
 * One tab per status with its live count, so the queue's shape is visible before filtering.
 * Buttons with aria-pressed: they filter the one table below, they do not switch panels.
 */
export function StatusTabs({
  value,
  counts,
  onChange,
}: {
  value: LeadStatus | undefined;
  counts: StatusCounts | undefined;
  onChange: (status: LeadStatus | undefined) => void;
}) {
  const all = counts ? LEAD_STATUSES.reduce((sum, status) => sum + counts[status], 0) : undefined;
  const tabs: { key: LeadStatus | undefined; label: string; count: number | undefined }[] = [
    { key: undefined, label: 'All', count: all },
    ...LEAD_STATUSES.map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      count: counts?.[status],
    })),
  ];

  // The white indicator slides to the pressed tab. Measured into its style directly (no state),
  // and re-measured whenever a tab resizes: counts arriving or the web font loading.
  const groupRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const group = groupRef.current;
    const indicator = indicatorRef.current;
    if (!group || !indicator) return;
    const place = () => {
      const tab = group.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!tab) return;
      indicator.style.width = `${tab.offsetWidth}px`;
      indicator.style.transform = `translateX(${tab.offsetLeft}px)`;
      indicator.style.opacity = '1';
    };
    place();
    const observer = new ResizeObserver(place);
    for (const tab of group.querySelectorAll('button')) observer.observe(tab);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div className="overflow-x-auto [scrollbar-width:none]">
      <div
        ref={groupRef}
        role="group"
        aria-label="Filter by status"
        className="relative inline-flex gap-0.5 rounded-full bg-tray p-1 ring-1 ring-foreground/5"
      >
        <span
          ref={indicatorRef}
          aria-hidden
          className="absolute inset-y-1 left-0 rounded-full bg-card opacity-0 shadow-core transition-[transform,width] duration-300"
        />
        {tabs.map(({ key, label, count }) => {
          const active = value === key;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(key)}
              className={cn(
                'relative flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-sm whitespace-nowrap transition-colors duration-200 outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {key ? <span aria-hidden className={cn('size-1.5 rounded-full', DOTS[key])} /> : null}
              {label}
              <span
                className={cn(
                  'tabular min-w-5 rounded-xs px-1 text-center text-[11px] leading-4.5 font-medium transition-colors duration-200',
                  active
                    ? 'bg-foreground text-background'
                    : 'bg-foreground/[0.06] text-muted-foreground',
                  count === undefined && 'opacity-0',
                )}
              >
                {count ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type LeadFiltersProps = {
  query: LeadsQuery;
  onChange: (patch: LeadsFilterPatch) => void;
  onClear: () => void;
};

export function LeadFilters({ query, onChange, onClear }: LeadFiltersProps) {
  // The input updates instantly; the URL (and the request) only after typing pauses.
  // Debounced in the event handler, not an effect, so clearing can cancel a pending search.
  const [search, setSearch] = useState(query.q ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function handleSearch(value: string) {
    setSearch(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  }

  const active = hasFilters(query);

  function clear() {
    clearTimeout(timer.current);
    setSearch('');
    onClear();
  }

  return (
    <div role="search" className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 basis-full sm:max-w-xs sm:flex-1 sm:basis-auto">
        <MagnifyingGlassIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <label htmlFor="lead-search" className="sr-only">
          Search leads by name, email or phone
        </label>
        <Input
          id="lead-search"
          type="search"
          value={search}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder="Search name, email, phone"
          className="pl-8"
          maxLength={100}
        />
      </div>

      <Select
        value={query.platform ?? ANY}
        onValueChange={(value) =>
          onChange({ platform: value === ANY ? undefined : (value as Platform) })
        }
      >
        <SelectTrigger
          aria-label="Filter by platform"
          className="flex-1 hover:bg-surface-subtle sm:w-40 sm:flex-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All platforms</SelectItem>
          <SelectItem value="fb">Facebook</SelectItem>
          <SelectItem value="ig">Instagram</SelectItem>
        </SelectContent>
      </Select>

      {active ? (
        <Button variant="ghost" onClick={clear} className="text-muted-foreground">
          <XIcon aria-hidden />
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
