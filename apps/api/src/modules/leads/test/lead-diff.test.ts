import { describe, expect, it } from 'vitest';

import { diffFields } from '../lead-diff.js';

const current = { fullName: 'Ada', email: 'ada@example.com', notes: null as string | null };

describe('diffFields', () => {
  it('returns from/to for fields that change', () => {
    expect(diffFields(current, { fullName: 'Ada Lovelace', notes: 'Called' })).toEqual({
      fullName: { from: 'Ada', to: 'Ada Lovelace' },
      notes: { from: null, to: 'Called' },
    });
  });

  it('ignores fields whose value is unchanged', () => {
    expect(diffFields(current, { fullName: 'Ada', email: 'new@example.com' })).toEqual({
      email: { from: 'ada@example.com', to: 'new@example.com' },
    });
  });

  it('is empty when nothing changes', () => {
    expect(diffFields(current, { fullName: 'Ada', notes: null })).toEqual({});
    expect(diffFields(current, {})).toEqual({});
  });

  it('records clearing a field as a change to null', () => {
    expect(diffFields(current, { email: null as unknown as string })).toEqual({
      email: { from: 'ada@example.com', to: null },
    });
  });

  it('ignores fields that are not in the update', () => {
    expect(diffFields(current, { notes: 'x' })).not.toHaveProperty('fullName');
  });
});
