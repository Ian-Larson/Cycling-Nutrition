import type { FuelingContext } from '../context';
import type { Warning } from '../types';
import {
  DURATION_CHO_BRACKETS,
  CARB_INTENSITY_ADJUSTMENT,
  SINGLE_TRANSPORTER_MAX_GPH,
} from '../constants/science';

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
 * 1. Recovery / adaptation purpose → 0.
 * 2. If the session provides `carbsGPerHourOverride`, honor it as the target
 *    (the user's plan wins over the duration-bracket default; pre/post-ride
 *    carbs stack on top and never reduce this value).
 * 3. Otherwise, derive from duration bracket × intensity modifier.
 * 4. Gut ceiling cap with warning (safety limit — applies to both paths).
 * 5. Multi-transportable-carb flag when the effective rate > 60 g/h
 *    (or the bracket requires fructose mix when no override is set).
 * 6. Round g/h to nearest 5.
 */
export function carbTarget(context: FuelingContext): CarbTargetResult {
  const { rider, session, purpose } = context;
  const { durationMinutes, intensityFactor, carbsGPerHourOverride } = session;
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

  const hasOverride =
    typeof carbsGPerHourOverride === 'number' &&
    Number.isFinite(carbsGPerHourOverride) &&
    carbsGPerHourOverride > 0;

  let carbsGPerHour: number;
  let bracketRequiresFructoseMix: boolean;

  if (hasOverride) {
    // 2. Honor the user's explicit target.
    carbsGPerHour = carbsGPerHourOverride!;
    bracketRequiresFructoseMix = false;
  } else {
    // 3. Duration bracket + intensity modifier
    const bracket = DURATION_CHO_BRACKETS.find(b => durationMinutes <= b.maxMinutes)
      ?? DURATION_CHO_BRACKETS[DURATION_CHO_BRACKETS.length - 1];

    let ceiling = bracket.ceilingGph;

    if (intensityFactor < CARB_INTENSITY_ADJUSTMENT.tempoIfThreshold) {
      // Below tempo — reduce ceiling
      ceiling *= CARB_INTENSITY_ADJUSTMENT.reductionFactor;
    }

    carbsGPerHour = ceiling;
    bracketRequiresFructoseMix = bracket.requiresFructoseMix;
  }

  // 4. Gut ceiling cap — safety limit regardless of source
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
  const exceedsSingleTransporter = carbsGPerHour > SINGLE_TRANSPORTER_MAX_GPH;
  const usesMultiTransportableCarbs = hasOverride
    ? exceedsSingleTransporter
    : bracketRequiresFructoseMix && exceedsSingleTransporter;

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
