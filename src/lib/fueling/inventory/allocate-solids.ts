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

interface SolidCandidate {
  product: Product;
  carbsPerUnit: number;
}

function getAvailableSolidCandidates(products: Product[]): SolidCandidate[] {
  return products
    .filter((p) => p.type !== 'drink_mix' && p.isAvailable)
    .map((product) => ({
      product,
      carbsPerUnit: product.nutrition.carbsGrams,
    }))
    .filter((candidate) => candidate.carbsPerUnit > 0);
}

function chooseSeedCandidateIndexes(
  candidates: SolidCandidate[],
  targetCarbs: number,
): number[] {
  if (targetCarbs <= 0) return [];

  if (candidates.length <= 12) {
    let bestIndexes: number[] = [];
    let bestCarbs = 0;
    const subsetCount = 1 << candidates.length;

    for (let mask = 1; mask < subsetCount; mask++) {
      const indexes: number[] = [];
      let carbs = 0;

      for (let index = 0; index < candidates.length; index++) {
        if ((mask & (1 << index)) === 0) continue;
        indexes.push(index);
        carbs += candidates[index].carbsPerUnit;
      }

      if (carbs > targetCarbs) continue;
      if (
        indexes.length > bestIndexes.length ||
        (indexes.length === bestIndexes.length && carbs > bestCarbs)
      ) {
        bestIndexes = indexes;
        bestCarbs = carbs;
      }
    }

    return bestIndexes;
  }

  const chosen: number[] = [];
  let remaining = targetCarbs;
  const sortedIndexes = candidates
    .map((candidate, index) => ({ index, carbsPerUnit: candidate.carbsPerUnit }))
    .sort((a, b) => a.carbsPerUnit - b.carbsPerUnit);

  for (const candidate of sortedIndexes) {
    if (candidate.carbsPerUnit > remaining) continue;
    chosen.push(candidate.index);
    remaining -= candidate.carbsPerUnit;
  }

  return chosen;
}

/**
 * Build solid allocations directly from explicit per-product quantities,
 * bypassing the auto-fill greedy allocator. Used when the rider has
 * adjusted solid counts after the auto-plan was generated.
 */
export function buildSolidAllocationsFromOverrides(
  products: Product[],
  overrides: Record<string, number>,
  durationMinutes: number,
): SolidAllocationResult {
  const warnings: Warning[] = [];
  const allocations: SolidAllocation[] = [];
  let totalCarbsFromSolids = 0;
  let totalCaffeineMgFromSolids = 0;

  for (const product of products) {
    if (product.type === 'drink_mix') continue;
    const qty = overrides[product.id];
    if (typeof qty !== 'number' || qty <= 0) continue;

    const carbsPerUnit = product.nutrition.carbsGrams;
    if (carbsPerUnit <= 0) continue;

    const carbsTotal = qty * carbsPerUnit;
    const caffeineMgTotal = (product.nutrition.caffeineMg ?? 0) * qty;
    const sodiumMgTotal = (product.nutrition.sodiumMg ?? 0) * qty;
    const timingIntervalMinutes = Math.max(
      1,
      Math.round(durationMinutes / (qty + 1)),
    );

    allocations.push({
      productId: product.id,
      productName: product.name,
      quantity: qty,
      carbsTotal,
      sodiumMgTotal: sodiumMgTotal > 0 ? sodiumMgTotal : undefined,
      caffeineMgTotal: caffeineMgTotal > 0 ? caffeineMgTotal : undefined,
      timingIntervalMinutes,
    });

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

/**
 * Fill the carb gap between drink mix and total target using selected solids.
 * Seeds the pack with as many different selected sources as the gap can
 * support, then tops up practical units without exceeding the target.
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

  const candidates = getAvailableSolidCandidates(products);
  const quantityByProductId = new Map<string, number>();

  let remaining = carbsRemainingGrams;
  let totalCarbsFromSolids = 0;
  let totalCaffeineMgFromSolids = 0;
  const allocations: SolidAllocation[] = [];

  const addUnit = (candidate: SolidCandidate) => {
    quantityByProductId.set(
      candidate.product.id,
      (quantityByProductId.get(candidate.product.id) ?? 0) + 1,
    );
    remaining -= candidate.carbsPerUnit;
  };

  for (const index of chooseSeedCandidateIndexes(candidates, remaining)) {
    addUnit(candidates[index]);
  }

  while (remaining > 0) {
    const next = [...candidates]
      .filter((candidate) => {
        const quantity = quantityByProductId.get(candidate.product.id) ?? 0;
        return (
          quantity < MAX_UNITS_PER_PRODUCT &&
          candidate.carbsPerUnit <= remaining
        );
      })
      .sort((a, b) => {
        const quantityA = quantityByProductId.get(a.product.id) ?? 0;
        const quantityB = quantityByProductId.get(b.product.id) ?? 0;
        return quantityA - quantityB || b.carbsPerUnit - a.carbsPerUnit;
      })[0];

    if (!next) break;
    addUnit(next);
  }

  for (const candidate of candidates) {
    const product = candidate.product;
    const carbsPerUnit = candidate.carbsPerUnit;
    const quantity = quantityByProductId.get(product.id) ?? 0;

    if (quantity <= 0) continue;

    const carbsTotal = quantity * carbsPerUnit;
    const caffeineMgTotal = (product.nutrition.caffeineMg ?? 0) * quantity;
    const sodiumMgTotal = (product.nutrition.sodiumMg ?? 0) * quantity;

    // Evenly space consumption across the ride duration
    const timingIntervalMinutes = Math.max(
      1,
      Math.round(durationMinutes / (quantity + 1)),
    );

    allocations.push({
      productId: product.id,
      productName: product.name,
      quantity,
      carbsTotal,
      sodiumMgTotal: sodiumMgTotal > 0 ? sodiumMgTotal : undefined,
      caffeineMgTotal: caffeineMgTotal > 0 ? caffeineMgTotal : undefined,
      timingIntervalMinutes,
    });

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
