import { describe, expect, it } from 'vitest';
import { resolvePeriodComparison } from './period';

const NOW = new Date('2026-05-04T12:00:00Z');
const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('resolvePeriodComparison', () => {
  it('30d uses a trailing 30-day window with prior 30-day comparison', () => {
    const { current, comparison } = resolvePeriodComparison('30d', NOW);
    expect(new Date(current.toIso).getTime()).toBe(NOW.getTime());
    expect(current.fromIso).toBe(
      new Date(NOW.getTime() - 30 * MS_PER_DAY).toISOString()
    );
    expect(comparison.toIso).toBe(current.fromIso);
    expect(comparison.fromIso).toBe(
      new Date(NOW.getTime() - 60 * MS_PER_DAY).toISOString()
    );
  });

  it('90d uses a trailing 90-day window with prior 90-day comparison', () => {
    const { current, comparison } = resolvePeriodComparison('90d', NOW);
    expect(current.fromIso).toBe(
      new Date(NOW.getTime() - 90 * MS_PER_DAY).toISOString()
    );
    expect(comparison.fromIso).toBe(
      new Date(NOW.getTime() - 180 * MS_PER_DAY).toISOString()
    );
    expect(comparison.toIso).toBe(current.fromIso);
  });

  it('6mo uses a trailing 180-day window', () => {
    const { current } = resolvePeriodComparison('6mo', NOW);
    expect(current.fromIso).toBe(
      new Date(NOW.getTime() - 180 * MS_PER_DAY).toISOString()
    );
  });

  it('12mo uses a trailing 365-day window', () => {
    const { current } = resolvePeriodComparison('12mo', NOW);
    expect(current.fromIso).toBe(
      new Date(NOW.getTime() - 365 * MS_PER_DAY).toISOString()
    );
  });

  it('ytd starts on January 1 with a prior year-to-date comparison', () => {
    const { current, comparison } = resolvePeriodComparison('ytd', NOW);
    expect(current.fromIso).toBe('2026-01-01T00:00:00.000Z');
    expect(current.toIso).toBe(NOW.toISOString());
    expect(comparison.fromIso).toBe('2025-01-01T00:00:00.000Z');
    expect(comparison.toIso).toBe('2025-05-04T12:00:00.000Z');
  });

  it('labels reflect the selected period', () => {
    const { current, comparison } = resolvePeriodComparison('12mo', NOW);
    expect(current.label).toBe('Last 1 year');
    expect(comparison.label).toBe('Prior 1 year');
  });

  it('labels year to date clearly', () => {
    const { current, comparison } = resolvePeriodComparison('ytd', NOW);
    expect(current.label).toBe('Year to date');
    expect(comparison.label).toBe('Prior YTD');
  });
});
