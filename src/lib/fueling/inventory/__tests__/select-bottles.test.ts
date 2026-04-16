import { describe, it, expect } from 'vitest';
import { selectBottles } from '../select-bottles';
import type { Bottle } from '@/types';

const bottles: Bottle[] = [
  { id: 'b1', name: '550ml', capacityMl: 550, isAvailable: true, createdAt: 0, updatedAt: 0 },
  { id: 'b2', name: '750ml', capacityMl: 750, isAvailable: true, createdAt: 0, updatedAt: 0 },
  { id: 'b3', name: '950ml', capacityMl: 950, isAvailable: true, createdAt: 0, updatedAt: 0 },
];

describe('selectBottles', () => {
  it('picks single smallest bottle that fits', () => {
    const result = selectBottles(bottles, 600, 0);
    expect(result.selectedBottles).toHaveLength(1);
    expect(result.selectedBottles[0].capacityMl).toBe(750);
  });

  it('picks 2 bottles when single cant fit', () => {
    const result = selectBottles(bottles, 1200, 0);
    expect(result.selectedBottles).toHaveLength(2);
    expect(result.totalCapacityMl).toBeGreaterThanOrEqual(1200);
  });

  it('accounts for refuel stops', () => {
    // 1400ml need with 1 refuel -> 700ml per leg -> single 750 works
    const result = selectBottles(bottles, 1400, 1);
    expect(result.selectedBottles).toHaveLength(1);
    expect(result.selectedBottles[0].capacityMl).toBe(750);
  });

  it('filters unavailable bottles', () => {
    const limited = bottles.map(b => b.id === 'b3' ? { ...b, isAvailable: false } : b);
    const result = selectBottles(limited, 800, 0);
    expect(result.selectedBottles.every(b => b.isAvailable)).toBe(true);
  });

  it('returns all when nothing else works', () => {
    const result = selectBottles(bottles, 5000, 0);
    expect(result.selectedBottles.length).toBeGreaterThanOrEqual(2);
  });
});
