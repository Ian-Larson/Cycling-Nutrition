import type { Product } from '@/types';
import { MIN_DURATION_FOR_SOLIDS_MINUTES } from './constants';

export interface SolidRecommendation {
  product: Product;
  quantity: number;
}

/**
 * Recommend solids to fill a carb budget.
 * Takes a budget (grams) and distributes across available solids,
 * rounding to nearest whole unit per product.
 */
export function recommendSolids(
  availableSolids: Product[],
  solidBudget: number,
  durationMinutes: number
): SolidRecommendation[] {
  if (availableSolids.length === 0 || durationMinutes < MIN_DURATION_FOR_SOLIDS_MINUTES || solidBudget <= 0) {
    return [];
  }

  const sorted = [...availableSolids].sort(
    (a, b) => b.nutrition.carbsGrams - a.nutrition.carbsGrams
  );

  if (sorted.length === 1) {
    const product = sorted[0];
    const quantity = Math.max(0, Math.round(solidBudget / product.nutrition.carbsGrams));
    return quantity > 0 ? [{ product, quantity }] : [];
  }

  // Distribute budget proportionally across products by carbs per unit
  const totalCarbsPerUnit = sorted.reduce((sum, p) => sum + p.nutrition.carbsGrams, 0);
  let remainingBudget = solidBudget;

  const recommendations: SolidRecommendation[] = [];
  for (const product of sorted) {
    const share = solidBudget * (product.nutrition.carbsGrams / totalCarbsPerUnit);
    const quantity = Math.max(0, Math.round(share / product.nutrition.carbsGrams));
    if (quantity > 0) {
      recommendations.push({ product, quantity });
      remainingBudget -= quantity * product.nutrition.carbsGrams;
    }
  }

  // If there's remaining budget >= half a unit, add one more of the best-fit product
  if (remainingBudget > 0 && sorted.length > 0) {
    const bestFit = sorted.find((p) => p.nutrition.carbsGrams <= remainingBudget * 1.5);
    if (bestFit) {
      const existing = recommendations.find((r) => r.product.id === bestFit.id);
      if (existing) {
        existing.quantity++;
      } else {
        recommendations.push({ product: bestFit, quantity: 1 });
      }
    }
  }

  return recommendations.filter((r) => r.quantity > 0);
}
