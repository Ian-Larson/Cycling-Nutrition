import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BackfillPrompt } from './backfill-prompt';

describe('BackfillPrompt', () => {
  it('renders four window options', () => {
    render(<BackfillPrompt onStart={() => {}} />);
    ['90 days', '6 months', '1 year', 'All'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('calls onStart with the chosen since date', () => {
    const onStart = vi.fn();
    render(<BackfillPrompt onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: '6 months' }));
    expect(onStart).toHaveBeenCalledTimes(1);
    const arg = onStart.mock.calls[0][0];
    expect(typeof arg.since).toBe('string');
    expect(new Date(arg.since).getTime()).toBeLessThan(Date.now());
  });

  it('passes since=epoch zero for All', () => {
    const onStart = vi.fn();
    render(<BackfillPrompt onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onStart.mock.calls[0][0].since).toBe(new Date(0).toISOString());
  });
});
