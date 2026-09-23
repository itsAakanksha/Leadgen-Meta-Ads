import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { LeadActivity } from '../types';
import { ActivityTimeline } from './activity-timeline';

const activities: LeadActivity[] = [
  {
    id: 'a1',
    type: 'LEAD_CREATED',
    actor: 'system:meta',
    payload: {},
    createdAt: '2026-09-24T09:00:00.000Z',
  },
  {
    id: 'a2',
    type: 'STATUS_CHANGED',
    actor: 'user:Sam',
    payload: { from: 'NEW', to: 'CONTACTED' },
    createdAt: '2026-09-24T10:00:00.000Z',
  },
  {
    id: 'a3',
    type: 'LEAD_UPDATED',
    actor: 'user:anonymous',
    payload: {
      changes: {
        email: { from: 'old@example.com', to: 'new@example.com' },
        notes: { from: null, to: 'Call Monday' },
      },
    },
    createdAt: '2026-09-24T11:00:00.000Z',
  },
];

describe('ActivityTimeline', () => {
  it('lists the newest entry first, with who made each change', () => {
    render(<ActivityTimeline activities={activities} />);
    const items = screen.getAllByRole('listitem');

    expect(items[0]).toHaveTextContent('Updated 2 fields');
    expect(items[0]).toHaveTextContent('Anonymous');
    expect(items[1]).toHaveTextContent('Status changed');
    expect(items[1]).toHaveTextContent('Sam');
    expect(items[2]).toHaveTextContent('Lead received from a Meta lead form');
    expect(items[2]).toHaveTextContent('Meta');
  });

  it('shows the old and new status as text', () => {
    render(<ActivityTimeline activities={activities} />);
    const statusChange = screen.getAllByRole('listitem')[1]!;
    expect(within(statusChange).getByText('New')).toBeInTheDocument();
    expect(within(statusChange).getByText('Contacted')).toBeInTheDocument();
  });

  it('shows a field-level diff: the old value struck out, the new value, and empty values', () => {
    render(<ActivityTimeline activities={activities} />);
    const update = screen.getAllByRole('listitem')[0]!;

    expect(within(update).getByText('old@example.com').tagName).toBe('DEL');
    expect(within(update).getByText('new@example.com').tagName).toBe('INS');
    expect(within(update).getByText('Email')).toBeInTheDocument();
    expect(within(update).getByText('empty')).toBeInTheDocument(); // notes had no value before
    expect(within(update).getByText('Call Monday')).toBeInTheDocument();
  });

  it('gives each entry a machine-readable time', () => {
    render(<ActivityTimeline activities={activities} />);
    expect(screen.getAllByRole('listitem')[2]!.querySelector('time')).toHaveAttribute(
      'datetime',
      '2026-09-24T09:00:00.000Z',
    );
  });
});
