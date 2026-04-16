import type { RiderProfile, EffectiveHeat } from '../types';
import {
  DEFAULT_SWEAT_RATE_LPH_BY_HEAT,
  DEFAULT_SWEAT_SODIUM_MG_PER_L,
  HEAVY_SWEATER_SODIUM_MG_PER_L,
  GUT_TRAINING,
  MASTERS_AGE_THRESHOLD,
} from '../constants/science';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface ResolvedRider extends RiderProfile {
  sweatRateLph: number;
  sweatSodiumMgPerL: number;
  isMasters: boolean;
}

/**
 * Fill defaults for optional rider fields and track what was inferred.
 *
 * - Infers sweat rate from effective heat when not provided.
 * - Infers sweat sodium from heavySweater flag when not provided.
 * - Clamps gut ceiling to the science-backed range [30, 120].
 * - Derives isMasters from age.
 */
export function resolveRider(
  rider: RiderProfile,
  effectiveHeat: EffectiveHeat,
): { resolved: ResolvedRider; missing: string[] } {
  const missing: string[] = [];

  // Sweat rate
  let sweatRateLph: number;
  if (rider.sweatRateLph !== undefined) {
    sweatRateLph = rider.sweatRateLph;
  } else {
    sweatRateLph = DEFAULT_SWEAT_RATE_LPH_BY_HEAT[effectiveHeat];
    missing.push('sweatRate');
  }

  // Sweat sodium
  let sweatSodiumMgPerL: number;
  if (rider.sweatSodiumMgPerL !== undefined) {
    sweatSodiumMgPerL = rider.sweatSodiumMgPerL;
  } else {
    sweatSodiumMgPerL = rider.heavySweater
      ? HEAVY_SWEATER_SODIUM_MG_PER_L
      : DEFAULT_SWEAT_SODIUM_MG_PER_L;
    missing.push('sweatSodium');
  }

  // Gut ceiling clamped to science range
  const currentGutCeilingGph = clamp(
    rider.currentGutCeilingGph,
    GUT_TRAINING.startGph,
    GUT_TRAINING.ceilingGph,
  );

  // Masters detection
  const isMasters = rider.age !== undefined && rider.age >= MASTERS_AGE_THRESHOLD;

  const resolved: ResolvedRider = {
    ...rider,
    sweatRateLph,
    sweatSodiumMgPerL,
    currentGutCeilingGph,
    isMasters,
  };

  return { resolved, missing };
}
