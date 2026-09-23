import { AppError } from '../../lib/errors.js';
import type { LeadStatusValue } from './leads.schemas.js';

export class InvalidTransitionError extends AppError {
  constructor(from: LeadStatusValue, to: LeadStatusValue) {
    super('INVALID_TRANSITION', `A lead cannot move from ${from} to ${to}`, 422, {
      from,
      to,
      allowed: allowedTransitions(from),
    });
  }
}

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
