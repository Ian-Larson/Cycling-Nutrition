import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PeriodControl } from './period-control';

describe('PeriodControl', () => {
  it('renders the FTP tracking window options', () => {
    render(<PeriodControl value="90d" onChange={() => {}} />);
    expect(screen.queryByRole('radio', { name: 'Last 30d' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Last 90d' })).toHaveTextContent('90d');
    expect(screen.getByRole('radio', { name: 'Last 6 months' })).toHaveTextContent('6 months');
    expect(screen.getByRole('radio', { name: 'Year to date' })).toHaveTextContent('YTD');
    expect(screen.getByRole('radio', { name: 'Last 1 year' })).toHaveTextContent('1 year');
  });

  it('marks the active option with aria-checked', () => {
    render(<PeriodControl value="12mo" onChange={() => {}} />);
    const active = screen.getByRole('radio', { name: 'Last 1 year' });
    expect(active).toHaveAttribute('aria-checked', 'true');
  });

  it('emits onChange with the next key', () => {
    const onChange = vi.fn();
    render(<PeriodControl value="90d" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Year to date' }));
    expect(onChange).toHaveBeenCalledWith('ytd');
  });
});
