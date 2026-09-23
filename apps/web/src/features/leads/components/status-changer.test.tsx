import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StatusChanger } from './status-changer';

describe('StatusChanger', () => {
  it('offers exactly the transitions the server allows', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StatusChanger
        status="NEW"
        allowedTransitions={['CONTACTED', 'LOST']}
        pendingStatus={null}
        onChange={onChange}
      />,
    );

    const buttons = screen.getAllByRole('button').map((button) => button.textContent);
    expect(buttons).toEqual(['Move to Contacted', 'Mark as lost']);

    await user.click(screen.getByRole('button', { name: 'Move to Contacted' }));
    expect(onChange).toHaveBeenCalledWith('CONTACTED');
  });

  it('labels the way back from Lost as "Reopen"', () => {
    render(
      <StatusChanger
        status="LOST"
        allowedTransitions={['NEW']}
        pendingStatus={null}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
  });

  it('explains that a converted lead is final instead of showing buttons', () => {
    render(
      <StatusChanger
        status="CONVERTED"
        allowedTransitions={[]}
        pendingStatus={null}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Converted is a final status.')).toBeInTheDocument();
  });

  it('disables every option while a change is being saved', () => {
    render(
      <StatusChanger
        status="CONTACTED"
        allowedTransitions={['QUALIFIED', 'LOST']}
        pendingStatus="QUALIFIED"
        onChange={() => {}}
      />,
    );
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move to Qualified' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });
});
