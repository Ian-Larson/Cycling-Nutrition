import type { Product } from '@/types';
import { PREFERRED_SOLIDS_PER_HOUR, MIN_DURATION_FOR_SOLIDS_MINUTES } from './constants';

export interface SolidRecommendation {
  product: Product;
  quantity: number;
}

export function recommendSolids(
  availableSolids: Product[],
  totalCarbsNeeded: number,
  durationMinutes: number
): SolidRecommendation[] {
  if (availableSolids.length === 0 || durationMinutes < MIN_DURATION_FOR_SOLIDS_MINUTES) return [];

  const hours = durationMinutes / 60;
  const sorted = [...availableSolids].sort(
    (a, b) => b.nutrition.carbsGrams - a.nutrition.carbsGrams
  );

  const preferredTotal = Math.ceil(PREFERRED_SOLIDS_PER_HOUR * hours);

  const recommendations = new Map<string, SolidRecommendation>();
  for (const product of sorted) {
    recommendations.set(product.id, { product, quantity: 0 });
  }

  let accumulatedCarbs = 0;
  let totalAllocated = 0;

  // Allocate at preferred rate (~1/hr), round-robin across products sorted by carbs desc
  // Cap so accumulated solid carbs don't exceed totalCarbsNeeded
  let productIndex = 0;
  while (totalAllocated < preferredTotal && accumulatedCarbs < totalCarbsNeeded) {
    const product = sorted[productIndex % sorted.length];
    const rec = recommendations.get(product.id)!;
    rec.quantity++;
    accumulatedCarbs += product.nutrition.carbsGrams;
    totalAllocated++;
    productIndex++;
  }

  return Array.from(recommendations.values()).filter((r) => r.quantity > 0);
}
