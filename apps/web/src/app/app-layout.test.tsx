import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { AppLayout } from './app-layout';

function renderLayout() {
  const router = createMemoryRouter([{ element: <AppLayout />, children: [{ index: true }] }]);
  return render(<RouterProvider router={router} />);
}

describe('display name (actor)', () => {
  it('asks for a name, remembers it and shows it', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'Set your name' }));
    const dialog = screen.getByRole('dialog', { name: 'Your name' });
    await user.type(screen.getByLabelText('Display name'), '  Sam Lee ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(dialog).not.toBeInTheDocument();
    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
    expect(window.localStorage.getItem('lead-intake.actor')).toBe('Sam Lee');
    expect(screen.getByRole('button', { name: 'Change name' })).toBeInTheDocument();
  });

  it('cannot save an empty name', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'Set your name' }));
    await user.type(screen.getByLabelText('Display name'), '   ');

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('has a skip link to the main content', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
  });
});
