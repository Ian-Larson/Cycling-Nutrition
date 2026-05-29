import type { PlannerDraft } from '@/store';
import type { FuelPlan, Product } from '@/types';

export function buildPlannerDraftFromSavedPlan(
  plan: FuelPlan,
  products: readonly Product[]
): PlannerDraft {
  return {
    ride: plan.ride,
    selectedBottleCounts: plan.bottlePool,
    selectedDrinkMixId: plan.selectedDrinkMixId,
    selectedSolidIds: plan.selectedSolidIds.filter((id) =>
      products.some((p) => p.id === id),
    ),
    solidOverrides: plan.solidOverrides,
    title: plan.title,
  };
}
