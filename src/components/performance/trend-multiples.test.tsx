import { fireEvent, render, screen } from '@testing-library/react';
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

  it('starts the FTP chart at January 1 for year to date', () => {
    render(
      <TrendMultiples
        ftpHistory={[
          { id: 'ftp-1', recordedAt: '2025-12-15', ftpWatts: 205 },
          { id: 'ftp-2', recordedAt: '2026-03-18', ftpWatts: 224 },
          { id: 'ftp-3', recordedAt: '2026-05-13', ftpWatts: 236 },
        ]}
        ftpWatts={236}
        period="ytd"
      />
    );

    expect(screen.getByText('Jan 1')).toBeInTheDocument();
    expect(screen.getByText('May 26')).toBeInTheDocument();
  });

  it('keeps logged FTP step changes in the active point card', () => {
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

    expect(screen.queryByText('+10 W (5.0%)')).not.toBeInTheDocument();
    expect(screen.queryByText('-5 W (2.4%)')).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('img', { name: /FTP history chart/i }), {
      key: 'End',
    });

    expect(screen.getByText('-5 W (2.4%)')).toHaveClass('text-error-700');
  });

  it('keeps the active point card metrics on one line near chart edges', () => {
    render(
      <TrendMultiples
        ftpHistory={[
          { id: 'ftp-1', recordedAt: '2026-03-01', ftpWatts: 200 },
          { id: 'ftp-2', recordedAt: '2026-04-01', ftpWatts: 210 },
          { id: 'ftp-3', recordedAt: '2026-05-01', ftpWatts: 236 },
        ]}
        ftpWatts={236}
        period="90d"
      />
    );

    fireEvent.keyDown(screen.getByRole('img', { name: /FTP history chart/i }), {
      key: 'End',
    });

    const delta = screen.getByText('+26 W (12.4%)');
    const metricRow = delta.parentElement;
    const tooltip = metricRow?.parentElement;

    expect(metricRow).toHaveClass('whitespace-nowrap');
    expect(delta).toHaveClass('whitespace-nowrap');
    expect(tooltip).toHaveClass('w-[8.75rem]');
    expect(tooltip).toHaveClass(
      'left-[clamp(5.125rem,var(--ftp-tooltip-left),calc(100%_-_5.125rem))]'
    );
    expect(tooltip?.style.getPropertyValue('--ftp-tooltip-left')).toMatch(/%$/);
  });

  it('shows each dense FTP step change through the active point card', () => {
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

    const chart = screen.getByRole('img', { name: /FTP history chart/i });

    expect(screen.queryByText('+1 W (0.5%)')).not.toBeInTheDocument();

    fireEvent.keyDown(chart, { key: 'Home' });
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    expect(screen.getByText('+1 W (0.5%)')).toHaveClass('text-success-700');

    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    expect(screen.getByText('+2 W (1.0%)')).toHaveClass('text-success-700');
  });
});
