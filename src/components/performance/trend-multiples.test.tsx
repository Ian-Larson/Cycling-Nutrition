import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrendMultiples } from './trend-multiples';

describe('TrendMultiples', () => {
  it('focuses the trend card on FTP history', () => {
    render(
      <TrendMultiples
        ftpHistory={[
          { id: 'ftp-1', recordedAt: '2026-02-01', ftpWatts: 270 },
          { id: 'ftp-2', recordedAt: '2026-05-01', ftpWatts: 285 },
        ]}
        ftpWatts={285}
        period="90d"
      />
    );

    expect(screen.getByText(/FTP over time/i)).toBeInTheDocument();
    expect(screen.getByText(/285 W/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/W\/kg, FTP, and weight/i)
    ).not.toBeInTheDocument();
  });
});
