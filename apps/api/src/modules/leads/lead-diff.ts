export type FieldChange<T> = { from: T; to: T };
export type FieldChanges<T extends object> = Partial<{ [K in keyof T]: FieldChange<T[K]> }>;

/**
 * Field-level diff between the current values and the requested updates.
 * Only fields present in `updates` whose value actually differs are included, so an
 * update that changes nothing produces an empty diff (and no audit record).
 */
export function diffFields<T extends object>(current: T, updates: Partial<T>): FieldChanges<T> {
  const changes: FieldChanges<T> = {};
  for (const key of Object.keys(updates) as (keyof T)[]) {
    const to = updates[key] as T[typeof key];
    if (to !== undefined && to !== current[key]) {
      changes[key] = { from: current[key], to };
    }
  }
  return changes;
}
