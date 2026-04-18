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
    expect(result.fluidShortfallMl).toBe(0);
  });

  it('picks 2 bottles when single cant fit', () => {
    const result = selectBottles(bottles, 1200, 0);
    expect(result.selectedBottles).toHaveLength(2);
    expect(result.totalCapacityMl).toBeGreaterThanOrEqual(1200);
    expect(result.fluidShortfallMl).toBe(0);
  });

  it('accounts for refuel stops', () => {
    // 1400ml need with 1 refuel -> 700ml per leg -> single 750 works
    const result = selectBottles(bottles, 1400, 1);
    expect(result.selectedBottles).toHaveLength(1);
    expect(result.selectedBottles[0].capacityMl).toBe(750);
    expect(result.fluidShortfallMl).toBe(0);
  });

  it('filters unavailable bottles', () => {
    const limited = bottles.map(b => b.id === 'b3' ? { ...b, isAvailable: false } : b);
    const result = selectBottles(limited, 800, 0);
    expect(result.selectedBottles.every(b => b.isAvailable)).toBe(true);
  });

  it('caps at 2 and surfaces shortfall when target exceeds 2-bottle capacity', () => {
    // 5000ml need, 0 refuels, max 2 bottles = 950 + 750 = 1700 -> shortfall 3300
    const result = selectBottles(bottles, 5000, 0);
    expect(result.selectedBottles).toHaveLength(2);
    expect(result.selectedBottles.map(b => b.capacityMl).sort((a, b) => a - b)).toEqual([750, 950]);
    expect(result.totalCapacityMl).toBe(1700);
    expect(result.fluidShortfallMl).toBe(3300);
  });

  it('shortfall accounts for existing refuel stops', () => {
    // 5000ml need, 1 refuel -> 2 legs of 2500 per leg
    // 2 largest bottles = 1700 capacity, 1700 * 2 legs = 3400 -> shortfall 1600
    const result = selectBottles(bottles, 5000, 1);
    expect(result.selectedBottles).toHaveLength(2);
    expect(result.fluidShortfallMl).toBe(1600);
  });

  it('returns full target as shortfall when inventory is empty', () => {
    const result = selectBottles([], 1500, 0);
    expect(result.selectedBottles).toHaveLength(0);
    expect(result.totalCapacityMl).toBe(0);
    expect(result.fluidShortfallMl).toBe(1500);
  });

  it('falls back to single largest when only one bottle is available and target is too high', () => {
    const oneSmall: Bottle[] = [
      { id: 'b1', name: '500ml', capacityMl: 500, isAvailable: true, createdAt: 0, updatedAt: 0 },
    ];
    const result = selectBottles(oneSmall, 2000, 0);
    expect(result.selectedBottles).toHaveLength(1);
    expect(result.totalCapacityMl).toBe(500);
    expect(result.fluidShortfallMl).toBe(1500);
  });
});
