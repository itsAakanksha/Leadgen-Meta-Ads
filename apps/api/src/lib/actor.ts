import type { Request } from 'express';

import { ValidationError } from './errors.js';

const MAX_ACTOR_LENGTH = 60;
// Letters, marks, numbers, spaces and common name punctuation. No control characters.
const ACTOR_PATTERN = /^[\p{L}\p{M}\p{N} .,'_@-]+$/u;

/**
 * Who is making the change, for the audit trail: `user:<name>` from the X-Actor header,
 * or `user:anonymous`. This is attribution, not authentication (see README trade-offs).
 *
 * Header values must be ASCII in browsers, so clients send the name URI-encoded.
 */
export function actorFrom(req: Request): string {
  const header = req.get('X-Actor');
  if (header === undefined || header.trim() === '') return 'user:anonymous';

  let name: string;
  try {
    name = decodeURIComponent(header).trim();
  } catch {
    throw new ValidationError('X-Actor is not valid URI-encoded text');
  }
  if (name.length > MAX_ACTOR_LENGTH || !ACTOR_PATTERN.test(name)) {
    throw new ValidationError(
      `X-Actor must be a name of at most ${MAX_ACTOR_LENGTH} characters (letters, numbers, spaces)`,
    );
  }
  return `user:${name}`;
}
