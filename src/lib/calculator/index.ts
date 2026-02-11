import type { Bottle, Product, FuelPlan, RideCharacteristics, SolidAllocation } from '@/types';
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

  const totalCarbsPlanned =
    bottles.reduce((sum, b) => sum + b.carbsTotal, 0) + solidCarbs;

  return {
    rideCharacteristics: input.ride,
    bottles,
    solids: solidAllocations,
    consumptionGuide,
    summary: {
      totalCarbsPlanned,
      totalCarbsNeeded,
      hydrationMl: calculateHydrationNeeds(input.ride),
    },
  };
}

export { calculateTotalCarbsNeeded, calculateHydrationNeeds } from './carbs';
