import type { PlannerDraft } from '@/store';
import type { BottleInventory, BottleSize } from '@/types/bottle';
import { BOTTLE_SIZES, isBottleSize } from '@/types/bottle';
import type { FuelPlan, Product } from '@/types';

function emptyBottleCounts(): BottleInventory {
  return { 550: 0, 750: 0, 950: 0 };
}

export function buildPlannerDraftFromSavedPlan(
  plan: FuelPlan,
  products: readonly Product[]
): PlannerDraft {
  const selectedBottleCounts = emptyBottleCounts();

  for (const allocation of plan.bottles) {
    const capacity = allocation.capacityMl as BottleSize;
    if (isBottleSize(capacity)) {
      selectedBottleCounts[capacity] += 1;
    }
  }

  const selectedDrinkMixId =
    plan.bottles.find((allocation) => !allocation.isWaterOnly)?.productId ?? null;
  const selectedSolidIds = plan.solids.map((solid) => solid.productId);

  const usedProductIds = [
    ...(selectedDrinkMixId ? [selectedDrinkMixId] : []),
    ...selectedSolidIds,
  ];
  const includeUnavailableProducts = usedProductIds.some((productId) => {
    const product = products.find((candidate) => candidate.id === productId);
    return product ? !product.isAvailable : false;
  });

  return {
    ride: plan.rideCharacteristics,
    selectedBottleCounts: BOTTLE_SIZES.reduce((acc, size) => {
      acc[size] = selectedBottleCounts[size];
      return acc;
    }, emptyBottleCounts()),
    selectedDrinkMixId,
    selectedSolidIds,
    includeUnavailableProducts,
    title: plan.title,
  };
}
