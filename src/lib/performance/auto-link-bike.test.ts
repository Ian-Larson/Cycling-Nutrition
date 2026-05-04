import { describe, expect, it } from 'vitest';
import { resolveBikeLinks } from './auto-link-bike';
import type { Activity } from '@/types/activity';
import type { Bike } from '@/types/gear';

const bikes: Bike[] = [
  // Minimal shape — only the fields auto-link reads. Cast to Bike for the test.
  { id: 'b1', stravaGearId: 'g1' } as Bike,
  { id: 'b2', stravaGearId: 'g2' } as Bike,
];

const baseActivity: Activity = {
  stravaId: 'a1',
  startedAt: '2025-06-01',
  durationS: 0,
  distanceM: null,
  avgWatts: null,
  npWatts: null,
  maxWatts: null,
  kj: null,
  hasPower: false,
  bikeId: null,
  stravaGearId: null,
  name: '',
  source: 'strava',
};

describe('resolveBikeLinks', () => {
  it('returns empty when no activities', () => {
    expect(resolveBikeLinks([], bikes)).toEqual([]);
  });

  it('returns empty when no bikes match', () => {
    const acts: Activity[] = [{ ...baseActivity, stravaGearId: 'unknown' }];
    expect(resolveBikeLinks(acts, bikes)).toEqual([]);
  });

  it('matches strava_gear_id to bike id', () => {
    const acts: Activity[] = [
      { ...baseActivity, stravaId: 'a1', stravaGearId: 'g1' },
      { ...baseActivity, stravaId: 'a2', stravaGearId: 'g2' },
    ];
    expect(resolveBikeLinks(acts, bikes)).toEqual([
      { stravaId: 'a1', bikeId: 'b1' },
      { stravaId: 'a2', bikeId: 'b2' },
    ]);
  });

  it('skips activities already linked', () => {
    const acts: Activity[] = [
      { ...baseActivity, stravaId: 'a1', stravaGearId: 'g1', bikeId: 'b1' },
    ];
    expect(resolveBikeLinks(acts, bikes)).toEqual([]);
  });
});
