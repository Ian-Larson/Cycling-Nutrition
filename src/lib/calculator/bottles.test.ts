import { describe, expect, it } from 'vitest';
import type { Bottle, Product } from '@/types';
import { allocateMixToBottles } from './bottles';
import { MAX_CARB_CONCENTRATION_G_PER_ML } from './constants';

const bottles: Bottle[] = [
  {
    id: 'b1',
    name: '550ml Small',
    capacityMl: 550,
    isAvailable: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'b2',
    name: '750ml Standard',
    capacityMl: 750,
    isAvailable: true,
    createdAt: 0,
    updatedAt: 0,
  },
];

const mix: Product = {
  id: 'mix',
  name: 'PF 60',
  type: 'drink_mix',
  isAvailable: true,
  nutrition: {
    carbsGrams: 60,
    calories: 240,
  },
  serving: {
    servingSizeGrams: 60,
    scoopSizeGrams: 30,
  },
  createdAt: 0,
  updatedAt: 0,
};

describe('allocateMixToBottles', () => {
  it('targets equal concentrations across different bottle sizes', () => {
    const allocations = allocateMixToBottles(bottles, 130, mix);

    const byBottle = new Map(allocations.map((a) => [a.bottleId, a]));
    const small = byBottle.get('b1');
    const large = byBottle.get('b2');

    expect(small?.carbsTotal).toBeDefined();
    expect(large?.carbsTotal).toBeDefined();

    const smallConcentration = (small!.carbsTotal || 0) / 550;
    const largeConcentration = (large!.carbsTotal || 0) / 750;

    expect(Math.abs(smallConcentration - largeConcentration)).toBeLessThanOrEqual(
      0.01
    );
    expect((small!.carbsTotal || 0) + (large!.carbsTotal || 0)).toBe(130);
  });

  it('respects max concentration cap and still balances split', () => {
    const allocations = allocateMixToBottles(bottles, 300, mix);

    const totalCarbs = allocations.reduce((sum, a) => sum + a.carbsTotal, 0);
    const cap = Math.round((550 + 750) * MAX_CARB_CONCENTRATION_G_PER_ML);

    expect(totalCarbs).toBeLessThanOrEqual(cap);

    const concentrations = allocations
      .filter((a) => !a.isWaterOnly)
      .map((a) => {
        const bottle = bottles.find((b) => b.id === a.bottleId)!;
        return a.carbsTotal / bottle.capacityMl;
      });

    concentrations.forEach((value) => {
      expect(value).toBeLessThanOrEqual(MAX_CARB_CONCENTRATION_G_PER_ML + 0.001);
    });

    expect(Math.max(...concentrations) - Math.min(...concentrations)).toBeLessThanOrEqual(
      0.01
    );
  });
});
