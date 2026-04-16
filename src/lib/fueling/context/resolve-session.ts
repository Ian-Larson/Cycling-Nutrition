import type { SessionInputMode } from '../types';

/** RPE (1-10) mapped to approximate Intensity Factor. */
const RPE_TO_IF: Record<number, number> = {
  1: 0.45,
  2: 0.50,
  3: 0.55,
  4: 0.60,
  5: 0.65,
  6: 0.72,
  7: 0.80,
  8: 0.88,
  9: 0.95,
  10: 1.05,
};

const IF_MIN = 0.3;
const IF_MAX = 1.3;
const DURATION_MIN = 10;
const DURATION_MAX = 720;
const TSS_MIN = 1;
const TSS_MAX = 1000;

/** Watts-to-kJ/h conversion: 1 W = 3.6 kJ/h */
const WATTS_TO_KJ_PER_HOUR = 3.6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface ResolvedSession {
  durationMinutes: number;
  intensityFactor: number;
  tss: number;
  normalizedPowerWatts?: number;
  kjPerHour?: number;
}

/**
 * Given any SessionInputMode, resolve all three core metrics:
 * durationMinutes, intensityFactor, and TSS.
 *
 * TSS formula (standard TrainingPeaks):
 *   TSS = 100 * IF^2 * (durationMinutes / 60)
 *
 * Also derives normalizedPowerWatts and kjPerHour when ftpWatts is provided.
 */
export function resolveSession(
  inputMode: SessionInputMode,
  ftpWatts?: number,
): ResolvedSession {
  let durationMinutes: number;
  let intensityFactor: number;
  let tss: number;

  switch (inputMode.kind) {
    case 'duration_if': {
      durationMinutes = inputMode.durationMinutes;
      intensityFactor = inputMode.intensityFactor;
      intensityFactor = clamp(intensityFactor, IF_MIN, IF_MAX);
      durationMinutes = clamp(durationMinutes, DURATION_MIN, DURATION_MAX);
      tss = 100 * intensityFactor ** 2 * (durationMinutes / 60);
      break;
    }
    case 'duration_tss': {
      durationMinutes = clamp(inputMode.durationMinutes, DURATION_MIN, DURATION_MAX);
      tss = clamp(inputMode.tss, TSS_MIN, TSS_MAX);
      intensityFactor = Math.sqrt(tss / (100 * (durationMinutes / 60)));
      intensityFactor = clamp(intensityFactor, IF_MIN, IF_MAX);
      // Recompute TSS after clamping IF
      tss = 100 * intensityFactor ** 2 * (durationMinutes / 60);
      break;
    }
    case 'if_tss': {
      intensityFactor = clamp(inputMode.intensityFactor, IF_MIN, IF_MAX);
      tss = clamp(inputMode.tss, TSS_MIN, TSS_MAX);
      durationMinutes = (tss / (100 * intensityFactor ** 2)) * 60;
      durationMinutes = clamp(durationMinutes, DURATION_MIN, DURATION_MAX);
      // Recompute TSS after clamping duration
      tss = 100 * intensityFactor ** 2 * (durationMinutes / 60);
      break;
    }
    case 'duration_rpe': {
      durationMinutes = clamp(inputMode.durationMinutes, DURATION_MIN, DURATION_MAX);
      intensityFactor = RPE_TO_IF[inputMode.rpe] ?? 0.65;
      intensityFactor = clamp(intensityFactor, IF_MIN, IF_MAX);
      tss = 100 * intensityFactor ** 2 * (durationMinutes / 60);
      break;
    }
  }

  tss = clamp(tss, TSS_MIN, TSS_MAX);

  const normalizedPowerWatts =
    ftpWatts !== undefined ? intensityFactor * ftpWatts : undefined;
  const kjPerHour =
    normalizedPowerWatts !== undefined
      ? normalizedPowerWatts * WATTS_TO_KJ_PER_HOUR
      : undefined;

  return {
    durationMinutes,
    intensityFactor,
    tss,
    normalizedPowerWatts,
    kjPerHour,
  };
}
