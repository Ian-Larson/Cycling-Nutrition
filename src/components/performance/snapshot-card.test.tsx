import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SnapshotCard } from './snapshot-card';

describe('SnapshotCard', () => {
  it('presents current FTP without the old fitness brief', () => {
    const { container } = render(
      <MemoryRouter>
        <SnapshotCard
          currentWkg={4}
          ftpWatts={280}
          weightKg={70}
          ftpHistory={[]}
          onRecordFtp={() => {}}
          onRemoveFtp={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Fitness brief/i)).not.toBeInTheDocument();
    expect(screen.getByText('Current FTP')).toBeInTheDocument();
    expect(screen.getByText(/280 W/i)).toBeInTheDocument();
    expect(screen.getByText(/4\.00 w\/kg/i)).toBeInTheDocument();
    expect(container.querySelector('.surface-note')).not.toBeInTheDocument();
  });

  it('records FTP directly from the performance page', () => {
    const onRecordFtp = vi.fn();

    render(
      <MemoryRouter>
        <SnapshotCard
          currentWkg={4}
          ftpWatts={280}
          weightKg={70}
          ftpHistory={[]}
          onRecordFtp={onRecordFtp}
          onRemoveFtp={() => {}}
        />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/FTP date/i), {
      target: { value: '2026-05-26' },
    });
    fireEvent.change(screen.getByLabelText(/FTP watts/i), {
      target: { value: '292' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save FTP/i }));

    expect(onRecordFtp).toHaveBeenCalledWith({
      recordedAt: '2026-05-26',
      ftpWatts: 292,
    });
  });

  it('lets the rider delete an FTP entry from recent history', () => {
    const onRemoveFtp = vi.fn();

    render(
      <MemoryRouter>
        <SnapshotCard
          currentWkg={3.6}
          ftpWatts={236}
          weightKg={65.5}
          ftpHistory={[
            { id: 'ftp-1', recordedAt: '2026-05-13', ftpWatts: 236 },
          ]}
          onRecordFtp={() => {}}
          onRemoveFtp={onRemoveFtp}
        />
      </MemoryRouter>
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /delete ftp 236 w from may 13, 2026/i,
      })
    );

    expect(onRemoveFtp).toHaveBeenCalledWith('ftp-1');
  });

  it('lets the rider undo a deleted FTP entry', () => {
    const onRecordFtp = vi.fn();
    const onRemoveFtp = vi.fn();

    render(
      <MemoryRouter>
        <SnapshotCard
          currentWkg={3.6}
          ftpWatts={236}
          weightKg={65.5}
          ftpHistory={[
            { id: 'ftp-1', recordedAt: '2026-05-13', ftpWatts: 236 },
          ]}
          onRecordFtp={onRecordFtp}
          onRemoveFtp={onRemoveFtp}
        />
      </MemoryRouter>
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /delete ftp 236 w from may 13, 2026/i,
      })
    );

    expect(screen.getByRole('status')).toHaveTextContent('FTP entry deleted.');
    fireEvent.click(screen.getByRole('button', { name: /Undo delete/i }));

    expect(onRecordFtp).toHaveBeenCalledWith({
      recordedAt: '2026-05-13',
      ftpWatts: 236,
    });
  });

  it('does not repeat the chart window around recent entries', () => {
    render(
      <MemoryRouter>
        <SnapshotCard
          currentWkg={3.6}
          ftpWatts={236}
          weightKg={65.5}
          ftpHistory={[
            { id: 'ftp-1', recordedAt: '2026-05-13', ftpWatts: 236 },
          ]}
          onRecordFtp={() => {}}
          onRemoveFtp={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText('90d')).not.toBeInTheDocument();
    expect(screen.queryByText(/Last 90d/i)).not.toBeInTheDocument();
  });
});
