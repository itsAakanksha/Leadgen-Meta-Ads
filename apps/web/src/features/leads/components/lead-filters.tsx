import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { hasFilters, type LeadsFilterPatch } from '../leads-query';
import { LEAD_STATUSES, type LeadsQuery, type LeadStatus, type Platform } from '../types';
import { STATUS_LABELS } from './status-badge';

// Radix Select cannot use "" as an item value, so "any" stands for "no filter".
const ANY = 'any';
const SEARCH_DEBOUNCE_MS = 300;

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
    <div role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative sm:max-w-xs sm:flex-1">
        <MagnifyingGlassIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
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

      <div className="flex gap-2">
        <Select
          value={query.status ?? ANY}
          onValueChange={(value) =>
            onChange({ status: value === ANY ? undefined : (value as LeadStatus) })
          }
        >
          <SelectTrigger aria-label="Filter by status" className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All statuses</SelectItem>
            {LEAD_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={query.platform ?? ANY}
          onValueChange={(value) =>
            onChange({ platform: value === ANY ? undefined : (value as Platform) })
          }
        >
          <SelectTrigger aria-label="Filter by platform" className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All platforms</SelectItem>
            <SelectItem value="fb">Facebook</SelectItem>
            <SelectItem value="ig">Instagram</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {active ? (
        <Button variant="ghost" onClick={clear} className="self-start sm:self-auto">
          <XIcon aria-hidden />
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
