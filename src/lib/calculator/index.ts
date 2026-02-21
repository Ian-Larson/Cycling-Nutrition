import type { Bottle, Product, FuelPlan, FuelPlanWarning, RideCharacteristics, SolidAllocation } from '@/types';
import { calculateTotalCarbsNeeded, calculateHydrationNeeds } from './carbs';
import { selectBottlesForHydration, allocateMixToBottles } from './bottles';
import { recommendSolids } from './solids';
import { generateConsumptionGuide } from './timing';
import {
  DEFAULT_MIN_CONCENTRATION,
  DEFAULT_MAX_CONCENTRATION,
  MAX_CARB_CONCENTRATION_G_PER_ML,
} from './constants';

export interface CalculatorInput {
  ride: RideCharacteristics;
  availableBottles: Bottle[];
  drinkMix: Product;
  availableSolids: Product[];
}

export interface PlanAdjustments {
  solidOverrides?: { productId: string; quantity: number }[];
  bottleCount?: number;
}

function getTargetConcentration(drinkMix: Product): {
  target: number;
  min: number;
  max: number;
} {
  const productMin = drinkMix.concentration?.minGPerMl;
  const productMax = drinkMix.concentration?.maxGPerMl;

  const min = productMin ?? DEFAULT_MIN_CONCENTRATION;
  const max = productMax ?? DEFAULT_MAX_CONCENTRATION;
  const target = (min + max) / 2;

  return { target, min, max };
}

export function calculateFuelPlan(
  input: CalculatorInput
): Omit<FuelPlan, 'id' | 'createdAt'> {
  const totalCarbsNeeded = calculateTotalCarbsNeeded(input.ride);
  const refuelStops = input.ride.refuelStops || 0;
  const refuelMultiplier = refuelStops + 1;

  // 1. Select bottles for hydration (prefer fewer bottles)
  const selectedBottles = selectBottlesForHydration(input.availableBottles, input.ride);
  const totalBottleCapacityMl = selectedBottles.reduce((sum, b) => sum + b.capacityMl, 0);

  // 2. Concentration → ideal drink carbs
  const { target: targetConc, min: minConc, max: maxConc } = getTargetConcentration(input.drinkMix);
  const idealDrinkCarbsPerFill = Math.round(totalBottleCapacityMl * targetConc);
  const drinkCarbsPerFill = Math.min(idealDrinkCarbsPerFill, Math.round(totalCarbsNeeded / refuelMultiplier));

  // 3. Remainder → solids
  const totalDrinkCarbs = drinkCarbsPerFill * refuelMultiplier;
  const solidBudget = Math.max(0, totalCarbsNeeded - totalDrinkCarbs);

  const solidRecs = recommendSolids(
    input.availableSolids,
    solidBudget,
    input.ride.durationMinutes
  );
  const actualSolidCarbs = solidRecs.reduce(
    (sum, r) => sum + r.product.nutrition.carbsGrams * r.quantity,
    0
  );

  // 4. Reconcile: adjust concentration to close the gap within ±5g
  const gap = totalCarbsNeeded - (totalDrinkCarbs + actualSolidCarbs);
  let finalDrinkCarbsPerFill = drinkCarbsPerFill;

  if (Math.abs(gap) > 5) {
    // Try adjusting drink carbs to close gap
    const adjustedDrinkCarbsPerFill = drinkCarbsPerFill + Math.round(gap / refuelMultiplier);
    const adjustedConcentration = adjustedDrinkCarbsPerFill / totalBottleCapacityMl;

    if (adjustedConcentration >= minConc && adjustedConcentration <= MAX_CARB_CONCENTRATION_G_PER_ML) {
      finalDrinkCarbsPerFill = adjustedDrinkCarbsPerFill;
    } else {
      // Clamp to acceptable range
      const clampedConc = Math.min(Math.max(adjustedConcentration, minConc), MAX_CARB_CONCENTRATION_G_PER_ML);
      finalDrinkCarbsPerFill = Math.round(totalBottleCapacityMl * clampedConc);
    }
  }

  // 5. Allocate mix to bottles
  const bottles = allocateMixToBottles(selectedBottles, finalDrinkCarbsPerFill, input.drinkMix);

  // Build solid allocations
  const solidAllocations: SolidAllocation[] = solidRecs.map((r) => ({
    productId: r.product.id,
    quantity: r.quantity,
    carbsTotal: r.product.nutrition.carbsGrams * r.quantity,
    timingIntervalMinutes: Math.floor(input.ride.durationMinutes / (r.quantity + 1)),
  }));

  const allProducts = [
    input.drinkMix,
    ...solidRecs.map((r) => r.product),
  ];

  const consumptionGuide = generateConsumptionGuide(
    bottles,
    solidAllocations,
    input.ride,
    input.availableBottles,
    allProducts
  );

  const bottleCarbsPerFill = bottles.reduce((sum, b) => sum + b.carbsTotal, 0);
  const totalCarbsPlanned = bottleCarbsPerFill * refuelMultiplier + actualSolidCarbs;

  // Build warnings
  const warnings: FuelPlanWarning[] = [];

  // Check concentration
  const actualConcentration = totalBottleCapacityMl > 0
    ? bottleCarbsPerFill / totalBottleCapacityMl
    : 0;

  if (actualConcentration > maxConc) {
    warnings.push({
      type: 'concentration_limit',
      message: `Drink concentration is ${(actualConcentration * 100).toFixed(1)}g/100ml, above the recommended max of ${(maxConc * 100).toFixed(1)}g/100ml. Consider adding a bottle or reducing carb target.`,
    });
  }

  if (totalCarbsPlanned < totalCarbsNeeded - 10) {
    const deficit = totalCarbsNeeded - totalCarbsPlanned;
    if (input.availableSolids.length === 0) {
      warnings.push({
        type: 'concentration_limit',
        message: `Planned carbs are ${deficit}g short. Toggle some solid fuel products (gels/chews) on the Inventory page to make up the difference.`,
      });
    } else {
      warnings.push({
        type: 'concentration_limit',
        message: `Planned carbs are ${deficit}g short of target. Consider a refuel stop or higher-carb products.`,
      });
    }
  }

  const summary: Omit<FuelPlan, 'id' | 'createdAt'>['summary'] = {
    totalCarbsPlanned,
    totalCarbsNeeded,
    hydrationMl: calculateHydrationNeeds(input.ride),
  };

  if (
    input.ride.autoMetrics &&
    Number.isFinite(input.ride.autoMetrics.sodiumMgPerHour)
  ) {
    summary.sodiumMgPerHour = input.ride.autoMetrics.sodiumMgPerHour;
    summary.sodiumMgTotal = Math.round(
      input.ride.autoMetrics.sodiumMgPerHour * (input.ride.durationMinutes / 60)
    );
  }

  return {
    rideCharacteristics: input.ride,
    bottles,
    solids: solidAllocations,
    consumptionGuide,
    ...(warnings.length > 0 ? { warnings } : {}),
    summary,
  };
}

