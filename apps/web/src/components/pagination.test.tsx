import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from './pagination';

describe('Pagination', () => {
  it('shows the visible range and moves between pages', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={2} pageSize={20} total={45} onPageChange={onPageChange} />);

    expect(screen.getByText('21–40 of 45')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange.mock.calls).toEqual([[3], [1]]);
  });

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(
      <Pagination page={1} pageSize={20} total={45} onPageChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    rerender(<Pagination page={3} pageSize={20} total={45} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('renders nothing when everything fits on one page', () => {
    const { container } = render(
      <Pagination page={1} pageSize={20} total={5} onPageChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
