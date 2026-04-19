import { describe, expect, it } from 'vitest';
import { calculateFuelPlan } from './index';
import type { Product, RideCharacteristics } from '@/types';
import type { BottleSlot } from './bottles';

const baseBottles: BottleSlot[] = [
  { capacityMl: 750 },
  { capacityMl: 950 },
];

const drinkMix: Product = {
  id: 'mix-1',
  name: 'Carb Mix',
  type: 'drink_mix',
  isAvailable: true,
  nutrition: {
    carbsGrams: 40,
    calories: 150,
  },
  serving: {
    servingSizeGrams: 40,
    scoopSizeGrams: 20,
  },
  createdAt: 0,
  updatedAt: 0,
};

function getExpectedDrinkCalories(plan: ReturnType<typeof calculateFuelPlan>) {
  const refuelMultiplier = (plan.rideCharacteristics.refuelStops || 0) + 1;

  return (
    plan.bottles.reduce((sum, allocation) => {
      return (
        sum +
        Math.round(
          (drinkMix.nutrition.calories / drinkMix.nutrition.carbsGrams) *
            allocation.carbsTotal
        )
      );
    }, 0) * refuelMultiplier
  );
}

describe('calculateFuelPlan summary behavior', () => {
  it('keeps manual mode summary unchanged (no sodium fields)', () => {
    const ride: RideCharacteristics = {
      durationMinutes: 120,
      intensity: 'endurance',
      heatFactor: 'moderate',
      carbTargetGramsPerHour: 60,
      planningMode: 'manual',
    };

    const plan = calculateFuelPlan({
      ride,
      availableBottles: baseBottles,
      drinkMix,
      availableSolids: [],
    });

    expect(plan.summary.hydrationMl).toBe(1000);
    expect(plan.summary.totalCaloriesPlanned).toBe(getExpectedDrinkCalories(plan));
    expect(plan.summary.sodiumMgPerHour).toBeUndefined();
    expect(plan.summary.sodiumMgTotal).toBeUndefined();
  });

  it('uses auto hydration override and adds sodium summary fields', () => {
    const ride: RideCharacteristics = {
      durationMinutes: 120,
      intensity: 'tempo',
      heatFactor: 'moderate',
      carbTargetGramsPerHour: 80,
      planningMode: 'auto',
      autoMetrics: {
        inputPair: 'duration_if',
        intensityFactor: 0.8,
        tss: 128,
        normalizedPowerWatts: 200,
        kilojoulesPerHour: 720,
        autoCarbTargetGramsPerHour: 80,
        hydrationMlPerHour: 900,
        sodiumMgPerHour: 1000,
        carbOverrideApplied: false,
      },
    };

    const plan = calculateFuelPlan({
      ride,
      availableBottles: baseBottles,
      drinkMix,
      availableSolids: [],
    });

    expect(plan.summary.hydrationMl).toBe(1800);
    expect(plan.summary.totalCaloriesPlanned).toBe(getExpectedDrinkCalories(plan));
    expect(plan.summary.sodiumMgPerHour).toBe(1000);
    expect(plan.summary.sodiumMgTotal).toBe(2000);
  });
});
