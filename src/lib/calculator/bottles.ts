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
  if (bottles.length === 0) return [];

  const servingCarbs = drinkMix.nutrition.carbsGrams;
  const servingGrams = drinkMix.serving.servingSizeGrams || 40;
  const carbsPerGram = servingCarbs / servingGrams;
  const scoopSize = drinkMix.serving.scoopSizeGrams || servingGrams;

  const totalCapacityMl = bottles.reduce((sum, b) => sum + b.capacityMl, 0);
  if (totalCapacityMl <= 0 || carbsPerFill <= 0) {
    return bottles.map((b) => ({
      bottleId: b.id,
      productId: drinkMix.id,
      mixGrams: 0,
      mixScoops: 0,
      carbsTotal: 0,
      isWaterOnly: true,
    }));
  }

  const maxCarbsByConcentration =
    totalCapacityMl * MAX_CARB_CONCENTRATION_G_PER_ML;
  const targetCarbs = Math.max(0, Math.min(carbsPerFill, maxCarbsByConcentration));
  const targetConcentration = targetCarbs / totalCapacityMl;
  const roundedTargetCarbs = Math.round(targetCarbs);

  const baseCarbsByBottle = bottles.map((bottle) =>
    Math.floor(bottle.capacityMl * targetConcentration)
  );
  let remainingCarbs = roundedTargetCarbs - baseCarbsByBottle.reduce((sum, v) => sum + v, 0);

  const fractionalParts = bottles
    .map((bottle, index) => ({
      index,
      fraction: bottle.capacityMl * targetConcentration - baseCarbsByBottle[index],
    }))
    .sort((a, b) => b.fraction - a.fraction);

  let fractionalIndex = 0;
  while (remainingCarbs > 0 && fractionalParts.length > 0) {
    const targetIndex = fractionalParts[fractionalIndex % fractionalParts.length].index;
    baseCarbsByBottle[targetIndex] += 1;
    remainingCarbs -= 1;
    fractionalIndex += 1;
  }

  while (remainingCarbs < 0) {
    const removeIndex = baseCarbsByBottle.findIndex((value) => value > 0);
    if (removeIndex === -1) break;
    baseCarbsByBottle[removeIndex] -= 1;
    remainingCarbs += 1;
  }

  return bottles.map((bottle, index) => {
    const targetBottleCarbs = Math.max(0, baseCarbsByBottle[index]);
    const mixGrams = Math.round(targetBottleCarbs / carbsPerGram);
    const isWaterOnly = mixGrams === 0;
    const carbsTotal = isWaterOnly ? 0 : Math.round(mixGrams * carbsPerGram);

    return {
      bottleId: bottle.id,
      productId: drinkMix.id,
      mixGrams,
      mixScoops: isWaterOnly ? 0 : Math.round((mixGrams / scoopSize) * 10) / 10,
      carbsTotal,
      isWaterOnly,
    };
  });
}
