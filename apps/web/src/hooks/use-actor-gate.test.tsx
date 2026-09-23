import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { useActorGate } from './use-actor-gate';

function Harness({ onAction }: { onAction: (actor: string) => void }) {
  const gate = useActorGate();
  return (
    <>
      <button onClick={() => gate.withActor(onAction)}>Change status</button>
      {gate.prompt}
    </>
  );
}

describe('useActorGate', () => {
  it('asks for a name first, then continues the change with that name', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);

    await user.click(screen.getByRole('button', { name: 'Change status' }));
    expect(onAction).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Display name'), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onAction).toHaveBeenCalledWith('Sam');
  });

  it('does not ask again once a name is known', async () => {
    window.localStorage.setItem('lead-intake:actor:v1', 'Kim');
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);

    await user.click(screen.getByRole('button', { name: 'Change status' }));

    expect(onAction).toHaveBeenCalledWith('Kim');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cancelling the prompt cancels the change', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);

    await user.click(screen.getByRole('button', { name: 'Change status' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onAction).not.toHaveBeenCalled();
  });
});
