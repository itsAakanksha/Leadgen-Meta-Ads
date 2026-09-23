import type { LeadStatusValue } from './leads.schemas.js';

/**
 * The lead status workflow:
 *
 *   NEW ──► CONTACTED ──► QUALIFIED ──► CONVERTED (terminal)
 *    │          │             │
 *    └──────────┴─────────────┴──► LOST ──► NEW (reopen)
 */
const TRANSITIONS: Record<LeadStatusValue, readonly LeadStatusValue[]> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['CONVERTED', 'LOST'],
  CONVERTED: [],
  LOST: ['NEW'],
};

/** Statuses a lead can move to next. The UI shows exactly these options. */
export function allowedTransitions(from: LeadStatusValue): readonly LeadStatusValue[] {
  return TRANSITIONS[from];
}

export function canTransition(from: LeadStatusValue, to: LeadStatusValue): boolean {
  return TRANSITIONS[from].includes(to);
}
