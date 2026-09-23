import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'lead-intake.actor';
const listeners = new Set<() => void>();

// localStorage can throw (private mode, blocked storage); the app must still work.
function read(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function write(name: string | null): void {
  try {
    if (name) window.localStorage.setItem(STORAGE_KEY, name);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not persisted; still update subscribers for this session.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The display name recorded as the actor on changes (sent as X-Actor).
 * Attribution only: there is no authentication in this app.
 */
export function useActor(): [string | null, (name: string | null) => void] {
  const actor = useSyncExternalStore(subscribe, read, () => null);
  const setActor = useCallback((name: string | null) => write(name?.trim() || null), []);
  return [actor, setActor];
}