/**
 * Recalculate a plan with inline adjustments (solid count or bottle count changes).
 * Does not re-run the full form — just adjusts quantities and rebalances.
 */
export function recalculatePlan(
  originalInput: CalculatorInput,
  currentPlan: Omit<FuelPlan, 'id' | 'createdAt'>,
  adjustments: PlanAdjustments
): Omit<FuelPlan, 'id' | 'createdAt'> {
  const totalCarbsNeeded = currentPlan.summary.totalCarbsNeeded;
  const refuelStops = currentPlan.rideCharacteristics.refuelStops || 0;
  const refuelMultiplier = refuelStops + 1;

  // Resolve bottles (possibly with count override)
  const selectedBottles = adjustments.bottleCount !== undefined
    ? selectBottlesForHydration(originalInput.availableBottles, currentPlan.rideCharacteristics, adjustments.bottleCount)
    : originalInput.availableBottles.filter((b) =>
        currentPlan.bottles.some((alloc) => alloc.bottleId === b.id)
      );

  const totalBottleCapacityMl = selectedBottles.reduce((sum, b) => sum + b.capacityMl, 0);
  const { min: minConc, max: maxConc } = getTargetConcentration(originalInput.drinkMix);

  // Resolve solids
  let solidAllocations: SolidAllocation[];
  if (adjustments.solidOverrides) {
    solidAllocations = adjustments.solidOverrides
      .filter((o) => o.quantity > 0)
      .map((o) => {
        const product = originalInput.availableSolids.find((p) => p.id === o.productId);
        const carbsPerUnit = product?.nutrition.carbsGrams ?? 0;
        return {
          productId: o.productId,
          quantity: o.quantity,
          carbsTotal: carbsPerUnit * o.quantity,
          timingIntervalMinutes: Math.floor(
            currentPlan.rideCharacteristics.durationMinutes / (o.quantity + 1)
          ),
        };
      });
  } else {
    solidAllocations = [...currentPlan.solids];
  }

  const actualSolidCarbs = solidAllocations.reduce((sum, s) => sum + s.carbsTotal, 0);

  // Recalculate drink carbs to fill the gap
  const drinkCarbsNeeded = Math.max(0, totalCarbsNeeded - actualSolidCarbs);
  const drinkCarbsPerFill = Math.round(drinkCarbsNeeded / refuelMultiplier);

  // Allocate mix to bottles
  const bottles = allocateMixToBottles(selectedBottles, drinkCarbsPerFill, originalInput.drinkMix);

  const bottleCarbsPerFill = bottles.reduce((sum, b) => sum + b.carbsTotal, 0);
  const totalCarbsPlanned = bottleCarbsPerFill * refuelMultiplier + actualSolidCarbs;

  // Rebuild consumption guide
  const allProducts = [
    originalInput.drinkMix,
    ...originalInput.availableSolids,
  ];
  const consumptionGuide = generateConsumptionGuide(
    bottles,
    solidAllocations,
    currentPlan.rideCharacteristics,
    selectedBottles,
    allProducts
  );

  // Build warnings
  const warnings: FuelPlanWarning[] = [];
  const actualConcentration = totalBottleCapacityMl > 0
    ? bottleCarbsPerFill / totalBottleCapacityMl
    : 0;

  if (actualConcentration > maxConc) {
    warnings.push({
      type: 'concentration_limit',
      message: `Drink concentration is ${(actualConcentration * 100).toFixed(1)}g/100ml, above the recommended max of ${(maxConc * 100).toFixed(1)}g/100ml.`,
    });
  }
  if (actualConcentration < minConc && bottleCarbsPerFill > 0) {
    warnings.push({
      type: 'concentration_limit',
      message: `Drink concentration is ${(actualConcentration * 100).toFixed(1)}g/100ml, below the recommended min of ${(minConc * 100).toFixed(1)}g/100ml.`,
    });
  }

  return {
    rideCharacteristics: currentPlan.rideCharacteristics,
    bottles,
    solids: solidAllocations,
    consumptionGuide,
    ...(warnings.length > 0 ? { warnings } : {}),
    summary: {
      ...currentPlan.summary,
      totalCarbsPlanned,
    },
  };
}

export { calculateTotalCarbsNeeded, calculateHydrationNeeds } from './carbs';
