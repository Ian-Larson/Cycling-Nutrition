import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RangeToggle, type RangeKey } from './range-toggle';

describe('RangeToggle', () => {
  it('renders four options', () => {
    render(<RangeToggle value="12mo" onChange={() => {}} />);
    ['3mo', '6mo', '12mo', 'All'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('marks the current option as pressed', () => {
    render(<RangeToggle value="6mo" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '6mo' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: '12mo' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('calls onChange with the clicked key', () => {
    const onChange = vi.fn<(key: RangeKey) => void>();
    render(<RangeToggle value="12mo" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '3mo' }));
    expect(onChange).toHaveBeenCalledWith('3mo');
  });
});
