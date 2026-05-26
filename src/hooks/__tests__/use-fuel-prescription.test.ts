import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFuelPrescription } from '@/hooks/use-fuel-prescription';
import { useStore } from '@/store';
import type { Product, RideCharacteristics } from '@/types';

const ride: RideCharacteristics = {
  durationMinutes: 60,
  carbTargetGramsPerHour: 60,
  intensity: 'endurance',
  heatFactor: 'moderate',
  refuelStops: 0,
  planningMode: 'manual',
};

const drinkMix: Product = {
  id: 'mix',
  name: 'Test mix',
  type: 'drink_mix',
  isAvailable: true,
  nutrition: { carbsGrams: 30, calories: 120, sodiumMg: 100 },
  serving: { servingSizeGrams: 40, scoopSizeGrams: 40 },
  createdAt: 0,
  updatedAt: 0,
};

const gel: Product = {
  id: 'gel',
  name: 'Test gel',
  type: 'gel',
  isAvailable: true,
  nutrition: { carbsGrams: 22, calories: 100 },
  serving: {},
  createdAt: 0,
  updatedAt: 0,
};

const chew: Product = {
  id: 'chew',
  name: 'Test chew',
  type: 'chews',
  isAvailable: true,
  nutrition: { carbsGrams: 30, calories: 120 },
  serving: {},
  createdAt: 0,
  updatedAt: 0,
};

describe('useFuelPrescription', () => {
  beforeEach(() => {
    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: {
          ...state.settings.athleteProfile,
          weightKg: 70,
        },
      },
    }));
  });

  it('returns null when weight is missing', () => {
    useStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        athleteProfile: {
          ...state.settings.athleteProfile,
          weightKg: undefined,
        },
      },
    }));

    const { result } = renderHook(() => useFuelPrescription());
    expect(result.current.weightReady).toBe(false);
    const out = result.current.build({
      ride,
      bottles: [{ capacityMl: 750 }],
      drinkMix,
      solids: [],
    });
    expect(out).toBeNull();
  });

  it('uses one bottle when one is enough for the fluid target', () => {
    const { result } = renderHook(() => useFuelPrescription());
    const out = result.current.build({
      ride,
      bottles: [
        { capacityMl: 550 },
        { capacityMl: 750 },
        { capacityMl: 950 },
      ],
      drinkMix,
      solids: [],
    });
    expect(out).not.toBeNull();
    expect(out!.packList?.bottles.length).toBe(1);
    expect(out!.packList?.fluidShortfallMl).toBe(0);
  });

  it('reports fluid shortfall when the pool cannot cover the target', () => {
    const longRide: RideCharacteristics = {
      ...ride,
      durationMinutes: 240,
      heatFactor: 'hot',
      refuelStops: 0,
    };

    const { result } = renderHook(() => useFuelPrescription());
    const out = result.current.build({
      ride: longRide,
      bottles: [{ capacityMl: 550 }],
      drinkMix,
      solids: [],
    });
    expect(out).not.toBeNull();
    expect(out!.packList?.fluidShortfallMl).toBeGreaterThan(0);
  });

  it('keeps multiple selected solid sources in the generated pack list', () => {
    const longRide: RideCharacteristics = {
      ...ride,
      durationMinutes: 120,
      carbTargetGramsPerHour: 90,
    };

    const { result } = renderHook(() => useFuelPrescription());
    const out = result.current.build({
      ride: longRide,
      bottles: [{ capacityMl: 750 }],
      drinkMix,
      solids: [gel, chew],
    });

    expect(out).not.toBeNull();
    expect(out!.packList?.solids.map((solid) => solid.productId)).toEqual([
      'gel',
      'chew',
    ]);
  });
});
