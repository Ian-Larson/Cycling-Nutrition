import type { Bottle, Product, FuelPlan, FuelPlanWarning, RideCharacteristics, SolidAllocation } from '@/types';
import { calculateTotalCarbsNeeded, calculateHydrationNeeds } from './carbs';
import { selectBottlesForHydration, allocateMixToBottles } from './bottles';
import { recommendSolids } from './solids';
import { generateConsumptionGuide } from './timing';

export interface CalculatorInput {
  ride: RideCharacteristics;
  availableBottles: Bottle[];
  drinkMix: Product;
  availableSolids: Product[];
}

export function calculateFuelPlan(
  input: CalculatorInput
): Omit<FuelPlan, 'id' | 'createdAt'> {
  const totalCarbsNeeded = calculateTotalCarbsNeeded(input.ride);
  const refuelStops = input.ride.refuelStops || 0;
  const refuelMultiplier = refuelStops + 1;

  // 1. Select bottles for hydration
  const selectedBottles = selectBottlesForHydration(input.availableBottles, input.ride);

  // 2. Recommend solids first at preferred rate
  const solidRecs = recommendSolids(
    input.availableSolids,
    totalCarbsNeeded,
    input.ride.durationMinutes
  );

  // 3. Calculate actual solid carbs and remaining drink carbs needed
  const actualSolidCarbs = solidRecs.reduce(
    (sum, r) => sum + r.product.nutrition.carbsGrams * r.quantity,
    0
  );
  const drinkCarbsNeeded = Math.max(0, totalCarbsNeeded - actualSolidCarbs);

  // 4. Allocate drink mix to bottles (concentrated into fewest bottles)
  const drinkCarbsPerFill = drinkCarbsNeeded / refuelMultiplier;
  const bottles = allocateMixToBottles(selectedBottles, drinkCarbsPerFill, input.drinkMix);

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

  const warnings: FuelPlanWarning[] = [];
  if (totalCarbsPlanned < totalCarbsNeeded) {
    const deficit = totalCarbsNeeded - totalCarbsPlanned;
    if (input.availableSolids.length === 0) {
      warnings.push({
        type: 'concentration_limit',
        message: `Bottle concentration limits reduce planned carbs by ${deficit}g. Toggle some solid fuel products (gels/chews) on the Inventory page to make up the difference.`,
      });
    } else {
      warnings.push({
        type: 'concentration_limit',
        message: `Even with solids at max rate, planned carbs are ${deficit}g short. Consider a refuel stop or higher-carb products.`,
      });
    }
  }

  return {
    rideCharacteristics: input.ride,
    bottles,
    solids: solidAllocations,
    consumptionGuide,
    ...(warnings.length > 0 ? { warnings } : {}),
    summary: {
      totalCarbsPlanned,
      totalCarbsNeeded,
      hydrationMl: calculateHydrationNeeds(input.ride),
    },
  };
}

export { calculateTotalCarbsNeeded, calculateHydrationNeeds } from './carbs';
