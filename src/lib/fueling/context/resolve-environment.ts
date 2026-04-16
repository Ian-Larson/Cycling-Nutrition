import type { Environment, EffectiveHeat } from '../types';
import {
  WET_BULB_STULL_COEFFICIENTS,
  WET_BULB_HEAT_THRESHOLDS,
} from '../constants/science';

const DEFAULT_RH_PERCENT = 50;

/** Ordered heat bands from coldest to hottest, used for acclimatization shifting. */
const HEAT_BANDS: readonly EffectiveHeat[] = [
  'cold',
  'cool',
  'moderate',
  'warm',
  'hot',
  'extreme',
] as const;

/** Wet-bulb temperature thresholds for effective heat classification, imported from science constants. */
const WET_BULB_THRESHOLDS: readonly { below: number; heat: EffectiveHeat }[] = [
  { below: WET_BULB_HEAT_THRESHOLDS.cold, heat: 'cold' },
  { below: WET_BULB_HEAT_THRESHOLDS.cool, heat: 'cool' },
  { below: WET_BULB_HEAT_THRESHOLDS.moderate, heat: 'moderate' },
  { below: WET_BULB_HEAT_THRESHOLDS.warm, heat: 'warm' },
  { below: WET_BULB_HEAT_THRESHOLDS.hot, heat: 'hot' },
];

export interface ResolvedEnvironment {
  effectiveHeat: EffectiveHeat;
  dryBulbCelsius?: number;
  relativeHumidityPercent?: number;
  wetBulbCelsius?: number;
  altitudeMeters?: number;
  heatAcclimatized: boolean;
}

/**
 * Compute wet-bulb temperature using the Stull 2011 closed-form approximation.
 *
 *   T_wb = T * atan(a * sqrt(RH + b))
 *        + atan(T + RH)
 *        - atan(RH - c)
 *        + d * RH^1.5 * atan(e * RH)
 *        - f
 *
 * @param dryBulbC Dry-bulb air temperature in degrees Celsius
 * @param rhPercent Relative humidity in percent (0-100)
 */
function computeWetBulb(dryBulbC: number, rhPercent: number): number {
  const { a, b, c, d, e, f } = WET_BULB_STULL_COEFFICIENTS;
  return (
    dryBulbC * Math.atan(a * Math.sqrt(rhPercent + b)) +
    Math.atan(dryBulbC + rhPercent) -
    Math.atan(rhPercent - c) +
    d * rhPercent ** 1.5 * Math.atan(e * rhPercent) -
    f
  );
}

/** Classify wet-bulb temperature into an effective heat band. */
function classifyHeat(wetBulbC: number): EffectiveHeat {
  for (const { below, heat } of WET_BULB_THRESHOLDS) {
    if (wetBulbC < below) return heat;
  }
  return 'extreme';
}

/** Shift heat one band cooler for acclimatized riders, floored at 'cold'. */
function shiftCooler(heat: EffectiveHeat): EffectiveHeat {
  const idx = HEAT_BANDS.indexOf(heat);
  return idx <= 0 ? 'cold' : HEAT_BANDS[idx - 1];
}

/**
 * Resolve raw environment inputs into a standardized ResolvedEnvironment.
 *
 * - Computes wet-bulb temperature via Stull 2011 when dry-bulb is available.
 * - Assumes 50% RH if humidity is not provided.
 * - Defaults to 'moderate' when no environment data at all.
 * - Shifts one band cooler when heat-acclimatized.
 */
export function resolveEnvironment(env?: Environment): ResolvedEnvironment {
  const heatAcclimatized = env?.heatAcclimatized ?? false;

  // No temperature data at all → default to moderate
  if (!env || env.dryBulbCelsius === undefined) {
    return {
      effectiveHeat: heatAcclimatized ? shiftCooler('moderate') : 'moderate',
      dryBulbCelsius: env?.dryBulbCelsius,
      relativeHumidityPercent: env?.relativeHumidityPercent,
      altitudeMeters: env?.altitudeMeters,
      heatAcclimatized,
    };
  }

  const dryBulbC = env.dryBulbCelsius;
  const rhPercent = env.relativeHumidityPercent ?? DEFAULT_RH_PERCENT;
  const wetBulbC = computeWetBulb(dryBulbC, rhPercent);

  let effectiveHeat = classifyHeat(wetBulbC);
  if (heatAcclimatized) {
    effectiveHeat = shiftCooler(effectiveHeat);
  }

  return {
    effectiveHeat,
    dryBulbCelsius: dryBulbC,
    relativeHumidityPercent: rhPercent,
    wetBulbCelsius: wetBulbC,
    altitudeMeters: env.altitudeMeters,
    heatAcclimatized,
  };
}
