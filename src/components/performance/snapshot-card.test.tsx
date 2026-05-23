import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SnapshotCard } from './snapshot-card';

describe('SnapshotCard', () => {
  it('presents the current fitness brief with the key editable inputs', () => {
    render(
      <MemoryRouter>
        <SnapshotCard
          currentWkg={4}
          ftpWatts={280}
          weightKg={70}
          ftpHistory={[]}
          weightHistory={[]}
          period="90d"
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Fitness brief/i)).toBeInTheDocument();
    expect(screen.getByText('4.00')).toBeInTheDocument();
    expect(screen.getByText(/280 W/i)).toBeInTheDocument();
    expect(screen.getByText(/70\.0 kg/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Update profile/i })
    ).toHaveAttribute('href', '/account#athlete');
  });
});
