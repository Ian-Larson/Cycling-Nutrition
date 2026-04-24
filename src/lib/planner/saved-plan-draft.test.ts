import { describe, expect, it } from 'vitest';
import { buildPlannerDraftFromSavedPlan } from './saved-plan-draft';
import type { FuelPlan, Product } from '@/types';

const mix: Product = {
  id: 'mix-1',
  name: 'Mix',
  type: 'drink_mix',
  isAvailable: true,
  nutrition: { carbsGrams: 30, calories: 120 },
  serving: {},
  createdAt: 1,
  updatedAt: 1,
};

const unavailableGel: Product = {
  id: 'gel-1',
  name: 'Gel',
  type: 'gel',
  isAvailable: false,
  nutrition: { carbsGrams: 22, calories: 100 },
  serving: {},
  createdAt: 1,
  updatedAt: 1,
};

const plan: FuelPlan = {
  id: 'plan-1',
  createdAt: 100,
  title: 'Race plan',
  rideCharacteristics: {
    durationMinutes: 180,
    intensity: 'race',
    heatFactor: 'hot',
    carbTargetGramsPerHour: 90,
    planningMode: 'manual',
  },
  bottles: [
    {
      capacityMl: 550,
      productId: 'mix-1',
      mixGrams: 60,
      carbsTotal: 60,
    },
    {
      capacityMl: 750,
      productId: 'mix-1',
      mixGrams: 70,
      carbsTotal: 70,
    },
  ],
  solids: [
    {
      productId: 'gel-1',
      quantity: 2,
      carbsTotal: 44,
      timingIntervalMinutes: 45,
    },
  ],
  consumptionGuide: [],
  summary: {
    totalCarbsPlanned: 174,
    totalCaloriesPlanned: 696,
    totalCarbsNeeded: 270,
    hydrationMl: 1300,
  },
};

describe('buildPlannerDraftFromSavedPlan', () => {
  it('derives selected bottles, mix, solids, and title', () => {
    expect(buildPlannerDraftFromSavedPlan(plan, [mix])).toEqual({
      ride: plan.rideCharacteristics,
      selectedBottleCounts: { 550: 1, 750: 1, 950: 0 },
      selectedDrinkMixId: 'mix-1',
      selectedSolidIds: ['gel-1'],
      includeUnavailableProducts: false,
      title: 'Race plan',
    });
  });

  it('flags unavailable products used by the saved plan', () => {
    expect(
      buildPlannerDraftFromSavedPlan(plan, [mix, unavailableGel])
        .includeUnavailableProducts
    ).toBe(true);
  });

  it('handles water-only bottles without selecting a mix', () => {
    const waterOnly = {
      ...plan,
      bottles: [
        {
          capacityMl: 950,
          productId: '',
          mixGrams: 0,
          carbsTotal: 0,
          isWaterOnly: true,
        },
      ],
      solids: [],
      title: undefined,
    };

    expect(buildPlannerDraftFromSavedPlan(waterOnly, [])).toMatchObject({
      selectedBottleCounts: { 550: 0, 750: 0, 950: 1 },
      selectedDrinkMixId: null,
      selectedSolidIds: [],
      includeUnavailableProducts: false,
      title: undefined,
    });
  });
});
