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

  it('limits step labels when the window has dense FTP changes', () => {
    render(
      <TrendMultiples
        ftpHistory={[
          { id: 'ftp-1', recordedAt: '2025-06-01', ftpWatts: 200 },
          { id: 'ftp-2', recordedAt: '2025-07-01', ftpWatts: 201 },
          { id: 'ftp-3', recordedAt: '2025-08-01', ftpWatts: 203 },
          { id: 'ftp-4', recordedAt: '2025-09-01', ftpWatts: 206 },
          { id: 'ftp-5', recordedAt: '2025-10-01', ftpWatts: 210 },
          { id: 'ftp-6', recordedAt: '2025-11-01', ftpWatts: 209 },
          { id: 'ftp-7', recordedAt: '2025-12-01', ftpWatts: 212 },
          { id: 'ftp-8', recordedAt: '2026-01-01', ftpWatts: 214 },
          { id: 'ftp-9', recordedAt: '2026-02-01', ftpWatts: 215 },
          { id: 'ftp-10', recordedAt: '2026-03-01', ftpWatts: 218 },
          { id: 'ftp-11', recordedAt: '2026-04-01', ftpWatts: 221 },
          { id: 'ftp-12', recordedAt: '2026-05-01', ftpWatts: 224 },
        ]}
        ftpWatts={224}
        period="12mo"
      />
    );

    expect(screen.getAllByText(/[+-]\d+ W \(\d+\.\d%\)/)).toHaveLength(6);
  });
});
