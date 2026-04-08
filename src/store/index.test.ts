import { describe, expect, it } from 'vitest';
import { getReadinessFromState, normalizeProducts, type Settings } from './index';
import type { Bottle, Product } from '@/types';

const baseSettings: Settings = {
  temperatureUnit: 'celsius',
  athleteProfile: {
    anthropometricsUnit: 'metric',
    heavySweater: false,
    gutTrainingTargetGph: 65,
  },
};

describe('normalizeProducts', () => {
  it('defaults product availability to true during migration', () => {
    const migrated = normalizeProducts(
      [
        {
          id: 'p1',
          name: 'Legacy Mix',
          type: 'drink_mix',
          nutrition: { carbsGrams: 60 },
          serving: {},
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      []
    );

    expect(migrated).toHaveLength(1);
    expect(migrated[0].isAvailable).toBe(true);
    expect(migrated[0].nutrition.calories).toBe(240);
  });
});

describe('getReadinessFromState', () => {
  it('reports setup and profile readiness fields', () => {
    const bottles: Bottle[] = [
      {
        id: 'b1',
        name: '750',
        capacityMl: 750,
        isAvailable: true,
        createdAt: 0,
        updatedAt: 0,
      },
    ];
    const products: Product[] = [
      {
        id: 'mix',
        name: 'Mix',
        type: 'drink_mix',
        isAvailable: true,
        nutrition: { carbsGrams: 60, calories: 240 },
        serving: {},
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'gel',
        name: 'Gel',
        type: 'gel',
        isAvailable: true,
        nutrition: { carbsGrams: 25, calories: 100 },
        serving: {},
        createdAt: 0,
        updatedAt: 0,
      },
    ];
    const settings: Settings = {
      ...baseSettings,
      athleteProfile: {
        ...baseSettings.athleteProfile,
        ftpWatts: 280,
        weightKg: 72,
        age: 35,
        sweatRateLph: 0.9,
      },
    };

    const readiness = getReadinessFromState({ bottles, products, settings });

    expect(readiness.kitReady).toBe(true);
    expect(readiness.autoReady).toBe(true);
    expect(readiness.availableSolidCount).toBe(1);
    expect(readiness.profileCompletionPercent).toBe(100);
    expect(readiness.missingProfileFields).toEqual([]);
  });

  it('flags missing setup and profile requirements', () => {
    const bottles: Bottle[] = [
      {
        id: 'b1',
        name: '750',
        capacityMl: 750,
        isAvailable: false,
        createdAt: 0,
        updatedAt: 0,
      },
    ];
    const products: Product[] = [
      {
        id: 'mix',
        name: 'Mix',
        type: 'drink_mix',
        isAvailable: false,
        nutrition: { carbsGrams: 60, calories: 240 },
        serving: {},
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const readiness = getReadinessFromState({
      bottles,
      products,
      settings: baseSettings,
    });

    expect(readiness.kitReady).toBe(false);
    expect(readiness.autoReady).toBe(false);
    expect(readiness.profileCompletionPercent).toBeLessThan(100);
    expect(readiness.missingProfileFields).toContain('FTP');
  });
});
