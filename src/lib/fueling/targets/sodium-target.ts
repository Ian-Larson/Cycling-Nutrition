import type { FuelingContext } from '../context';
import type { Warning } from '../types';
import {
  BOTTLE_SODIUM_MG_PER_L_RANGE,
  BOTTLE_SODIUM_MG_PER_L_HEAVY_SWEATER_CEILING,
  SODIUM_REPLACEMENT_FRACTION,
} from '../constants/science';

export interface SodiumTargetResult {
  sodiumMgPerHour: number;
  sodiumMgPerLiterTargetInBottles: number;
  warnings: Warning[];
}

/** Round to nearest multiple of `step`. */
function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compute during-ride sodium target (mg/h and bottle concentration).
 *
 * Algorithm:
 * 1. Sodium loss = actual sweat rate x sweat [Na+].
 * 2. Target replacement = 60% of loss (standard guidance).
 * 3. Bottle [Na+] = target mg/h / drink volume L/h, clamped to safe range.
 * 4. Heavy-sweater ceiling applies when flagged.
 * 5. Round mg/h to nearest 50.
 */
export function sodiumTarget(
  context: FuelingContext,
  hydrationMlPerHour: number,
): SodiumTargetResult {
  const { rider } = context;
  const warnings: Warning[] = [];

  // 1. Sodium loss from actual sweat (not drink volume)
  const sodiumLossMgPerHour = rider.sweatRateLph * rider.sweatSodiumMgPerL;

  // 2. Target replacement: replace fraction of loss
  let sodiumMgPerHour = sodiumLossMgPerHour * SODIUM_REPLACEMENT_FRACTION;

  // 3. Bottle [Na+] target
  const drinkVolumeLph = hydrationMlPerHour / 1000;
  const rawConcentration = drinkVolumeLph > 0 ? sodiumMgPerHour / drinkVolumeLph : 0;

  // 4. Clamp to safe range; use heavy-sweater ceiling when flagged
  const maxConcentration = rider.heavySweater
    ? BOTTLE_SODIUM_MG_PER_L_HEAVY_SWEATER_CEILING
    : BOTTLE_SODIUM_MG_PER_L_RANGE.max;

  const clampedConcentration = clamp(
    rawConcentration,
    BOTTLE_SODIUM_MG_PER_L_RANGE.min,
    maxConcentration,
  );

  // 5. If clamped upward (concentration was below min, meaning loss exceeds bottle delivery)
  //    or more precisely, if we had to clamp DOWN, meaning loss is very high
  if (rawConcentration > maxConcentration) {
    warnings.push({
      code: 'sodium-ceiling',
      severity: 'info',
      message: `Bottle sodium concentration capped at ${maxConcentration} mg/L; consider supplemental sodium`,
      details: {
        uncappedMgPerL: Math.round(rawConcentration),
        cappedMgPerL: maxConcentration,
      },
    });
    // Adjust sodium/h to what bottles can actually deliver
    sodiumMgPerHour = clampedConcentration * drinkVolumeLph;
  }

  // 6. Round mg/h to nearest 50
  sodiumMgPerHour = roundTo(sodiumMgPerHour, 50);

  return {
    sodiumMgPerHour,
    sodiumMgPerLiterTargetInBottles: clampedConcentration,
    warnings,
  };
}
