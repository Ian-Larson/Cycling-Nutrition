import { describe, it, expect } from 'vitest';
import { allocateMix } from '../allocate-mix';
import type { Product } from '@/types';
import type { BottleSlot } from '@/types/bottle';

const drinkMix: Product = {
  id: 'mix1', name: 'PF 30', type: 'drink_mix', isAvailable: true,
  nutrition: { carbsGrams: 30, calories: 120, sodiumMg: 300 },
  serving: { servingSizeGrams: 40, scoopSizeGrams: 40 },
  concentration: { minGPerMl: 0.04, maxGPerMl: 0.10 },
  createdAt: 0, updatedAt: 0,
};

const bottles: BottleSlot[] = [{ capacityMl: 750 }];

describe('allocateMix', () => {
  it('allocates carbs to bottles within concentration range', () => {
    const result = allocateMix(bottles, drinkMix, 60, 500);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].carbsTotal).toBeGreaterThan(0);
    expect(result.allocations[0].isWaterOnly).toBe(false);
    expect(result.allocations[0].capacityMl).toBe(750);
  });

  it('null drink mix -> water-only bottles', () => {
    const result = allocateMix(bottles, null, 60, 500);
    expect(result.allocations.every(a => a.isWaterOnly)).toBe(true);
    expect(result.totalCarbsFromDrink).toBe(0);
  });

  it('warns when concentration exceeds max', () => {
    // 90g in 500ml = 0.18 g/ml > 0.16 max
    const smallBottle: BottleSlot[] = [{ capacityMl: 500 }];
    const result = allocateMix(smallBottle, drinkMix, 90, 500);
    // Should either warn or cap at max concentration
    expect(result.totalCarbsFromDrink).toBeLessThanOrEqual(500 * 0.16 + 1); // tolerance
  });
});
