import type { FuelingContext } from '../context';
import type { PostRidePrescription, RecoveryMode, RecoveryWindow, Warning, SessionPurpose } from '../types';
import { RAPID_RECOVERY } from '../constants/science';

export interface PostRideTargetResult {
  prescription?: PostRidePrescription;
  warnings: Warning[];
}

/** Round to nearest multiple of `step`. */
function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Purposes that warrant a recovery drink recommendation in normal mode. */
const RECOVERY_DRINK_PURPOSES: readonly SessionPurpose[] = [
  'race', 'threshold', 'vo2', 'stage_race_day',
];

/**
 * Determine recovery mode based on gap to next session.
 * - rapid: next session within RAPID_RECOVERY.maxHours (8h)
 * - normal: next session within 24h, or no next session info
 * - relaxed: next session > 24h away
 */
function determineMode(context: FuelingContext): RecoveryMode {
  const { session } = context;

  if (!session.nextSessionAtIso || !session.startAtIso) {
    return 'normal';
  }

  // Compute ride end time: start + duration
  const startMs = new Date(session.startAtIso).getTime();
  const endMs = startMs + session.durationMinutes * 60 * 1000;
  const nextMs = new Date(session.nextSessionAtIso).getTime();

  const gapHours = (nextMs - endMs) / (1000 * 60 * 60);

  if (gapHours <= RAPID_RECOVERY.maxHours) {
    return 'rapid';
  }
  if (gapHours <= 24) {
    return 'normal';
  }
  return 'relaxed';
}

/**
 * Post-ride recovery target: 3-tier recovery (rapid/normal/relaxed) gated
 * on next session timing, with CHO+protein+fluid windows.
 */
export function postRideTarget(context: FuelingContext): PostRideTargetResult {
  const { rider, session, purpose } = context;
  const { durationMinutes } = session;
  const warnings: Warning[] = [];

  const mode = determineMode(context);

  let window1: RecoveryWindow;
  let window2: RecoveryWindow | undefined;
  let recommendRecoveryDrink: boolean;
  const notes: string[] = [];

  switch (mode) {
    case 'rapid': {
      // Window 1 (0-2h): aggressive refueling
      const w1Carbs = RAPID_RECOVERY.choGPerKgPerHour.max * rider.massKg * 2;
      const w1Protein = RAPID_RECOVERY.proteinRescueGPerKgPerHour * rider.massKg * 2;
      // 150% of estimated fluid loss over the ride
      const estimatedLossLiters = rider.sweatRateLph * (durationMinutes / 60);
      const w1Fluids = estimatedLossLiters * 1.5 * 1000; // convert to mL
      const w1Sodium = 600 * (roundTo(w1Fluids, 50) / 1000); // 600 mg/L in recovery fluid

      window1 = {
        carbsGrams: roundTo(w1Carbs, 5),
        proteinGrams: roundTo(w1Protein, 5),
        fluidsMl: roundTo(w1Fluids, 50),
        sodiumMg: roundTo(w1Sodium, 5),
      };

      // Window 2 (2-4h): sustained refueling
      const w2Carbs = RAPID_RECOVERY.choGPerKgPerHour.min * rider.massKg * 2;
      const w2Protein = 0.3 * rider.massKg;

      window2 = {
        carbsGrams: roundTo(w2Carbs, 5),
        proteinGrams: roundTo(w2Protein, 5),
      };

      recommendRecoveryDrink = true;
      notes.push('feed every 15-30 min in window 1');
      notes.push('4:1 CHO:protein ratio preferred');
      break;
    }

    case 'normal': {
      // Window 1 only: standard recovery
      const carbs = 1.0 * rider.massKg;
      const protein = 0.3 * rider.massKg;
      // 125% of estimated loss
      const estimatedLossLiters = rider.sweatRateLph * (durationMinutes / 60);
      const fluids = estimatedLossLiters * 1.25 * 1000;
      const sodium = 500 * (roundTo(fluids, 50) / 1000); // 500 mg/L

      window1 = {
        carbsGrams: roundTo(carbs, 5),
        proteinGrams: roundTo(protein, 5),
        fluidsMl: roundTo(fluids, 50),
        sodiumMg: roundTo(sodium, 5),
      };

      recommendRecoveryDrink = RECOVERY_DRINK_PURPOSES.includes(purpose);
      notes.push('recovery meal within 2h');
      break;
    }

    case 'relaxed': {
      // Minimal urgency
      const carbs = 0.5 * rider.massKg;
      const protein = 0.25 * rider.massKg;

      window1 = {
        carbsGrams: roundTo(carbs, 5),
        proteinGrams: roundTo(protein, 5),
      };

      recommendRecoveryDrink = false;
      notes.push('hit daily CHO + protein targets; no urgency');
      break;
    }
  }

  const prescription: PostRidePrescription = {
    mode,
    window1,
    window2,
    recommendRecoveryDrink,
    notes,
  };

  return { prescription, warnings };
}
