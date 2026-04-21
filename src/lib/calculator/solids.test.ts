import { describe, expect, it } from 'vitest';
import type { Product } from '@/types';
import { recommendSolids } from './solids';

function makeSolid(id: string, carbsGrams: number): Product {
  return {
    id,
    name: id,
    type: 'gel',
    isAvailable: true,
    nutrition: { carbsGrams, calories: Math.max(0, carbsGrams) * 4 },
    serving: {},
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('recommendSolids', () => {
  it('skips products with zero carbs instead of dividing by zero', () => {
    const zero = makeSolid('zero', 0);
    const normal = makeSolid('normal', 25);

    const recs = recommendSolids([zero, normal], 50, 120);

    expect(recs.every((r) => Number.isFinite(r.quantity))).toBe(true);
    expect(recs.some((r) => r.product.id === 'zero')).toBe(false);
    const normalRec = recs.find((r) => r.product.id === 'normal');
    expect(normalRec?.quantity).toBeGreaterThan(0);
  });

  it('returns empty when every product has non-positive carbs', () => {
    const recs = recommendSolids([makeSolid('a', 0), makeSolid('b', 0)], 50, 120);
    expect(recs).toEqual([]);
  });
});
