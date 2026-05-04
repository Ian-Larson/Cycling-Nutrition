import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useStore } from '@/store';
import { HistoryEditor } from './history-editor';

function resetStore() {
  useStore.setState({ ftpHistory: [], weightHistory: [] });
}

describe('HistoryEditor', () => {
  it('lists FTP entries newest-first', () => {
    resetStore();
    useStore.getState().addFtpEntry({ recordedAt: '2025-01-01', ftpWatts: 250 });
    useStore.getState().addFtpEntry({ recordedAt: '2025-06-01', ftpWatts: 270 });
    render(<HistoryEditor />);
    const rows = screen.getAllByTestId('ftp-history-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('270');
    expect(rows[1]).toHaveTextContent('250');
  });

  it('adds a new FTP entry from the form', () => {
    resetStore();
    render(<HistoryEditor />);
    fireEvent.change(screen.getByLabelText(/ftp date/i), {
      target: { value: '2025-09-01' },
    });
    fireEvent.change(screen.getByLabelText(/ftp watts/i), {
      target: { value: '275' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add ftp/i }));
    expect(useStore.getState().ftpHistory).toHaveLength(1);
    expect(useStore.getState().ftpHistory[0].ftpWatts).toBe(275);
  });

  it('removes an entry when delete is clicked', () => {
    resetStore();
    useStore.getState().addFtpEntry({ recordedAt: '2025-01-01', ftpWatts: 250 });
    render(<HistoryEditor />);
    fireEvent.click(screen.getByRole('button', { name: /delete ftp 250/i }));
    expect(useStore.getState().ftpHistory).toHaveLength(0);
  });
});
