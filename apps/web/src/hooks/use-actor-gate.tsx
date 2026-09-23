import { useRef, useState, type ReactNode } from 'react';

import { ActorPrompt } from '@/components/actor-prompt';

import { useActor } from './use-actor';

/**
 * Changes are attributed to a display name. The first time someone makes a change, ask for
 * the name, then continue with what they were doing. Cancelling the prompt cancels the change.
 */
export function useActorGate(): {
  actor: string | null;
  withActor: (action: (actor: string) => void) => void;
  prompt: ReactNode;
} {
  const [actor, setActor] = useActor();
  const [open, setOpen] = useState(false);
  const pending = useRef<((actor: string) => void) | null>(null);

  function withActor(action: (actor: string) => void) {
    if (actor) {
      action(actor);
      return;
    }
    pending.current = action;
    setOpen(true);
  }

  function handleSave(name: string) {
    setActor(name);
    const action = pending.current;
    pending.current = null;
    action?.(name);
  }

  function handleOpenChange(next: boolean) {
    if (!next) pending.current = null;
    setOpen(next);
  }

  const prompt = open ? (
    <ActorPrompt open onOpenChange={handleOpenChange} initialName={actor} onSave={handleSave} />
  ) : null;

  return { actor, withActor, prompt };
}
