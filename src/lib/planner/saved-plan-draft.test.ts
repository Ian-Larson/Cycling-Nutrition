import { describe, expect, it } from 'vitest';
import { buildPlannerDraftFromSavedPlan } from './saved-plan-draft';
import type { FuelPlan, Product } from '@/types';
import type { FuelingPrescription } from '@/lib/fueling';

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

const stubPrescription = {} as FuelingPrescription;

const plan: FuelPlan = {
  id: 'plan-1',
  createdAt: 100,
  title: 'Race plan',
  ride: {
    durationMinutes: 180,
    intensity: 'race',
    heatFactor: 'hot',
    carbTargetGramsPerHour: 90,
    planningMode: 'manual',
  },
  bottlePool: { 550: 1, 750: 1, 950: 0 },
  selectedDrinkMixId: 'mix-1',
  selectedSolidIds: ['gel-1', 'missing-id'],
  prescription: stubPrescription,
};

describe('buildPlannerDraftFromSavedPlan', () => {
  it('passes ride, bottle pool, drink mix, and title through', () => {
    const draft = buildPlannerDraftFromSavedPlan(plan, [mix]);

    expect(draft.ride).toEqual(plan.ride);
    expect(draft.selectedBottleCounts).toEqual({ 550: 1, 750: 1, 950: 0 });
    expect(draft.selectedDrinkMixId).toBe('mix-1');
    expect(draft.title).toBe('Race plan');
  });

  it('filters solid ids to those still present in the product catalog', () => {
    const gel: Product = {
      id: 'gel-1',
      name: 'Gel',
      type: 'gel',
      isAvailable: true,
      nutrition: { carbsGrams: 22, calories: 100 },
      serving: {},
      createdAt: 1,
      updatedAt: 1,
    };

    const draft = buildPlannerDraftFromSavedPlan(plan, [mix, gel]);
    expect(draft.selectedSolidIds).toEqual(['gel-1']);
  });
});
