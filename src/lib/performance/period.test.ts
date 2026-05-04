import { describe, expect, it } from 'vitest';
import { resolveComparisonPeriods } from './period';

const NOW = new Date('2026-05-04T12:00:00Z');

describe('resolveComparisonPeriods', () => {
  it('this-year-vs-last-year produces two calendar-year windows', () => {
    const { current, comparison } = resolveComparisonPeriods(
      'this-year-vs-last-year',
      NOW
    );
    expect(current.fromIso).toBe('2026-01-01T00:00:00.000Z');
    expect(current.toIso).toBe('2026-05-04T12:00:00.000Z');
    expect(comparison.fromIso).toBe('2025-01-01T00:00:00.000Z');
    expect(comparison.toIso).toBe('2025-12-31T23:59:59.999Z');
  });

  it('last-90d-vs-previous-90d uses trailing windows', () => {
    const { current, comparison } = resolveComparisonPeriods(
      'last-90d-vs-previous-90d',
      NOW
    );
    expect(new Date(current.toIso).getTime()).toBe(NOW.getTime());
    const expectedStart = new Date(NOW.getTime() - 90 * 24 * 60 * 60 * 1000);
    expect(current.fromIso).toBe(expectedStart.toISOString());
    expect(new Date(comparison.toIso).getTime()).toBe(expectedStart.getTime());
    const expectedComparisonStart = new Date(
      NOW.getTime() - 180 * 24 * 60 * 60 * 1000
    );
    expect(comparison.fromIso).toBe(expectedComparisonStart.toISOString());
  });

  it('last-30d-vs-all-time-best produces a 30d trailing and an open-ended past window', () => {
    const { current, comparison } = resolveComparisonPeriods(
      'last-30d-vs-all-time-best',
      NOW
    );
    expect(new Date(current.toIso).getTime()).toBe(NOW.getTime());
    const expectedStart = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(current.fromIso).toBe(expectedStart.toISOString());
    expect(comparison.fromIso).toBe(new Date(0).toISOString());
    expect(comparison.toIso).toBe(NOW.toISOString());
  });
});
