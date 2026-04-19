import { describe, it, expect } from 'vitest';
import { migrateV2Plan } from '../v2-to-v3';
import type { FuelPlan } from '@/types';

describe('migrateV2Plan', () => {
  it('converts a minimal v2 FuelPlan to a v3-migrated prescription', () => {
    const v2Plan: FuelPlan = {
      id: 'plan-1',
      rideCharacteristics: {
        durationMinutes: 120,
        intensity: 'tempo',
        heatFactor: 'moderate',
        carbTargetGramsPerHour: 60,
      },
      bottles: [
        {
          capacityMl: 750,
          productId: 'mix1',
          mixGrams: 60,
          carbsTotal: 45,
          isWaterOnly: false,
        },
      ],
      solids: [
        {
          productId: 'gel1',
          quantity: 2,
          carbsTotal: 44,
          timingIntervalMinutes: 40,
        },
      ],
      consumptionGuide: [
        {
          timeOffsetMinutes: 0,
          action: 'Start sipping bottle',
          carbsConsumed: 15,
          cumulativeCarbs: 15,
        },
        {
          timeOffsetMinutes: 40,
          action: 'Eat 1 gel',
          carbsConsumed: 22,
          cumulativeCarbs: 37,
        },
      ],
      warnings: [
        { type: 'concentration_limit', message: 'Max concentration reached' },
      ],
      summary: {
        totalCarbsPlanned: 89,
        totalCaloriesPlanned: 356,
        totalCarbsNeeded: 120,
        hydrationMl: 1400,
        sodiumMgPerHour: 450,
      },
      createdAt: Date.now(),
    };

    const migrated = migrateV2Plan(v2Plan);

    expect(migrated.engineVersion).toBe('v3-migrated');
    expect(migrated.during).toBeDefined();
    expect(migrated.during!.carbsGPerHour).toBe(60); // 120g / 2h
    expect(migrated.during!.hydrationMlPerHour).toBe(700); // 1400ml / 2h
    expect(migrated.during!.totalCarbsGrams).toBe(120);
    expect(migrated.during!.totalHydrationMl).toBe(1400);
    expect(migrated.during!.sodiumMgPerHour).toBe(450);

    expect(migrated.timeline).toBeDefined();
    expect(migrated.timeline!.length).toBe(2);
    expect(migrated.timeline![0].phase).toBe('during');

    expect(migrated.warnings).toBeDefined();
    expect(migrated.warnings!.length).toBe(1);
    expect(migrated.warnings![0].code).toBe('bottle-concentration-exceeded');

    // v2 didn't have these
    expect(migrated.pre).toBeUndefined();
    expect(migrated.post).toBeUndefined();
    expect(migrated.daily).toBeUndefined();
    expect(migrated.carbLoad).toBeUndefined();

    // Low confidence for migrated plans
    expect(migrated.confidence!.score).toBe(0.3);
    expect(migrated.confidence!.missing).toContain('migrated-from-v2');
  });

  it('handles a zero-duration plan gracefully', () => {
    const v2Plan: FuelPlan = {
      id: 'plan-0',
      rideCharacteristics: {
        durationMinutes: 0,
        intensity: 'recovery',
        heatFactor: 'cool',
        carbTargetGramsPerHour: 0,
      },
      bottles: [],
      solids: [],
      consumptionGuide: [],
      summary: {
        totalCarbsPlanned: 0,
        totalCaloriesPlanned: 0,
        totalCarbsNeeded: 0,
        hydrationMl: 0,
      },
      createdAt: Date.now(),
    };

    const migrated = migrateV2Plan(v2Plan);
    expect(migrated.engineVersion).toBe('v3-migrated');
    expect(migrated.during!.carbsGPerHour).toBe(0);
    expect(migrated.during!.hydrationMlPerHour).toBe(0);
  });
});
