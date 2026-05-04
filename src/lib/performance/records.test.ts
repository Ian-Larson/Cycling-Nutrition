import { describe, expect, it } from 'vitest';
import { computeBestForDuration } from './records';
import type { WeightHistoryEntry } from '@/types/performance';

const weight: WeightHistoryEntry[] = [
  { id: 'w1', recordedAt: '2025-01-01', weightKg: 75 },
  { id: 'w2', recordedAt: '2025-09-01', weightKg: 73 },
];

const activities = [
  {
    stravaId: 'a',
    startedAt: '2025-03-01T10:00:00Z',
    name: 'Spring ride',
    durationS: 3700,
    curve: arrayWithBestAt(3700, 1199, 280), // best 20-min = 280W
  },
  {
    stravaId: 'b',
    startedAt: '2025-10-01T10:00:00Z',
    name: 'Autumn ride',
    durationS: 3700,
    curve: arrayWithBestAt(3700, 1199, 295), // best 20-min = 295W
  },
  {
    stravaId: 'c',
    startedAt: '2025-04-01T10:00:00Z',
    name: 'Short ride',
    durationS: 1000,
    curve: arrayWithBestAt(1000, 999, 400),
  },
];

function arrayWithBestAt(length: number, index: number, value: number): number[] {
  const arr = new Array<number>(length).fill(0);
  arr[index] = value;
  return arr;
}

describe('computeBestForDuration', () => {
  it('returns null when no activity is long enough', () => {
    const result = computeBestForDuration([activities[2]], weight, 1200);
    expect(result).toBeNull();
  });

  it('picks the activity with the highest curve[d-1]', () => {
    const result = computeBestForDuration(activities, weight, 1200);
    expect(result?.stravaId).toBe('b');
    expect(result?.watts).toBe(295);
  });

  it('uses closest-prior weight at the winning activity for w/kg', () => {
    const result = computeBestForDuration(activities, weight, 1200);
    expect(result?.wkg).toBeCloseTo(295 / 73, 2);
    expect(result?.weightKgAtTime).toBe(73);
  });

  it('returns watts but no wkg when weight history is empty', () => {
    const result = computeBestForDuration(activities, [], 1200);
    expect(result?.watts).toBe(295);
    expect(result?.wkg).toBeUndefined();
  });

  it('skips activities with null curves', () => {
    const result = computeBestForDuration(
      [{ ...activities[0], curve: null }, activities[1]],
      weight,
      1200
    );
    expect(result?.stravaId).toBe('b');
  });
});
