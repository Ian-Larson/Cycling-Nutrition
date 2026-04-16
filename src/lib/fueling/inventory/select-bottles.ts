import type { Bottle } from '@/types';

export interface BottleSelectionResult {
  selectedBottles: Bottle[];
  totalCapacityMl: number;
}

/**
 * Choose the fewest bottles that meet the hydration need, accounting
 * for refuel stops that let the rider refill mid-ride.
 */
export function selectBottles(
  bottles: Bottle[],
  targetFluidMl: number,
  refuelStopCount: number,
): BottleSelectionResult {
  const available = bottles.filter((b) => b.isAvailable);
  if (available.length === 0) {
    return { selectedBottles: [], totalCapacityMl: 0 };
  }

  // Each leg only needs to carry a fraction of total fluid
  const adjustedTarget = targetFluidMl / (refuelStopCount + 1);

  // Sort descending by capacity for single-bottle search
  const descending = [...available].sort((a, b) => b.capacityMl - a.capacityMl);

  // 1. Try single bottle: smallest that fits
  const singleCandidates = descending
    .filter((b) => b.capacityMl >= adjustedTarget)
    .sort((a, b) => a.capacityMl - b.capacityMl); // smallest first among those that fit

  if (singleCandidates.length > 0) {
    const picked = singleCandidates[0];
    return { selectedBottles: [picked], totalCapacityMl: picked.capacityMl };
  }

  // 2. Try 2-bottle combos: minimum total capacity that meets target
  if (available.length >= 2) {
    let bestCombo: Bottle[] | null = null;
    let bestCapacity = Infinity;

    for (let i = 0; i < available.length; i++) {
      for (let j = i + 1; j < available.length; j++) {
        const capacity = available[i].capacityMl + available[j].capacityMl;
        if (capacity >= adjustedTarget && capacity < bestCapacity) {
          bestCombo = [available[i], available[j]];
          bestCapacity = capacity;
        }
      }
    }

    if (bestCombo) {
      return { selectedBottles: bestCombo, totalCapacityMl: bestCapacity };
    }
  }

  // 3. Fallback: return all available bottles
  const totalCapacityMl = available.reduce((sum, b) => sum + b.capacityMl, 0);
  return { selectedBottles: available, totalCapacityMl };
}
