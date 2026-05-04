import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SyncButton } from './sync-button';

const baseProps = {
  state: 'idle' as const,
  imported: 0,
  lastSyncedAt: null,
  rateLimitedUntil: null,
  error: null,
  onSync: vi.fn(),
};

describe('SyncButton', () => {
  it('renders Sync rides when idle', () => {
    render(<SyncButton {...baseProps} />);
    expect(screen.getByRole('button', { name: /sync rides/i })).toBeInTheDocument();
  });

  it('disables and shows count while syncing', () => {
    render(<SyncButton {...baseProps} state="syncing" imported={17} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(screen.getByText(/syncing 17/i)).toBeInTheDocument();
  });

  it('shows rate-limit message with formatted time', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    render(
      <SyncButton
        {...baseProps}
        state="rate_limited"
        rateLimitedUntil={future}
      />
    );
    expect(screen.getByText(/strava paused us/i)).toBeInTheDocument();
  });

  it('shows error message in error state', () => {
    render(<SyncButton {...baseProps} state="error" error="Network down" />);
    expect(screen.getByText(/network down/i)).toBeInTheDocument();
  });

  it('calls onSync when clicked', () => {
    const onSync = vi.fn();
    render(<SyncButton {...baseProps} onSync={onSync} />);
    fireEvent.click(screen.getByRole('button', { name: /sync rides/i }));
    expect(onSync).toHaveBeenCalled();
  });
});
