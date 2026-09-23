import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LeadAnswers } from './lead-answers';
import { LeadConsents } from './lead-consents';

describe('LeadAnswers', () => {
  it('shows every answer with a readable question name', () => {
    render(
      <LeadAnswers
        fieldData={[
          { name: 'full_name', values: ['Ada Lovelace'] },
          { name: 'what_is_your_budget?', values: ['10k-50k'] },
          { name: 'preferred_days', values: ['Mon', 'Wed'] },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Form answers' })).toBeInTheDocument();
    expect(screen.getByText('What is your budget?')).toBeInTheDocument();
    expect(screen.getByText('10k-50k')).toBeInTheDocument();
    expect(screen.getByText('Mon, Wed')).toBeInTheDocument();
  });

  it('says so when Meta returned no answers', () => {
    render(<LeadAnswers fieldData={[]} />);
    expect(screen.getByText('Meta returned no answers for this lead.')).toBeInTheDocument();
  });
});

describe('LeadConsents', () => {
  it('states agreement in words, not only with an icon', () => {
    render(
      <LeadConsents
        responses={[
          { checkbox_key: 'marketing_opt_in', is_checked: true },
          { checkbox_key: 'terms', is_checked: false },
        ]}
      />,
    );
    expect(screen.getByText('Marketing opt in').parentElement).toHaveTextContent('Agreed');
    expect(screen.getByText('Terms').parentElement).toHaveTextContent('Not agreed');
  });
});
