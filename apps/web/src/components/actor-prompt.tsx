import { useState, type FormEvent } from 'react';

import { Button } from './button';
import { Dialog } from './dialog';

const MAX_LENGTH = 60;

type ActorPromptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string | null;
  onSave: (name: string) => void;
};

/** Asks for the display name recorded on changes. Not a login: nothing is verified. */
export function ActorPrompt({ open, onOpenChange, initialName, onSave }: ActorPromptProps) {
  const [name, setName] = useState(initialName ?? '');
  const trimmed = name.trim();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    onSave(trimmed);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Your name"
      description="Shown in the activity timeline next to the changes you make."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="actor-name" className="text-sm font-medium">
            Display name
          </label>
          <input
            id="actor-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_LENGTH}
            autoComplete="name"
            autoFocus
            required
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!trimmed}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
