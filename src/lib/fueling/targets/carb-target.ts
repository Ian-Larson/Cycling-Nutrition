import type { FuelingContext } from '../context';
import type { Warning } from '../types';
import { DURATION_CHO_BRACKETS } from '../constants/science';

export interface CarbTargetResult {
  carbsGPerHour: number;
  totalCarbsGrams: number;
  usesMultiTransportableCarbs: boolean;
  warnings: Warning[];
}

/** Round to nearest multiple of `step`. */
function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Compute during-ride carbohydrate target (g/h and total g).
 *
 * Algorithm:
 * 1. Duration-bracket lookup for ceiling g/h.
 * 2. Intensity modifier (recovery/adaptation → 0; low IF → -20%; race/vo2 → full).
 * 3. Gut ceiling cap with warning.
 * 4. Multi-transportable-carb flag when bracket requires fructose mix AND rate >60 g/h.
 * 5. Round g/h to nearest 5.
 */
export function carbTarget(context: FuelingContext): CarbTargetResult {
  const { rider, session, purpose } = context;
  const { durationMinutes, intensityFactor } = session;
  const warnings: Warning[] = [];

  // 1. Recovery / adaptation → zero fuel
  if (purpose === 'recovery' || purpose === 'adaptation') {
    return {
      carbsGPerHour: 0,
      totalCarbsGrams: 0,
      usesMultiTransportableCarbs: false,
      warnings,
    };
  }

  // 2. Find duration bracket
  const bracket = DURATION_CHO_BRACKETS.find(b => durationMinutes <= b.maxMinutes)
    ?? DURATION_CHO_BRACKETS[DURATION_CHO_BRACKETS.length - 1];

  let ceiling = bracket.ceilingGph;

  // 3. Intensity modifier
  if (intensityFactor < 0.82) {
    // Below tempo — reduce ceiling by 20%
    ceiling *= 0.8;
  }
  // IF 0.82–0.97: ceiling as-is
  // IF >= 0.97: full ceiling (no change)

  // 4. Gut ceiling cap
  let carbsGPerHour = ceiling;
  if (carbsGPerHour > rider.currentGutCeilingGph) {
    warnings.push({
      code: 'gut-cap-applied',
      severity: 'info',
      message: `Gut ceiling reduced target from ${Math.round(carbsGPerHour)} to ${rider.currentGutCeilingGph} g/h`,
      details: { prescribed: carbsGPerHour, cap: rider.currentGutCeilingGph },
    });
    carbsGPerHour = rider.currentGutCeilingGph;
  }

  // 5. Multi-transportable carbs flag
  const usesMultiTransportableCarbs = bracket.requiresFructoseMix && carbsGPerHour > 60;

  // 6. Round to nearest 5
  carbsGPerHour = roundTo(carbsGPerHour, 5);

  // 7. Total carbs
  const totalCarbsGrams = carbsGPerHour * (durationMinutes / 60);

  return {
    carbsGPerHour,
    totalCarbsGrams,
    usesMultiTransportableCarbs,
    warnings,
  };
}
