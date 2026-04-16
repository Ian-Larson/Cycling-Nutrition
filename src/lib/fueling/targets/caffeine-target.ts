import type { FuelingContext } from '../context';
import type { Warning, SessionPurpose } from '../types';
import {
  ERGOGENIC_CAFFEINE_MG_PER_KG,
  ADAPTATION_CAFFEINE_MG_FLAT,
  DAILY_CAFFEINE_CEILING_MG,
} from '../constants/science';

export interface CaffeineTargetResult {
  preRideCaffeineMg: number;
  duringRideCaffeineMg: number;
  caffeineTimingOffsetMinutes?: number;
  totalCaffeineMg: number;
  warnings: Warning[];
}

/** Purposes that warrant full ergogenic caffeine dosing. */
const RACE_PURPOSES: readonly SessionPurpose[] = ['race', 'stage_race_day'];

/**
 * Extract the hour component from an ISO timestamp string.
 * Matches HH from the time portion T HH:MM:SS.
 */
function extractHourFromIso(iso: string): number | undefined {
  const match = iso.match(/(\d{2}):\d{2}:\d{2}/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Caffeine protocol target: ergogenic dose for race, adaptation dose
 * for train-low, with excess and late-caffeine warnings.
 */
export function caffeineTarget(
  context: FuelingContext,
  plannedSolidCaffeineMg?: number,
): CaffeineTargetResult {
  const { rider, session, purpose } = context;
  const { durationMinutes } = session;
  const warnings: Warning[] = [];

  // 1. Pre-ride caffeine
  let preRideCaffeineMg = 0;

  if (RACE_PURPOSES.includes(purpose)) {
    const baseDose = ERGOGENIC_CAFFEINE_MG_PER_KG * rider.massKg;
    preRideCaffeineMg = rider.caffeineSensitive ? baseDose * 0.5 : baseDose;
  } else if (purpose === 'adaptation') {
    preRideCaffeineMg = rider.caffeineSensitive
      ? ADAPTATION_CAFFEINE_MG_FLAT * 0.5
      : ADAPTATION_CAFFEINE_MG_FLAT;
  }
  // All other purposes: 0

  // 2. During-ride caffeine from planned solids
  const duringRideCaffeineMg = plannedSolidCaffeineMg ?? 0;

  // 3. Total
  const totalCaffeineMg = preRideCaffeineMg + duringRideCaffeineMg;

  // 4. Excess warning
  if (totalCaffeineMg > DAILY_CAFFEINE_CEILING_MG) {
    warnings.push({
      code: 'caffeine-excess',
      severity: 'warn',
      message: `Total caffeine ${Math.round(totalCaffeineMg)} mg exceeds daily ceiling of ${DAILY_CAFFEINE_CEILING_MG} mg`,
      details: { totalMg: totalCaffeineMg, ceilingMg: DAILY_CAFFEINE_CEILING_MG },
    });
  }

  // 5. Late-caffeine check
  if (
    rider.avoidsCaffeineAfterHour !== undefined &&
    session.startAtIso &&
    duringRideCaffeineMg > 0
  ) {
    const startHour = extractHourFromIso(session.startAtIso);
    if (startHour !== undefined) {
      const endHour = startHour + durationMinutes / 60;
      if (endHour >= rider.avoidsCaffeineAfterHour) {
        warnings.push({
          code: 'late-caffeine',
          severity: 'info',
          message: `Ride caffeine consumption may extend past ${rider.avoidsCaffeineAfterHour}:00`,
          details: {
            estimatedEndHour: Math.round(endHour * 10) / 10,
            cutoffHour: rider.avoidsCaffeineAfterHour,
          },
        });
      }
    }
  }

  // 6. During-ride timing offset for long races (>3h): suggest caffeine at 2/3 mark
  let caffeineTimingOffsetMinutes: number | undefined;
  if (duringRideCaffeineMg > 0 && durationMinutes > 180) {
    caffeineTimingOffsetMinutes = Math.round(durationMinutes * 2 / 3);
  }

  return {
    preRideCaffeineMg,
    duringRideCaffeineMg,
    caffeineTimingOffsetMinutes,
    totalCaffeineMg,
    warnings,
  };
}
