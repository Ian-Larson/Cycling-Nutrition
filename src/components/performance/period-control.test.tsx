import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PeriodControl } from './period-control';

describe('PeriodControl', () => {
  it('renders all four period options', () => {
    render(<PeriodControl value="90d" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Last 30d' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Last 90d' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Last 6 months' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Last 12 months' })).toBeInTheDocument();
  });

  it('marks the active option with aria-checked', () => {
    render(<PeriodControl value="6mo" onChange={() => {}} />);
    const active = screen.getByRole('radio', { name: 'Last 6 months' });
    expect(active).toHaveAttribute('aria-checked', 'true');
  });

  it('emits onChange with the next key', () => {
    const onChange = vi.fn();
    render(<PeriodControl value="90d" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Last 30d' }));
    expect(onChange).toHaveBeenCalledWith('30d');
  });
});
