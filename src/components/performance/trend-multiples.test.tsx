import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrendMultiples } from './trend-multiples';

describe('TrendMultiples', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-26T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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
    expect(screen.queryByText('Window')).not.toBeInTheDocument();
    expect(screen.queryByText(/Logged threshold changes/i)).not.toBeInTheDocument();
  });

  it('uses the latest FTP history entry instead of a stale profile FTP', () => {
    render(
      <TrendMultiples
        ftpHistory={[
          { id: 'ftp-1', recordedAt: '2026-02-18', ftpWatts: 206 },
          { id: 'ftp-2', recordedAt: '2026-03-18', ftpWatts: 224 },
          { id: 'ftp-3', recordedAt: '2026-04-15', ftpWatts: 229 },
          { id: 'ftp-4', recordedAt: '2026-05-13', ftpWatts: 236 },
        ]}
        ftpWatts={229}
        period="90d"
      />
    );

    expect(screen.getByText('236 W')).toBeInTheDocument();
    expect(screen.queryByText('229 W')).not.toBeInTheDocument();
  });

  it('labels logged FTP step changes with watts and percent', () => {
    render(
      <TrendMultiples
        ftpHistory={[
          { id: 'ftp-1', recordedAt: '2026-03-01', ftpWatts: 200 },
          { id: 'ftp-2', recordedAt: '2026-04-01', ftpWatts: 210 },
          { id: 'ftp-3', recordedAt: '2026-05-01', ftpWatts: 205 },
        ]}
        ftpWatts={205}
        period="90d"
      />
    );

    expect(screen.getByText('+10 W (5.0%)')).toHaveClass('text-success-700');
    expect(screen.getByText('-5 W (2.4%)')).toHaveClass('text-error-700');
  });
});
