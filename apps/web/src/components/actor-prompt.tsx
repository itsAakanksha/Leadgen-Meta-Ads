import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Your name</DialogTitle>
            <DialogDescription>
              Shown in the activity timeline next to the changes you make.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="actor-name">Display name</FieldLabel>
            <Input
              id="actor-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_LENGTH}
              autoComplete="name"
              autoFocus
              required
            />
            <FieldDescription>This is not a sign-in. Anyone can use any name.</FieldDescription>
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmed}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
