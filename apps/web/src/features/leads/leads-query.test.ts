import { describe, expect, it } from 'vitest';

import { hasFilters, parseLeadsQuery, withFilters, withPage } from './leads-query';

const params = (query: string) => new URLSearchParams(query);

describe('parseLeadsQuery', () => {
  it('reads filters and page from the URL', () => {
    expect(parseLeadsQuery(params('q=ada&status=CONTACTED&platform=ig&page=3'))).toEqual({
      q: 'ada',
      status: 'CONTACTED',
      platform: 'ig',
      page: 3,
    });
  });

  it('defaults to page 1 with no filters', () => {
    expect(parseLeadsQuery(params(''))).toEqual({ page: 1 });
  });

  it('ignores values the API would reject instead of sending them', () => {
    expect(parseLeadsQuery(params('status=WON&platform=tiktok&page=-2&q=%20%20'))).toEqual({
      page: 1,
    });
    expect(parseLeadsQuery(params('page=1.5')).page).toBe(1);
  });
});

describe('withFilters', () => {
  it('sets and removes filters, and always returns to page 1', () => {
    const next = withFilters(params('status=NEW&page=4'), { q: 'grace', status: undefined });
    expect(next.toString()).toBe('q=grace');
  });

  it('does not mutate the input', () => {
    const input = params('page=2');
    withFilters(input, { q: 'x' });
    expect(input.toString()).toBe('page=2');
  });
});

describe('withPage', () => {
  it('keeps filters and drops page=1 from the URL', () => {
    expect(withPage(params('q=ada'), 2).toString()).toBe('q=ada&page=2');
    expect(withPage(params('q=ada&page=2'), 1).toString()).toBe('q=ada');
  });
});

describe('hasFilters', () => {
  it('is true when any filter is set', () => {
    expect(hasFilters({ page: 1 })).toBe(false);
    expect(hasFilters({ page: 1, platform: 'fb' })).toBe(true);
  });
});
