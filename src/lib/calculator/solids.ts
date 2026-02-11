import type { Product } from '@/types';
import { PREFERRED_SOLIDS_PER_HOUR, MAX_SOLIDS_PER_HOUR } from './constants';

export interface SolidRecommendation {
  product: Product;
  quantity: number;
}

export function recommendSolids(
  availableSolids: Product[],
  carbGapGrams: number,
  durationMinutes: number
): SolidRecommendation[] {
  if (availableSolids.length === 0 || carbGapGrams <= 0) return [];

  const hours = durationMinutes / 60;
  const sorted = [...availableSolids].sort(
    (a, b) => b.nutrition.carbsGrams - a.nutrition.carbsGrams
  );

  const maxTotal = Math.floor(MAX_SOLIDS_PER_HOUR * hours);
  const preferredTotal = Math.ceil(PREFERRED_SOLIDS_PER_HOUR * hours);

  const recommendations = new Map<string, SolidRecommendation>();
  for (const product of sorted) {
    recommendations.set(product.id, { product, quantity: 0 });
  }

  let remaining = carbGapGrams;
  let totalAllocated = 0;

  // Phase 1: Allocate at preferred rate (~1/hr), round-robin across products
  let productIndex = 0;
  while (remaining > 0 && totalAllocated < preferredTotal) {
    const product = sorted[productIndex % sorted.length];
    const rec = recommendations.get(product.id)!;
    rec.quantity++;
    remaining -= product.nutrition.carbsGrams;
    totalAllocated++;
    productIndex++;
  }

  // Phase 2: If gap remains, increase up to max rate (2/hr)
  productIndex = 0;
  while (remaining > 0 && totalAllocated < maxTotal) {
    const product = sorted[productIndex % sorted.length];
    const rec = recommendations.get(product.id)!;
    rec.quantity++;
    remaining -= product.nutrition.carbsGrams;
    totalAllocated++;
    productIndex++;
  }

  return Array.from(recommendations.values()).filter((r) => r.quantity > 0);
}
