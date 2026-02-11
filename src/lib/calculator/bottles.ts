import type { Bottle, Product, BottleAllocation, RideCharacteristics } from '@/types';
import { calculateHydrationNeeds } from './carbs';
import { MAX_CARB_CONCENTRATION_G_PER_ML } from './constants';

export function selectOptimalBottles(
  available: Bottle[],
  carbsNeeded: number,
  drinkMix: Product,
  ride: RideCharacteristics
): BottleAllocation[] {
  const hydrationNeeded = calculateHydrationNeeds(ride);

  const sortedBottles = available
    .filter((b) => b.isAvailable)
    .sort((a, b) => a.capacityMl - b.capacityMl);

  if (sortedBottles.length === 0) return [];

  // Find smallest combo of 1-2 bottles meeting hydration needs
  let selected: Bottle[] = [];

  // Try single bottle first
  const singleBottle = sortedBottles.find((b) => b.capacityMl >= hydrationNeeded);
  if (singleBottle) {
    selected = [singleBottle];
  } else if (sortedBottles.length >= 2) {
    // Need two bottles - find smallest combo that meets hydration needs
    let bestCombo: Bottle[] = sortedBottles.slice(-2); // Start with two largest
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
    selected = bestCombo;
  } else {
    selected = sortedBottles.slice(0, 1);
  }

  return allocateMixToBottles(selected, carbsNeeded, drinkMix);
}

function allocateMixToBottles(
  bottles: Bottle[],
  carbsNeeded: number,
  drinkMix: Product
): BottleAllocation[] {
  const totalCapacity = bottles.reduce((sum, b) => sum + b.capacityMl, 0);

  // Calculate carbs per gram of mix
  const servingCarbs = drinkMix.nutrition.carbsGrams;
  const servingGrams = drinkMix.serving.servingSizeGrams || 40;
  const carbsPerGram = servingCarbs / servingGrams;

  const scoopSize = drinkMix.serving.scoopSizeGrams || servingGrams;

  return bottles.map((bottle) => {
    const proportion = bottle.capacityMl / totalCapacity;
    const maxCarbsForBottle = bottle.capacityMl * MAX_CARB_CONCENTRATION_G_PER_ML;
    const carbsForBottle = Math.min(carbsNeeded * proportion, maxCarbsForBottle);
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
