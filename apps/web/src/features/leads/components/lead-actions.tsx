import { PencilSimpleIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useActorGate } from '@/hooks/use-actor-gate';
import { ApiError } from '@/lib/api-client';

import { useChangeStatus, useUpdateLead, type EditableValues } from '../api';
import type { LeadDetail, LeadStatus } from '../types';
import { EditLeadDialog } from './edit-lead-dialog';
import { STATUS_LABELS } from './status-badge';
import { StatusChanger } from './status-changer';

const isConflict = (error: unknown) =>
  error instanceof ApiError && error.code === 'VERSION_CONFLICT';

type LeadActionsProps = {
  lead: LeadDetail;
  /** Refetch the lead; resolves with the latest data. */
  reload: () => Promise<LeadDetail | undefined>;
  /** A status change hit a version conflict (someone else changed the lead first). */
  onConflict: () => void;
};

/**
 * Status workflow buttons and the edit dialog. Every change sends the version the user
 * is looking at; the API rejects it with 409 if the lead changed in the meantime.
 */
export function LeadActions({ lead, reload, onConflict }: LeadActionsProps) {
  const gate = useActorGate();
  const changeStatus = useChangeStatus(lead.id);
  const updateLead = useUpdateLead(lead.id);
  const [editing, setEditing] = useState(false);

  function handleStatus(next: LeadStatus) {
    gate.withActor((actor) =>
      changeStatus.mutate(
        { status: next, version: lead.version, actor },
        {
          onSuccess: () => toast.success(`Status changed to ${STATUS_LABELS[next]}`),
          onError: (error) =>
            isConflict(error)
              ? onConflict()
              : toast.error(error instanceof ApiError ? error.message : 'Could not change status'),
        },
      ),
    );
  }

  async function handleEdit(values: EditableValues) {
    const updated = await updateLead.mutateAsync({
      version: lead.version,
      values,
      actor: gate.actor ?? '',
    });
    // Same version back means the server found nothing to change (and wrote no activity).
    toast.success(updated.version === lead.version ? 'No changes to save' : 'Lead updated');
  }

  return (
    <div className="flex w-full items-center gap-2 md:w-auto">
      <StatusChanger
        status={lead.status}
        allowedTransitions={lead.allowedTransitions}
        pendingStatus={changeStatus.isPending ? changeStatus.variables.status : null}
        onChange={handleStatus}
      />
      <Button
        variant="outline"
        size="lg"
        className="h-10 px-4 max-sm:px-3"
        onClick={() => gate.withActor(() => setEditing(true))}
      >
        <PencilSimpleIcon aria-hidden />
        <span className="max-sm:sr-only">Edit</span>
      </Button>

      {editing ? (
        <EditLeadDialog
          lead={lead}
          open
          onOpenChange={setEditing}
          onSubmit={handleEdit}
          onReload={reload}
        />
      ) : null}
      {gate.prompt}
    </div>
  );
}
