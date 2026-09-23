/** "system:meta" → "Meta", "user:Sam" → "Sam", "user:anonymous" → "Anonymous". */
export function formatActor(actor: string): string {
  if (actor === 'system:meta') return 'Meta';
  if (actor === 'user:anonymous') return 'Anonymous';
  return actor.startsWith('user:') ? actor.slice('user:'.length) : actor;
}
