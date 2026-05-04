import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrTile } from './pr-tile';

describe('PrTile', () => {
  it('renders the duration label and a placeholder when no record', () => {
    render(<PrTile label="20 min" record={null} />);
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/no qualifying ride/i)).toBeInTheDocument();
  });

  it('renders w/kg and watts when a record is present', () => {
    render(
      <PrTile
        label="20 min"
        record={{
          stravaId: 'r1',
          name: 'Big effort',
          startedAt: '2025-06-01T10:00:00Z',
          durationSeconds: 1200,
          watts: 295,
          wkg: 4.1,
        }}
      />
    );
    expect(screen.getByText('4.10')).toBeInTheDocument();
    expect(screen.getByText(/295\s*W/)).toBeInTheDocument();
    expect(screen.getByText('Big effort')).toBeInTheDocument();
  });

  it('links to the Strava activity when a record is present', () => {
    render(
      <PrTile
        label="20 min"
        record={{
          stravaId: 'r1',
          name: 'Big effort',
          startedAt: '2025-06-01T10:00:00Z',
          durationSeconds: 1200,
          watts: 295,
          wkg: 4.1,
        }}
      />
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://www.strava.com/activities/r1');
  });

  it('omits the wkg numeral when wkg is undefined', () => {
    render(
      <PrTile
        label="20 min"
        record={{
          stravaId: 'r1',
          name: 'Big effort',
          startedAt: '2025-06-01T10:00:00Z',
          durationSeconds: 1200,
          watts: 295,
        }}
      />
    );
    expect(screen.queryByText(/^\d+\.\d+$/)).not.toBeInTheDocument();
    expect(screen.getByText(/295\s*W/)).toBeInTheDocument();
  });
});
