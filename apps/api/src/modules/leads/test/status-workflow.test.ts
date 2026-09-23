import { describe, expect, it } from 'vitest';

import { LeadStatus, type LeadStatusValue } from '../leads.schemas.js';
import { allowedTransitions, canTransition } from '../status-workflow.js';

const ALLOWED = new Set([
  'NEW→CONTACTED',
  'NEW→LOST',
  'CONTACTED→QUALIFIED',
  'CONTACTED→LOST',
  'QUALIFIED→CONVERTED',
  'QUALIFIED→LOST',
  'LOST→NEW',
]);

const statuses = Object.values(LeadStatus) as LeadStatusValue[];
const everyPair = statuses.flatMap((from) => statuses.map((to) => [from, to] as const));

describe('status workflow', () => {
  it.each(everyPair)('%s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(ALLOWED.has(`${from}→${to}`));
  });

  it('never allows staying on the same status (that is a no-op, not a transition)', () => {
    for (const status of statuses) expect(canTransition(status, status)).toBe(false);
  });

  it('CONVERTED is terminal', () => {
    expect(allowedTransitions('CONVERTED')).toEqual([]);
  });

  it('allowedTransitions agrees with canTransition', () => {
    for (const from of statuses) {
      expect([...allowedTransitions(from)].sort()).toEqual(
        statuses.filter((to) => canTransition(from, to)).sort(),
      );
    }
  });
});
