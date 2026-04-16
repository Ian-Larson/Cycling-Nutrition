import type { Product, Bottle } from '@/types';
import type { BottleAllocation, Warning } from '../types';
import { MAX_BOTTLE_CONC_G_PER_ML } from '../constants/science';

export interface MixAllocationResult {
  allocations: BottleAllocation[];
  totalCarbsFromDrink: number;
  warnings: Warning[];
}

/**
 * Distribute carbs across selected bottles using the chosen drink mix.
 * Respects concentration limits and rounds to practical serving amounts.
 */
export function allocateMix(
  selectedBottles: Bottle[],
  drinkMix: Product | null,
  targetCarbsGrams: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future sodium-aware allocation
  _targetSodiumMgPerL: number,
): MixAllocationResult {
  const warnings: Warning[] = [];
  const totalCapacityMl = selectedBottles.reduce((sum, b) => sum + b.capacityMl, 0);

  // Water-only: no drink mix or wrong product type
  if (drinkMix === null || drinkMix.type !== 'drink_mix') {
    return {
      allocations: selectedBottles.map((b) => ({
        bottleId: b.id,
        productId: null,
        mixGrams: 0,
        carbsTotal: 0,
        isWaterOnly: true,
      })),
      totalCarbsFromDrink: 0,
      warnings,
    };
  }

  if (totalCapacityMl <= 0) {
    return { allocations: [], totalCarbsFromDrink: 0, warnings };
  }

  // Concentration bounds
  const minConc = drinkMix.concentration?.minGPerMl ?? 0;
  const maxConc = Math.min(
    drinkMix.concentration?.maxGPerMl ?? 0.10,
    MAX_BOTTLE_CONC_G_PER_ML,
  );

  // Ideal concentration to hit target carbs across all bottles
  const idealConc = targetCarbsGrams / totalCapacityMl;
  const clampedConc = Math.max(minConc, Math.min(idealConc, maxConc));

  // Check if we're short even at max concentration
  const maxDeliverableCarbs = maxConc * totalCapacityMl;
  if (targetCarbsGrams > 0 && maxDeliverableCarbs < targetCarbsGrams * 0.9) {
    warnings.push({
      code: 'bottle-concentration-exceeded',
      severity: 'warn',
      message: `Drink mix concentration would need to exceed safe limits to meet carb target. Max deliverable: ${Math.round(maxDeliverableCarbs)}g vs target ${Math.round(targetCarbsGrams)}g.`,
      details: {
        maxDeliverableCarbs: Math.round(maxDeliverableCarbs),
        targetCarbsGrams: Math.round(targetCarbsGrams),
        maxConcentration: maxConc,
      },
    });
  }

  // Product conversion factors
  const servingGrams = drinkMix.serving.servingSizeGrams ?? 40;
  const servingCarbs = drinkMix.nutrition.carbsGrams;
  const servingSodiumMg = drinkMix.nutrition.sodiumMg ?? 0;
  const scoopGrams = drinkMix.serving.scoopSizeGrams;

  // Guard against division by zero
  if (servingCarbs <= 0 || servingGrams <= 0) {
    return {
      allocations: selectedBottles.map((b) => ({
        bottleId: b.id,
        productId: drinkMix.id,
        mixGrams: 0,
        carbsTotal: 0,
        isWaterOnly: true,
      })),
      totalCarbsFromDrink: 0,
      warnings,
    };
  }

  let totalCarbsFromDrink = 0;

  const allocations: BottleAllocation[] = selectedBottles.map((bottle) => {
    // Carbs allocated to this bottle based on clamped concentration
    const carbsRaw = clampedConc * bottle.capacityMl;
    const carbsTotal = Math.round(carbsRaw);

    // Convert carb-grams to mix-grams using the product's carb density
    const mixGramsRaw = carbsRaw * (servingGrams / servingCarbs);
    const mixGrams = Math.round(mixGramsRaw);

    // Scoop calculation
    const mixScoops = scoopGrams && scoopGrams > 0
      ? Math.round((mixGrams / scoopGrams) * 2) / 2 // round to nearest 0.5
      : undefined;

    // Sodium from the allocated mix
    const sodiumMgTotal = servingGrams > 0
      ? Math.round(servingSodiumMg * (mixGrams / servingGrams))
      : 0;

    const isWaterOnly = mixGrams === 0;
    totalCarbsFromDrink += carbsTotal;

    const allocation: BottleAllocation = {
      bottleId: bottle.id,
      productId: drinkMix.id,
      mixGrams,
      carbsTotal,
      sodiumMgTotal,
      isWaterOnly,
    };

    if (mixScoops !== undefined) {
      allocation.mixScoops = mixScoops;
    }

    return allocation;
  });

  return { allocations, totalCarbsFromDrink, warnings };
}
