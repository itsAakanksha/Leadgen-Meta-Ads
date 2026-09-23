import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-client';

import type { LeadDetail } from '../types';
import { EditLeadDialog } from './edit-lead-dialog';

const lead = {
  id: 'lead-1',
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: null,
  notes: null,
  assignee: 'Kim',
  version: 3,
} as LeadDetail;

function renderDialog(overrides: Partial<Parameters<typeof EditLeadDialog>[0]> = {}) {
  const props = {
    lead,
    open: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onReload: vi.fn().mockResolvedValue({ ...lead, notes: 'Changed elsewhere', version: 4 }),
    ...overrides,
  };
  render(<EditLeadDialog {...props} />);
  return props;
}

describe('EditLeadDialog', () => {
  it('starts from the current values and submits the edited ones', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const props = renderDialog({ onSubmit });

    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace');
    await user.type(screen.getByLabelText('Notes'), '  Call Monday  ');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '',
      notes: 'Call Monday',
      assignee: 'Kim',
    });
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows validation errors next to the field and does not submit', async () => {
    const user = userEvent.setup();
    const props = renderDialog();

    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Phone'), 'call me');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText(/Use digits, spaces/)).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('on a version conflict keeps the typed values and offers to reload', async () => {
    const user = userEvent.setup();
    const props = renderDialog({
      onSubmit: vi
        .fn()
        .mockRejectedValue(new ApiError(409, 'VERSION_CONFLICT', 'Changed by someone else')),
    });

    await user.type(screen.getByLabelText('Notes'), 'My unsaved note');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('This lead has changed')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toHaveValue('My unsaved note');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(props.onOpenChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Reload latest' }));
    await waitFor(() => expect(screen.getByLabelText('Notes')).toHaveValue('Changed elsewhere'));
    expect(screen.queryByText('This lead has changed')).not.toBeInTheDocument();
  });

  it('puts server-side validation errors on the matching field', async () => {
    const user = userEvent.setup();
    renderDialog({
      onSubmit: vi
        .fn()
        .mockRejectedValue(
          new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed', [
            { path: 'email', message: 'Rejected by server' },
          ]),
        ),
    });

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Rejected by server')).toBeInTheDocument();
  });
});
