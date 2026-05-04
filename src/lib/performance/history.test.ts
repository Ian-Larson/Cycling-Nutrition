import { describe, expect, it } from 'vitest';
import { closestPriorEntry } from './history';

interface Sample {
  id: string;
  recordedAt: string;
  value: number;
}

const fixture: Sample[] = [
  { id: 'a', recordedAt: '2025-01-15', value: 70 },
  { id: 'b', recordedAt: '2025-06-01', value: 72 },
  { id: 'c', recordedAt: '2025-12-20', value: 71 },
];

describe('closestPriorEntry', () => {
  it('returns undefined when history is empty', () => {
    expect(closestPriorEntry([], '2025-06-01')).toBeUndefined();
  });

  it('returns undefined when target precedes the first entry', () => {
    expect(closestPriorEntry(fixture, '2024-12-31')).toBeUndefined();
  });

  it('returns the exact-match entry when one exists', () => {
    expect(closestPriorEntry(fixture, '2025-06-01')?.id).toBe('b');
  });

  it('returns the latest entry on or before the target', () => {
    expect(closestPriorEntry(fixture, '2025-09-15')?.id).toBe('b');
  });

  it('returns the most recent entry when target is after all entries', () => {
    expect(closestPriorEntry(fixture, '2026-05-01')?.id).toBe('c');
  });

  it('does not require input to be pre-sorted', () => {
    const shuffled = [fixture[2], fixture[0], fixture[1]];
    expect(closestPriorEntry(shuffled, '2025-09-15')?.id).toBe('b');
  });
});
