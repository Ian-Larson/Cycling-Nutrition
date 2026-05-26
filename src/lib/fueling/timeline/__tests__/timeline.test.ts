import { describe, it, expect } from 'vitest';
import { buildPreRideTimeline } from '../pre-ride-timeline';
import { buildDuringTimeline } from '../during-timeline';
import { buildPostRideTimeline } from '../post-ride-timeline';
import { mergeTimelines } from '../merge';
import type {
  PreRidePrescription,
  DuringRidePrescription,
  PostRidePrescription,
} from '../../types';

describe('pre-ride timeline', () => {
  it('emits meal + caffeine + top-up events', () => {
    const pre: PreRidePrescription = {
      carbsGrams: 140,
      carbsGPerKg: 2.0,
      windowHoursBefore: 2,
      proteinGrams: 21,
      caffeineMg: 210,
      caffeineTimingMinutesBefore: 45,
      notes: [],
    };
    const items = buildPreRideTimeline(pre);
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.every((i) => i.phase === 'pre')).toBe(true);
    expect(items.some((i) => i.offsetMinutesFromStart === -120)).toBe(true);
    expect(items.some((i) => i.caffeineMg && i.caffeineMg > 0)).toBe(true);
  });

  it('returns empty for undefined pre-ride', () => {
    expect(buildPreRideTimeline(undefined)).toHaveLength(0);
  });
});

describe('during-ride timeline', () => {
  it('generates feeding events for a 2h ride', () => {
    const during: DuringRidePrescription = {
      carbsGPerHour: 60,
      totalCarbsGrams: 120,
      hydrationMlPerHour: 700,
      totalHydrationMl: 1400,
      sodiumMgPerHour: 400,
      sodiumMgPerLiterTargetInBottles: 571,
      bottleConcentrationGPerMl: 0.086,
      usesMultiTransportableCarbs: false,
      strategy: 'steady',
    };
    const items = buildDuringTimeline(during, undefined, 120);
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(items.every((i) => i.phase === 'during')).toBe(true);
    expect(items.every((i) => i.offsetMinutesFromStart >= 0)).toBe(true);
  });

  it('hydration-only for 0 carbs', () => {
    const during: DuringRidePrescription = {
      carbsGPerHour: 0,
      totalCarbsGrams: 0,
      hydrationMlPerHour: 500,
      totalHydrationMl: 500,
      sodiumMgPerHour: 0,
      sodiumMgPerLiterTargetInBottles: 0,
      bottleConcentrationGPerMl: 0,
      usesMultiTransportableCarbs: false,
      strategy: 'steady',
    };
    const items = buildDuringTimeline(during, undefined, 60);
    expect(items.length).toBe(1);
    expect(items[0].action).toContain('Hydration');
  });

  it('inserts refuel stops', () => {
    const during: DuringRidePrescription = {
      carbsGPerHour: 60,
      totalCarbsGrams: 240,
      hydrationMlPerHour: 700,
      totalHydrationMl: 2800,
      sodiumMgPerHour: 400,
      sodiumMgPerLiterTargetInBottles: 571,
      bottleConcentrationGPerMl: 0.086,
      usesMultiTransportableCarbs: false,
      strategy: 'steady',
    };
    const items = buildDuringTimeline(during, undefined, 240, [120]);
    expect(items.some((i) => i.action.toLowerCase().includes('refuel'))).toBe(
      true,
    );
  });

  it('names solid sources in ride cues when the pack list has product names', () => {
    const during: DuringRidePrescription = {
      carbsGPerHour: 60,
      totalCarbsGrams: 120,
      hydrationMlPerHour: 700,
      totalHydrationMl: 1400,
      sodiumMgPerHour: 400,
      sodiumMgPerLiterTargetInBottles: 571,
      bottleConcentrationGPerMl: 0.086,
      usesMultiTransportableCarbs: false,
      strategy: 'steady',
    };

    const items = buildDuringTimeline(
      during,
      {
        bottles: [],
        solids: [
          {
            productId: 'gel',
            productName: 'GU Energy Gel',
            quantity: 1,
            carbsTotal: 22,
            timingIntervalMinutes: 60,
          },
          {
            productId: 'chew',
            productName: 'PF 30 Chew',
            quantity: 1,
            carbsTotal: 30,
            timingIntervalMinutes: 60,
          },
        ],
      },
      120,
    );

    expect(items.some((item) => item.action === 'Eat GU Energy Gel')).toBe(true);
    expect(items.some((item) => item.action === 'Eat PF 30 Chew')).toBe(true);
  });
});

describe('post-ride timeline', () => {
  it('generates recovery events for rapid mode', () => {
    const post: PostRidePrescription = {
      mode: 'rapid',
      window1: {
        carbsGrams: 168,
        proteinGrams: 49,
        fluidsMl: 1500,
        sodiumMg: 900,
      },
      window2: { carbsGrams: 140, proteinGrams: 21 },
      recommendRecoveryDrink: true,
      notes: ['feed every 15–30 min'],
    };
    const items = buildPostRideTimeline(post, 120);
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.every((i) => i.phase === 'post')).toBe(true);
    expect(items[0].offsetMinutesFromStart).toBe(120); // right after ride
  });

  it('returns empty when no post-ride', () => {
    expect(buildPostRideTimeline(undefined)).toHaveLength(0);
  });
});

describe('mergeTimelines', () => {
  it('sorts by offset and computes cumulative carbs', () => {
    const items = mergeTimelines([
      [
        {
          offsetMinutesFromStart: 60,
          action: 'B',
          carbsGrams: 20,
          cumulativeCarbs: 0,
          phase: 'during' as const,
        },
      ],
      [
        {
          offsetMinutesFromStart: -60,
          action: 'A',
          carbsGrams: 100,
          cumulativeCarbs: 0,
          phase: 'pre' as const,
        },
      ],
      [
        {
          offsetMinutesFromStart: 120,
          action: 'C',
          carbsGrams: 50,
          cumulativeCarbs: 0,
          phase: 'post' as const,
        },
      ],
    ]);
    expect(items[0].action).toBe('A');
    expect(items[0].cumulativeCarbs).toBe(100);
    expect(items[1].cumulativeCarbs).toBe(120);
    expect(items[2].cumulativeCarbs).toBe(170);
  });
});
