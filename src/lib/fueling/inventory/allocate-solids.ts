import type { Product } from '@/types';
import type { SolidAllocation, Warning } from '../types';

export interface SolidAllocationResult {
  allocations: SolidAllocation[];
  totalCarbsFromSolids: number;
  totalCaffeineMgFromSolids: number;
  warnings: Warning[];
}

/** Maximum units of any single product to allocate. */
const MAX_UNITS_PER_PRODUCT = 10;

/**
 * Fill the carb gap between drink mix and total target using solid products.
 * Distributes greedily, highest-carb products first, and computes timing
 * intervals for each product.
 */
export function allocateSolids(
  products: Product[],
  carbsRemainingGrams: number,
  durationMinutes: number,
): SolidAllocationResult {
  const warnings: Warning[] = [];

  if (carbsRemainingGrams <= 0) {
    return {
      allocations: [],
      totalCarbsFromSolids: 0,
      totalCaffeineMgFromSolids: 0,
      warnings,
    };
  }

  // Filter to available solids only (exclude drink mixes)
  const solids = products.filter(
    (p) => p.type !== 'drink_mix' && p.isAvailable,
  );

  // Sort by carbs descending so highest-carb products fill the most per unit
  const sorted = [...solids].sort(
    (a, b) => b.nutrition.carbsGrams - a.nutrition.carbsGrams,
  );

  let remaining = carbsRemainingGrams;
  let totalCarbsFromSolids = 0;
  let totalCaffeineMgFromSolids = 0;
  const allocations: SolidAllocation[] = [];

  for (const product of sorted) {
    if (remaining <= 0) break;

    const carbsPerUnit = product.nutrition.carbsGrams;
    if (carbsPerUnit <= 0) continue;

    const quantity = Math.min(
      Math.floor(remaining / carbsPerUnit),
      MAX_UNITS_PER_PRODUCT,
    );
    if (quantity <= 0) continue;

    const carbsTotal = quantity * carbsPerUnit;
    const caffeineMgTotal = (product.nutrition.caffeineMg ?? 0) * quantity;
    const sodiumMgTotal = (product.nutrition.sodiumMg ?? 0) * quantity;

    // Evenly space consumption across the ride duration
    const timingIntervalMinutes = Math.round(durationMinutes / (quantity + 1));

    allocations.push({
      productId: product.id,
      quantity,
      carbsTotal,
      sodiumMgTotal: sodiumMgTotal > 0 ? sodiumMgTotal : undefined,
      caffeineMgTotal: caffeineMgTotal > 0 ? caffeineMgTotal : undefined,
      timingIntervalMinutes,
    });

    remaining -= carbsTotal;
    totalCarbsFromSolids += carbsTotal;
    totalCaffeineMgFromSolids += caffeineMgTotal;
  }

  return {
    allocations,
    totalCarbsFromSolids,
    totalCaffeineMgFromSolids,
    warnings,
  };
}
