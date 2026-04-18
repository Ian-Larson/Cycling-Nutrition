import type { Bottle } from '@/types';

export interface BottleSelectionResult {
  selectedBottles: Bottle[];
  totalCapacityMl: number;
  fluidShortfallMl: number;
}

const MAX_BOTTLES = 2;

/**
 * Choose the fewest bottles (up to MAX_BOTTLES) that meet the hydration
 * need, accounting for refuel stops. When even the largest bottles can't
 * cover the target, we still cap at MAX_BOTTLES and surface the unmet
 * fluid as fluidShortfallMl so the UI can suggest an extra refill stop.
 */
export function selectBottles(
  bottles: Bottle[],
  targetFluidMl: number,
  refuelStopCount: number,
): BottleSelectionResult {
  const available = bottles.filter((b) => b.isAvailable);
  if (available.length === 0) {
    return {
      selectedBottles: [],
      totalCapacityMl: 0,
      fluidShortfallMl: targetFluidMl,
    };
  }

  const legs = refuelStopCount + 1;
  const adjustedTarget = targetFluidMl / legs;
  const descending = [...available].sort((a, b) => b.capacityMl - a.capacityMl);

  // 1. Try single bottle: smallest that fits per leg
  const singleCandidates = descending
    .filter((b) => b.capacityMl >= adjustedTarget)
    .sort((a, b) => a.capacityMl - b.capacityMl);

  if (singleCandidates.length > 0) {
    const picked = singleCandidates[0];
    return {
      selectedBottles: [picked],
      totalCapacityMl: picked.capacityMl,
      fluidShortfallMl: 0,
    };
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
      return {
        selectedBottles: bestCombo,
        totalCapacityMl: bestCapacity,
        fluidShortfallMl: 0,
      };
    }
  }

  // 3. Target exceeds what MAX_BOTTLES can hold for one leg — pick the
  //    largest bottles available (up to the cap) and report the gap.
  const picks = descending.slice(0, Math.min(MAX_BOTTLES, available.length));
  const totalCapacityMl = picks.reduce((sum, b) => sum + b.capacityMl, 0);
  const fluidShortfallMl = Math.max(
    0,
    Math.round(targetFluidMl - totalCapacityMl * legs),
  );

  return { selectedBottles: picks, totalCapacityMl, fluidShortfallMl };
}
