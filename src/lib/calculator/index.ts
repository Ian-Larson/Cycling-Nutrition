import type { Bottle, Product, FuelPlan, FuelPlanWarning, RideCharacteristics, SolidAllocation } from '@/types';
import { calculateTotalCarbsNeeded, calculateHydrationNeeds } from './carbs';
import { selectOptimalBottles } from './bottles';
import { generateConsumptionGuide } from './timing';

export interface CalculatorInput {
  ride: RideCharacteristics;
  availableBottles: Bottle[];
  drinkMix: Product;
  solids: Array<{ product: Product; quantity: number }>;
}

export function calculateFuelPlan(
  input: CalculatorInput
): Omit<FuelPlan, 'id' | 'createdAt'> {
  const totalCarbsNeeded = calculateTotalCarbsNeeded(input.ride);
  const solidCarbs = input.solids.reduce(
    (sum, s) => sum + s.product.nutrition.carbsGrams * s.quantity,
    0
  );
  const drinkCarbsNeeded = Math.max(0, totalCarbsNeeded - solidCarbs);

  const bottles = selectOptimalBottles(
    input.availableBottles,
    drinkCarbsNeeded,
    input.drinkMix,
    input.ride
  );

  const solidAllocations: SolidAllocation[] = input.solids.map((s) => ({
    productId: s.product.id,
    quantity: s.quantity,
    carbsTotal: s.product.nutrition.carbsGrams * s.quantity,
    timingIntervalMinutes: Math.floor(input.ride.durationMinutes / (s.quantity + 1)),
  }));

  const allProducts = [input.drinkMix, ...input.solids.map((s) => s.product)];

  const consumptionGuide = generateConsumptionGuide(
    bottles,
    solidAllocations,
    input.ride,
    input.availableBottles,
    allProducts
  );

  const refuelMultiplier = (input.ride.refuelStops || 0) + 1;
  const bottleCarbsPerFill = bottles.reduce((sum, b) => sum + b.carbsTotal, 0);
  const totalCarbsPlanned = bottleCarbsPerFill * refuelMultiplier + solidCarbs;

  const warnings: FuelPlanWarning[] = [];
  if (totalCarbsPlanned < totalCarbsNeeded) {
    const deficit = totalCarbsNeeded - totalCarbsPlanned;
    warnings.push({
      type: 'concentration_limit',
      message: `Bottle concentration limits reduce planned carbs by ${deficit}g. Consider adding solid fuel (gels/chews) or using a refuel stop to make up the difference.`,
    });
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
