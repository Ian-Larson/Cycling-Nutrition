import type {
  Bottle,
  Product,
  RideCharacteristics,
  HeatFactor,
  IntensityLevel,
} from '@/types';
import type { AthleteProfile, TemperatureUnit } from '@/store';
import type { FuelingInput } from '..';
import type {
  RiderProfile,
  SessionPlan,
  Environment,
  SessionPurpose,
  SessionInputMode,
  TrainingLoad,
} from '../types';

/**
 * Representative intensity factor for each v2 intensity enum value.
 * Used when the user has not provided a measured IF via auto-mode.
 * These midpoints mirror the v2→v3 purpose classification bands.
 */
const INTENSITY_TO_IF: Record<IntensityLevel, number> = {
  recovery: 0.55,
  endurance: 0.7,
  tempo: 0.85,
  threshold: 0.92,
  race: 1.0,
};

/** Map v2 intensity enum to v3 SessionPurpose directly. */
const INTENSITY_TO_PURPOSE: Record<IntensityLevel, SessionPurpose> = {
  recovery: 'recovery',
  endurance: 'endurance',
  tempo: 'tempo',
  threshold: 'threshold',
  race: 'race',
};

/** Mid-bucket dry-bulb temperatures for each v2 heat factor (°C). */
const HEAT_TO_DRY_BULB_C: Record<HeatFactor, number> = {
  cool: 12,
  moderate: 20,
  warm: 28,
  hot: 34,
};

/**
 * Infer a training-load tier from the day's planned minutes. When the rider
 * profile exposes a first-class selector later, prefer that over the inference.
 */
function inferTrainingLoadFromMinutes(minutes: number): TrainingLoad {
  if (minutes < 60) return 'light';
  if (minutes < 120) return 'moderate';
  if (minutes < 180) return 'high';
  return 'veryHigh';
}

export interface AdapterInput {
  ride: RideCharacteristics;
  athleteProfile: AthleteProfile;
  temperatureUnit?: TemperatureUnit;
  /** Bottles the user selected for this ride (already narrowed). */
  selectedBottles: Bottle[];
  /** Drink mix the user selected (or null for water-only). */
  selectedDrinkMix: Product | null;
  /** Solid products the user selected. */
  selectedSolids: Product[];
}

/**
 * Map the legacy v2 UI inputs onto the v3 `FuelingInput` expected by
 * `buildPrescription()`. Returns `null` when required data is missing
 * (currently: rider mass).
 */
export function buildFuelingInputFromV2(
  inputs: AdapterInput,
): FuelingInput | null {
  const { ride, athleteProfile, selectedBottles, selectedDrinkMix, selectedSolids } =
    inputs;

  const massKg = athleteProfile.weightKg;
  if (typeof massKg !== 'number' || !Number.isFinite(massKg) || massKg <= 0) {
    return null;
  }

  const rider: RiderProfile = {
    name: athleteProfile.name,
    sex: 'unspecified',
    age: athleteProfile.age,
    massKg,
    ftpWatts: athleteProfile.ftpWatts,
    trainingLoad: inferTrainingLoadFromMinutes(ride.durationMinutes),
    doesConcurrentStrength: false,
    sweatRateLph: athleteProfile.sweatRateLph,
    heavySweater: athleteProfile.heavySweater,
    currentGutCeilingGph: athleteProfile.gutTrainingTargetGph ?? 65,
    caffeineSensitive: false,
    dietaryFlags: [],
    anthropometricsUnit: athleteProfile.anthropometricsUnit ?? 'metric',
  };

  // Prefer the measured IF from auto-mode when available
  const measuredIf =
    ride.autoMetrics?.intensityFactor &&
    Number.isFinite(ride.autoMetrics.intensityFactor)
      ? ride.autoMetrics.intensityFactor
      : undefined;

  const intensityFactor = measuredIf ?? INTENSITY_TO_IF[ride.intensity];

  const inputMode: SessionInputMode = {
    kind: 'duration_if',
    durationMinutes: ride.durationMinutes,
    intensityFactor,
  };

  // Evenly distribute refuel stops across the ride
  const refuelStops = ride.refuelStops ?? 0;
  const refuelStopOffsets: number[] =
    refuelStops > 0
      ? Array.from({ length: refuelStops }, (_, i) =>
          Math.round((ride.durationMinutes * (i + 1)) / (refuelStops + 1)),
        )
      : [];

  const session: SessionPlan = {
    id: 'planner-session',
    inputMode,
    purposeOverride: INTENSITY_TO_PURPOSE[ride.intensity],
    refuelStopOffsets,
  };

  const environment: Environment = {
    dryBulbCelsius: HEAT_TO_DRY_BULB_C[ride.heatFactor],
  };

  // Ensure the v3 inventory layer sees only what the user has selected.
  // The underlying allocators filter by `isAvailable`, so normalize it here.
  const markAvailable = <T extends { isAvailable?: boolean }>(item: T): T => ({
    ...item,
    isAvailable: true,
  });

  const bottles = selectedBottles.map(markAvailable);
  const productsForEngine: Product[] = [];
  if (selectedDrinkMix) productsForEngine.push(markAvailable(selectedDrinkMix));
  for (const solid of selectedSolids) productsForEngine.push(markAvailable(solid));

  return {
    rider,
    session,
    environment,
    bottles,
    products: productsForEngine,
    todaysTotalSessionMinutes: ride.durationMinutes,
  };
}
