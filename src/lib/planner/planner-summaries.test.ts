import { describe, expect, it } from 'vitest';
import {
  formatDateTime,
  formatDuration,
  formatRideSummary,
  formatSetupSummary,
  getFuelResultPlan,
  getPlanTitleSuggestion,
  isRideSnapshotEquivalentToRide,
} from './planner-summaries';
import type { RideFormSnapshot } from '@/components/planner/ride-form';
import type { BottleInventory } from '@/types/bottle';
import type { FuelPlan, Product, RideCharacteristics } from '@/types';

const bottles: BottleInventory = { 550: 1, 750: 1, 950: 0 };

const drinkMix: Product = {
  id: 'mix-1',
  name: 'Tailwind',
  brand: 'Tailwind',
  type: 'drink_mix',
  isAvailable: true,
  nutrition: { carbsGrams: 25, calories: 100 },
  serving: {},
  createdAt: 1,
  updatedAt: 1,
};

const ride: RideCharacteristics = {
  durationMinutes: 135,
  intensity: 'tempo',
  heatFactor: 'warm',
  carbTargetGramsPerHour: 80,
  planningMode: 'manual',
  refuelStops: 1,
};

describe('planner summaries', () => {
  it('formats durations for minutes and hours', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(135)).toBe('2h 15m');
    expect(formatDuration(120)).toBe('2h 0m');
  });

  it('summarizes a valid setup', () => {
    expect(
      formatSetupSummary({
        selectedBottleCounts: bottles,
        selectedDrinkMix: drinkMix,
        selectedSolidIds: ['gel-1', 'bar-1'],
      })
    ).toBe('2 bottles - Tailwind - 2 solids');
  });

  it('summarizes an incomplete setup', () => {
    expect(
      formatSetupSummary({
        selectedBottleCounts: { 550: 0, 750: 0, 950: 0 },
        selectedDrinkMix: null,
        selectedSolidIds: [],
      })
    ).toBe('Select bottles and drink mix');
  });

  it('summarizes ride data', () => {
    expect(formatRideSummary(ride)).toBe('2h 15m - tempo - warm - 80g/h');
  });

  it('suggests a saved plan title from ride details', () => {
    expect(getPlanTitleSuggestion(ride)).toBe('2h 15m Tempo Plan');
  });

  it('compares ride snapshots against calculated ride data', () => {
    const snapshot: RideFormSnapshot = {
      planningMode: 'manual',
      durationMinutes: 135,
      intensity: 'tempo',
      heatFactor: 'warm',
      carbTarget: 80,
      refuelStops: 1,
      autoInputPair: 'duration_if',
      autoDurationInput: '135',
      autoIfInput: '0.8',
      autoTssInput: '120',
      autoCarbOverrideInput: '',
    };

    expect(isRideSnapshotEquivalentToRide(snapshot, ride)).toBe(true);
    expect(
      isRideSnapshotEquivalentToRide({ ...snapshot, heatFactor: 'hot' }, ride)
    ).toBe(false);
  });

  it('strips persistence fields from a saved plan for result rendering', () => {
    const plan: FuelPlan = {
      id: 'plan-1',
      createdAt: 100,
      title: 'Saved',
      rideCharacteristics: ride,
      bottles: [],
      solids: [],
      consumptionGuide: [],
      summary: {
        totalCarbsPlanned: 180,
        totalCaloriesPlanned: 720,
        totalCarbsNeeded: 180,
        hydrationMl: 1500,
      },
    };

    expect(getFuelResultPlan(plan)).toEqual({
      title: 'Saved',
      rideCharacteristics: ride,
      bottles: [],
      solids: [],
      consumptionGuide: [],
      summary: plan.summary,
    });
  });

  it('formats saved-plan dates with stable options', () => {
    expect(formatDateTime(new Date('2026-04-24T14:05:00Z').getTime())).toContain(
      'Apr'
    );
  });
});
