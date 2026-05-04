import { describe, expect, it } from 'vitest';
import {
  computeCurrentWkg,
  computeWkgAtDate,
  computeWkgDeltaVsDaysAgo,
} from './wkg';
import type {
  FtpHistoryEntry,
  WeightHistoryEntry,
} from '@/types/performance';

const ftp: FtpHistoryEntry[] = [
  { id: 'f1', recordedAt: '2025-01-01', ftpWatts: 250 },
  { id: 'f2', recordedAt: '2025-06-01', ftpWatts: 270 },
];

const weight: WeightHistoryEntry[] = [
  { id: 'w1', recordedAt: '2025-01-01', weightKg: 75 },
  { id: 'w2', recordedAt: '2025-09-01', weightKg: 73 },
];

describe('computeWkgAtDate', () => {
  it('returns undefined when either history is empty before target', () => {
    expect(computeWkgAtDate([], weight, '2025-12-01')).toBeUndefined();
    expect(computeWkgAtDate(ftp, [], '2025-12-01')).toBeUndefined();
  });

  it('uses closest-prior FTP and weight', () => {
    // 2025-07-15 → ftp 270 (since 2025-06-01), weight 75 (since 2025-01-01)
    expect(computeWkgAtDate(ftp, weight, '2025-07-15')).toBeCloseTo(3.6, 2);
  });

  it('updates when a new weight applies', () => {
    // 2025-12-01 → ftp 270, weight 73
    expect(computeWkgAtDate(ftp, weight, '2025-12-01')).toBeCloseTo(3.7, 2);
  });
});

describe('computeCurrentWkg', () => {
  it('returns undefined when ftp or weight is missing', () => {
    expect(computeCurrentWkg(undefined, 70)).toBeUndefined();
    expect(computeCurrentWkg(250, undefined)).toBeUndefined();
    expect(computeCurrentWkg(0, 70)).toBeUndefined();
    expect(computeCurrentWkg(250, 0)).toBeUndefined();
  });

  it('divides ftp by weight', () => {
    expect(computeCurrentWkg(280, 70)).toBeCloseTo(4.0, 2);
  });
});

describe('computeWkgDeltaVsDaysAgo', () => {
  it('returns undefined when there is no historical w/kg to compare against', () => {
    const result = computeWkgDeltaVsDaysAgo({
      ftpHistory: [],
      weightHistory: [],
      currentWkg: 4.0,
      daysAgo: 90,
      now: new Date('2026-01-01'),
    });
    expect(result).toBeUndefined();
  });

  it('returns the signed delta vs. the date N days ago', () => {
    const result = computeWkgDeltaVsDaysAgo({
      ftpHistory: ftp,
      weightHistory: weight,
      currentWkg: 3.7, // matches computeWkgAtDate('2025-12-01')
      daysAgo: 90,
      now: new Date('2026-03-01'),
    });
    // 2025-12-01 was 3.7, current 3.7 → delta 0
    expect(result).toBeCloseTo(0, 2);
  });
});
