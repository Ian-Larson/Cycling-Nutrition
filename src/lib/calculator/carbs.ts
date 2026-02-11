import type { RideCharacteristics } from '@/types';
import { HYDRATION_MULTIPLIERS, BASE_HYDRATION_ML_PER_HOUR } from './constants';

export function calculateTotalCarbsNeeded(ride: RideCharacteristics): number {
  const hours = ride.durationMinutes / 60;
  return Math.round(hours * ride.carbTargetGramsPerHour);
}

export function calculateHydrationNeeds(ride: RideCharacteristics): number {
  const hours = ride.durationMinutes / 60;
  const heatMult = HYDRATION_MULTIPLIERS.heat[ride.heatFactor];
  const intensityMult = HYDRATION_MULTIPLIERS.intensity[ride.intensity];
  return Math.round(BASE_HYDRATION_ML_PER_HOUR * hours * heatMult * intensityMult);
}
