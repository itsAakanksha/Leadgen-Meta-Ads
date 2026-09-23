import { describe, expect, it } from 'vitest';

import { formatRelative } from '@/lib/format';

import { formatActor } from './format-actor';
import { humanizeKey } from './humanize-key';

describe('humanizeKey', () => {
  it.each([
    ['full_name', 'Full name'],
    ['phone_number', 'Phone number'],
    ['question1', 'Question 1'],
    ['what_is_your_budget?', 'What is your budget?'],
    ['marketing-opt-in', 'Marketing opt in'],
    ['  ', '  '],
  ])('%s → %s', (key, label) => {
    expect(humanizeKey(key)).toBe(label);
  });
});

describe('formatActor', () => {
  it('names the system, users and anonymous changes', () => {
    expect(formatActor('system:meta')).toBe('Meta');
    expect(formatActor('user:José Núñez')).toBe('José Núñez');
    expect(formatActor('user:anonymous')).toBe('Anonymous');
  });
});

describe('formatRelative', () => {
  const now = new Date('2026-09-24T12:00:00Z');
  it('describes how long ago something happened', () => {
    expect(formatRelative('2026-09-24T11:59:30Z', now)).toBe('just now');
    expect(formatRelative('2026-09-24T11:55:00Z', now)).toBe('5 minutes ago');
    expect(formatRelative('2026-09-24T09:00:00Z', now)).toBe('3 hours ago');
    expect(formatRelative('2026-09-23T12:00:00Z', now)).toBe('yesterday');
  });
});
