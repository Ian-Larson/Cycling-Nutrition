import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PeriodPresetSelector } from './period-preset-selector';
import type { PeriodPreset } from '@/lib/performance/period';

describe('PeriodPresetSelector', () => {
  it('renders three options', () => {
    render(
      <PeriodPresetSelector value="last-90d-vs-previous-90d" onChange={() => {}} />
    );
    expect(screen.getByRole('button', { name: /last 90d/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /this year/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /last 30d/i })).toBeInTheDocument();
  });

  it('marks the active option as pressed', () => {
    render(
      <PeriodPresetSelector value="this-year-vs-last-year" onChange={() => {}} />
    );
    expect(
      screen.getByRole('button', { name: /this year/i })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange with the preset key', () => {
    const onChange = vi.fn<(p: PeriodPreset) => void>();
    render(
      <PeriodPresetSelector value="last-90d-vs-previous-90d" onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: /this year/i }));
    expect(onChange).toHaveBeenCalledWith('this-year-vs-last-year');
  });
});
