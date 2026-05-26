import { describe, it, expect } from 'vitest';
import { allocateSolids } from '../allocate-solids';
import type { Product } from '@/types';

const gel: Product = {
  id: 'g1', name: 'GU Gel', type: 'gel', isAvailable: true,
  nutrition: { carbsGrams: 22, calories: 100, caffeineMg: 20 },
  serving: { servingSizeGrams: 32 },
  createdAt: 0, updatedAt: 0,
};

const bar: Product = {
  id: 'bar1', name: 'Clif Bar', type: 'bar', isAvailable: true,
  nutrition: { carbsGrams: 40, calories: 250 },
  serving: { servingSizeGrams: 68 },
  createdAt: 0, updatedAt: 0,
};

const chews: Product = {
  id: 'chew1', name: 'PF 30 Chew', type: 'chews', isAvailable: true,
  nutrition: { carbsGrams: 30, calories: 120 },
  serving: { servingSizeGrams: 36 },
  createdAt: 0, updatedAt: 0,
};

describe('allocateSolids', () => {
  it('fills carb gap with available solids', () => {
    // 100g gap: bar (40g) x2 = 80g, then gel (22g) x0 (20g remaining < 22g)
    // Total = 80g (greedy picks highest-carb product first)
    const result = allocateSolids([gel, bar], 100, 120);
    expect(result.totalCarbsFromSolids).toBeGreaterThanOrEqual(80);
    expect(result.allocations.length).toBeGreaterThan(0);
  });

  it('tracks caffeine from solids', () => {
    const result = allocateSolids([gel], 44, 120);
    expect(result.totalCaffeineMgFromSolids).toBeGreaterThan(0);
  });

  it('spreads a practical solid gap across multiple selected sources', () => {
    const result = allocateSolids([gel, chews], 60, 120);

    expect(result.allocations.map((allocation) => allocation.productId)).toEqual([
      'g1',
      'chew1',
    ]);
    expect(result.allocations.map((allocation) => allocation.quantity)).toEqual([
      1,
      1,
    ]);
    expect(result.totalCarbsFromSolids).toBe(52);
  });

  it('returns empty when no gap', () => {
    const result = allocateSolids([gel], 0, 120);
    expect(result.allocations).toHaveLength(0);
    expect(result.totalCarbsFromSolids).toBe(0);
  });

  it('filters drink mixes from solids', () => {
    const mix: Product = {
      id: 'mix', name: 'Mix', type: 'drink_mix', isAvailable: true,
      nutrition: { carbsGrams: 30, calories: 120 },
      serving: { servingSizeGrams: 40 },
      createdAt: 0, updatedAt: 0,
    };
    const result = allocateSolids([mix, gel], 44, 120);
    expect(result.allocations.every(a => a.productId !== 'mix')).toBe(true);
  });

  it('computes timing intervals', () => {
    const result = allocateSolids([gel], 66, 180); // 3 gels over 3h
    for (const alloc of result.allocations) {
      expect(alloc.timingIntervalMinutes).toBeGreaterThan(0);
    }
  });
});
