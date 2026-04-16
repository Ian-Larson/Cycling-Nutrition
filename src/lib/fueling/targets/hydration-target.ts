import type { FuelingContext } from '../context';
import type { Warning } from '../types';

export interface HydrationTargetResult {
  hydrationMlPerHour: number;
  totalHydrationMl: number;
  warnings: Warning[];
}

/** GI absorption ceiling for fluid intake (ml/h). */
const MAX_FLUID_ML_PER_HOUR = 1200;

/** Round to nearest multiple of `step`. */
function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compute during-ride hydration target (ml/h and total ml).
 *
 * Algorithm:
 * 1. Base ml/h from rider sweat rate.
 * 2. Intensity adjustment factor: 0.9 + 0.5*(IF - 0.5), clamped [0.8, 1.4].
 * 3. Cap at 1200 ml/h (GI limit).
 * 4. Deficit warning if drinking < 60% of sweat losses.
 * 5. Overhydration warning if drinking > 103% of sweat losses.
 * 6. Round ml/h to nearest 50.
 */
export function hydrationTarget(context: FuelingContext): HydrationTargetResult {
  const { rider, session } = context;
  const { durationMinutes, intensityFactor } = session;
  const warnings: Warning[] = [];

  // 1. Base ml/h from sweat rate
  const sweatMlPerHour = rider.sweatRateLph * 1000;
  let mlPerHour = sweatMlPerHour;

  // 2. Intensity adjustment factor
  const factor = clamp(0.9 + 0.5 * (intensityFactor - 0.5), 0.8, 1.4);
  mlPerHour *= factor;

  // 3. Cap at GI limit
  mlPerHour = Math.min(mlPerHour, MAX_FLUID_ML_PER_HOUR);

  // 4. Deficit warning (before rounding)
  if (mlPerHour < sweatMlPerHour * 0.6) {
    const predictedLossPct = ((sweatMlPerHour - mlPerHour) / sweatMlPerHour) * 100;
    warnings.push({
      code: 'hydration-deficit',
      severity: 'warn',
      message: `Fluid intake covers only ${Math.round(100 - predictedLossPct)}% of predicted sweat losses`,
      details: { predictedLossPct: Math.round(predictedLossPct) },
    });
  }

  // 5. Overhydration warning (before rounding)
  if (mlPerHour > sweatMlPerHour * 1.03) {
    warnings.push({
      code: 'hyponatremia-risk',
      severity: 'warn',
      message: 'Fluid intake exceeds predicted sweat rate — risk of hyponatremia',
      details: {
        intakeMlPerHour: Math.round(mlPerHour),
        sweatMlPerHour: Math.round(sweatMlPerHour),
      },
    });
  }

  // 6. Round to nearest 50
  mlPerHour = roundTo(mlPerHour, 50);

  // 7. Total hydration
  const totalHydrationMl = mlPerHour * (durationMinutes / 60);

  return {
    hydrationMlPerHour: mlPerHour,
    totalHydrationMl,
    warnings,
  };
}
