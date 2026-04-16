import type { FuelingContext } from '../context';
import type { PreRidePrescription, CarbLoadProtocol, Warning, SessionPurpose } from '../types';
import {
  PRE_RIDE_WINDOWS,
  CARB_LOAD_DAYS,
  CARB_LOAD_HOURLY_CEILING_G_PER_KG,
  ERGOGENIC_CAFFEINE_MG_PER_KG,
  CAFFEINE_PRE_RIDE_WINDOW_MINUTES,
} from '../constants/science';

export interface PreRideTargetResult {
  prescription?: PreRidePrescription;
  carbLoad?: CarbLoadProtocol;
  warnings: Warning[];
}

/** Round to nearest multiple of `step`. */
function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Purposes that warrant pre-ride fueling. */
const PRE_RIDE_PURPOSES: readonly SessionPurpose[] = [
  'race', 'tempo', 'threshold', 'vo2', 'stage_race_day',
];

/** Purposes that warrant carb-loading and pre-ride caffeine. */
const RACE_PURPOSES: readonly SessionPurpose[] = ['race', 'stage_race_day'];

/**
 * Pre-ride fueling target: CHO loading by time-to-start window, optional
 * protein, caffeine stack for race-day, and carb-load protocol for events >90 min.
 */
export function preRideTarget(context: FuelingContext): PreRideTargetResult {
  const { rider, session, purpose } = context;
  const { durationMinutes } = session;
  const warnings: Warning[] = [];

  // 1. Only activate for qualifying purposes AND duration >= 60 min
  if (!PRE_RIDE_PURPOSES.includes(purpose) || durationMinutes < 60) {
    return { warnings };
  }

  // 2. Determine pre-ride window
  let selectedWindow = PRE_RIDE_WINDOWS[1]; // default: 2h entry

  if (session.startAtIso) {
    // We don't use "now" — but we can pick the window by what's available.
    // Since we can't know current time without Date.now(), use the 2h default
    // when startAtIso is set, unless the caller provides context otherwise.
    // Per spec: default to the 2h entry; the full window-matching logic
    // requires a "now" reference that the pure function doesn't have.
    selectedWindow = PRE_RIDE_WINDOWS[1]; // 2h window
  } else {
    // No start time — use 2h default and warn
    selectedWindow = PRE_RIDE_WINDOWS[1];
    warnings.push({
      code: 'no-pre-ride-time',
      severity: 'info',
      message: 'No start time provided; using 2h pre-ride window as default',
    });
  }

  // 3. Compute carbs
  const carbsGPerKg = selectedWindow.choGPerKg;
  const carbsGrams = roundTo(carbsGPerKg * rider.massKg, 5);

  // 4. Optional protein: if window >= 2h
  const proteinGrams = selectedWindow.hoursBeforeStart >= 2
    ? roundTo(0.3 * rider.massKg, 5)
    : undefined;

  // 5. Caffeine for race purposes
  let caffeineMg: number | undefined;
  let caffeineTimingMinutesBefore: number | undefined;

  if (RACE_PURPOSES.includes(purpose)) {
    const baseDose = ERGOGENIC_CAFFEINE_MG_PER_KG * rider.massKg;
    caffeineMg = rider.caffeineSensitive ? baseDose * 0.5 : baseDose;
    caffeineTimingMinutesBefore = Math.round(
      (CAFFEINE_PRE_RIDE_WINDOW_MINUTES.min + CAFFEINE_PRE_RIDE_WINDOW_MINUTES.max) / 2,
    );
  }

  // 6. Notes
  const notes: string[] = [];
  if (selectedWindow.hoursBeforeStart <= 2) {
    notes.push('low-fiber, low-fat preferred');
  }
  if (selectedWindow.hoursBeforeStart <= 1) {
    notes.push('liquid CHO preferred');
  }

  const prescription: PreRidePrescription = {
    carbsGrams,
    carbsGPerKg,
    windowHoursBefore: selectedWindow.hoursBeforeStart,
    proteinGrams,
    caffeineMg,
    caffeineTimingMinutesBefore,
    notes,
  };

  // 7. Carb-load protocol for race purposes >= 90 min
  let carbLoad: CarbLoadProtocol | undefined;
  if (RACE_PURPOSES.includes(purpose) && durationMinutes >= 90) {
    carbLoad = {
      days: CARB_LOAD_DAYS,
      targetGPerKgPerDay: 10.5,
      hourlyCeilingGPerKg: CARB_LOAD_HOURLY_CEILING_G_PER_KG,
    };
    warnings.push({
      code: 'carb-load-recommended',
      severity: 'info',
      message: `${CARB_LOAD_DAYS}-day carb-load recommended before race >90 min`,
    });
  }

  return { prescription, carbLoad, warnings };
}
