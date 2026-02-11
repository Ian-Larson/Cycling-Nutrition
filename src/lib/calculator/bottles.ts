import type { Bottle, Product, BottleAllocation, RideCharacteristics } from '@/types';
import { calculateHydrationNeeds } from './carbs';
import { MAX_CARB_CONCENTRATION_G_PER_ML } from './constants';

export function selectBottlesForHydration(
  available: Bottle[],
  ride: RideCharacteristics
): Bottle[] {
  const refuelMultiplier = (ride.refuelStops || 0) + 1;
  const hydrationNeeded = calculateHydrationNeeds(ride) / refuelMultiplier;

  const sortedBottles = available
    .filter((b) => b.isAvailable)
    .sort((a, b) => a.capacityMl - b.capacityMl);

  if (sortedBottles.length === 0) return [];

  // Try single bottle first
  const singleBottle = sortedBottles.find((b) => b.capacityMl >= hydrationNeeded);
  if (singleBottle) return [singleBottle];

  if (sortedBottles.length >= 2) {
    let bestCombo: Bottle[] = sortedBottles.slice(-2);
    let bestCapacity = bestCombo.reduce((sum, b) => sum + b.capacityMl, 0);

    for (let i = 0; i < sortedBottles.length; i++) {
      for (let j = i + 1; j < sortedBottles.length; j++) {
        const combo = [sortedBottles[i], sortedBottles[j]];
        const capacity = combo.reduce((sum, b) => sum + b.capacityMl, 0);
        if (capacity >= hydrationNeeded && capacity < bestCapacity) {
          bestCombo = combo;
          bestCapacity = capacity;
        }
      }
    }
    return bestCombo;
  }

  return sortedBottles.slice(0, 1);
}

export function calculateMaxLiquidCarbs(
  bottles: Bottle[],
  refuelStops: number
): number {
  const refuelMultiplier = refuelStops + 1;
  const carbsPerFill = bottles.reduce(
    (sum, b) => sum + b.capacityMl * MAX_CARB_CONCENTRATION_G_PER_ML,
    0
  );
  return Math.round(carbsPerFill * refuelMultiplier);
}

export function allocateMixToBottles(
  bottles: Bottle[],
  carbsPerFill: number,
  drinkMix: Product
): BottleAllocation[] {
  const totalCapacity = bottles.reduce((sum, b) => sum + b.capacityMl, 0);

  const servingCarbs = drinkMix.nutrition.carbsGrams;
  const servingGrams = drinkMix.serving.servingSizeGrams || 40;
  const carbsPerGram = servingCarbs / servingGrams;

  const scoopSize = drinkMix.serving.scoopSizeGrams || servingGrams;

  return bottles.map((bottle) => {
    const proportion = bottle.capacityMl / totalCapacity;
    const maxCarbsForBottle = bottle.capacityMl * MAX_CARB_CONCENTRATION_G_PER_ML;
    const carbsForBottle = Math.min(carbsPerFill * proportion, maxCarbsForBottle);
    const mixGrams = Math.round(carbsForBottle / carbsPerGram);

    return {
      bottleId: bottle.id,
      productId: drinkMix.id,
      mixGrams,
      mixScoops: Math.round((mixGrams / scoopSize) * 10) / 10,
      carbsTotal: Math.round(mixGrams * carbsPerGram),
    };
  });
}
