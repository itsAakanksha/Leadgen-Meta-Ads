import { zodResolver } from '@hookform/resolvers/zod';
import { SpinnerIcon } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';

import type { EditableValues } from '../api';
import { EDITABLE_FIELDS, type EditableField, type LeadDetail } from '../types';
import { ConflictBanner } from './conflict-banner';

// Mirrors the API's validation so most mistakes are caught before a request.
// An empty field clears the value.
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{5,24}$/;
export const editLeadSchema = z.object({
  fullName: z.string().trim().max(200, 'Use 200 characters or fewer'),
  email: z.union([z.literal(''), z.email('Enter a valid email address').max(254)]),
  phone: z.union([
    z.literal(''),
    z.string().trim().regex(PHONE_PATTERN, 'Use digits, spaces, ( ) - and an optional leading +'),
  ]),
  notes: z.string().trim().max(5000, 'Use 5,000 characters or fewer'),
  assignee: z.string().trim().max(100, 'Use 100 characters or fewer'),
});

const toFormValues = (lead: LeadDetail): EditableValues => ({
  fullName: lead.fullName ?? '',
  email: lead.email ?? '',
  phone: lead.phone ?? '',
  notes: lead.notes ?? '',
  assignee: lead.assignee ?? '',
});

type EditLeadDialogProps = {
  lead: LeadDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EditableValues) => Promise<unknown>;
  /** Reload the lead after a conflict; resolves with the latest version. */
  onReload: () => Promise<LeadDetail | undefined>;
};

export function EditLeadDialog({
  lead,
  open,
  onOpenChange,
  onSubmit,
  onReload,
}: EditLeadDialogProps) {
  const form = useForm<EditableValues>({
    resolver: zodResolver(editLeadSchema),
    defaultValues: toFormValues(lead),
  });
  const [conflict, setConflict] = useState(false);
  const [reloading, setReloading] = useState(false);
  const { errors, isSubmitting } = form.formState;

  async function submit(values: EditableValues) {
    setConflict(false);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
        setConflict(true); // keep the typed values on screen so they can be copied
      } else if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
        // Put server-side validation messages on the matching fields.
        const details = Array.isArray(error.details) ? error.details : [];
        for (const issue of details as { path?: string; message?: string }[]) {
          if (EDITABLE_FIELDS.includes(issue.path as EditableField)) {
            form.setError(issue.path as EditableField, { message: issue.message });
          }
        }
      } else {
        form.setError('root', {
          message: error instanceof ApiError ? error.message : 'Could not save. Try again.',
        });
      }
    }
  }

  async function reload() {
    setReloading(true);
    const latest = await onReload();
    setReloading(false);
    if (latest) {
      form.reset(toFormValues(latest));
      setConflict(false);
    }
  }

  const field = (
    name: EditableField,
    label: string,
    input: (props: UseFormRegisterReturn) => ReactNode,
  ) => (
    <Field data-invalid={errors[name] ? true : undefined}>
      <FieldLabel htmlFor={`edit-${name}`}>{label}</FieldLabel>
      {input(form.register(name))}
      <FieldError errors={[errors[name]]} />
    </Field>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={(event) => void form.handleSubmit(submit)(event)}
          noValidate
          className="grid gap-5"
        >
          <DialogHeader>
            <DialogTitle>Edit lead</DialogTitle>
            <DialogDescription>
              Changes are recorded in the activity timeline. Leave a field empty to clear it.
            </DialogDescription>
          </DialogHeader>

          {conflict ? (
            <ConflictBanner onReload={() => void reload()} reloading={reloading}>
              Someone else changed this lead after you opened it, so your edits were not saved.
              Reloading replaces the form with the latest values; copy anything you want to keep.
            </ConflictBanner>
          ) : null}

          <FieldGroup>
            {field('fullName', 'Name', (props) => (
              <Input
                id="edit-fullName"
                autoComplete="off"
                aria-invalid={!!errors.fullName}
                {...props}
              />
            ))}
            <div className="grid gap-5 sm:grid-cols-2">
              {field('email', 'Email', (props) => (
                <Input
                  id="edit-email"
                  type="email"
                  autoComplete="off"
                  aria-invalid={!!errors.email}
                  {...props}
                />
              ))}
              {field('phone', 'Phone', (props) => (
                <Input
                  id="edit-phone"
                  type="tel"
                  autoComplete="off"
                  aria-invalid={!!errors.phone}
                  {...props}
                />
              ))}
            </div>
            {field('assignee', 'Assignee', (props) => (
              <Input
                id="edit-assignee"
                autoComplete="off"
                aria-invalid={!!errors.assignee}
                {...props}
              />
            ))}
            {field('notes', 'Notes', (props) => (
              <Textarea id="edit-notes" rows={4} aria-invalid={!!errors.notes} {...props} />
            ))}
          </FieldGroup>

          {errors.root ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || conflict}>
              {isSubmitting ? <SpinnerIcon aria-hidden className="animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
