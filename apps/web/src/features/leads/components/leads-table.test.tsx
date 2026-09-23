import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { LeadSummary } from '../types';
import { LeadsTable } from './leads-table';

const lead = (overrides: Partial<LeadSummary>): LeadSummary => ({
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: null,
  status: 'CONTACTED',
  platform: 'ig',
  isOrganic: false,
  formId: 'form-1',
  campaignName: 'Autumn',
  metaCreatedAt: '2026-09-24T10:15:00.000Z',
  createdAt: '2026-09-24T10:15:05.000Z',
  updatedAt: '2026-09-24T10:15:05.000Z',
  ...overrides,
});

function renderTable(leads: LeadSummary[]) {
  return render(
    <MemoryRouter>
      <LeadsTable leads={leads} />
    </MemoryRouter>,
  );
}

describe('LeadsTable', () => {
  it('links each lead to its detail page and shows status as text', () => {
    renderTable([lead({})]);
    const table = screen.getByRole('table');

    expect(within(table).getByRole('link', { name: 'Ada Lovelace' })).toHaveAttribute(
      'href',
      '/leads/11111111-1111-4111-8111-111111111111',
    );
    expect(within(table).getByText('Contacted')).toBeInTheDocument();
    expect(within(table).getByText('Instagram · Paid')).toBeInTheDocument();
  });

  it('has proper column headers for screen readers', () => {
    renderTable([lead({})]);
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Lead',
      'Status',
      'Source',
      'Campaign',
      'Submitted',
    ]);
  });

  it('falls back gracefully when Meta sent no name, contact or attribution', () => {
    renderTable([
      lead({
        fullName: null,
        email: null,
        phone: null,
        platform: null,
        isOrganic: null,
        campaignName: null,
      }),
    ]);
    const table = screen.getByRole('table');
    expect(within(table).getByRole('link', { name: 'Unnamed lead' })).toBeInTheDocument();
    expect(within(table).getByText('No contact details')).toBeInTheDocument();
  });
});
