import type {
  AutoInputPair,
  AutoMetrics,
  HeatFactor,
  IntensityLevel,
} from '@/types';

const MIN_DURATION_MINUTES = 30;
const MAX_DURATION_MINUTES = 300;
const MIN_INTENSITY_FACTOR = 0.4;
const MAX_INTENSITY_FACTOR = 1.3;
const MIN_TSS = 1;
const MAX_OVERRIDE_CARBS_GPH = 120;

const HYDRATION_FALLBACK_ML_PER_HOUR: Record<HeatFactor, number> = {
  cool: 500,
  moderate: 750,
  warm: 1000,
  hot: 1000,
};

export interface AutoTargetInput {
  inputPair: AutoInputPair;
  durationMinutes?: number;
  intensityFactor?: number;
  tss?: number;
  ftpWatts: number;
  heatFactor: HeatFactor;
  sweatRateLph?: number;
  heavySweater: boolean;
  gutTrained: boolean;
  carbTargetOverrideGramsPerHour?: number;
}

export interface ResolvedRideMetrics {
  durationMinutes: number;
  durationHours: number;
  intensityFactor: number;
  tss: number;
}

export interface PowerMetrics {
  normalizedPowerWatts: number;
  kilojoulesPerHour: number;
  kilojoulesTotal: number;
}

export interface AutoTargetResult {
  durationMinutes: number;
  intensity: IntensityLevel;
  carbTargetGramsPerHour: number;
  autoMetrics: AutoMetrics;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundTo(value: number, decimals: number): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function ensureFinitePositive(value: number | undefined, fieldName: string): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive number.`);
  }
  return value;
}

function ensureSupportedDuration(durationMinutes: number): number {
  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes < MIN_DURATION_MINUTES ||
    durationMinutes > MAX_DURATION_MINUTES
  ) {
    throw new Error(
      `Derived duration is outside supported range (${MIN_DURATION_MINUTES}-${MAX_DURATION_MINUTES} minutes).`
    );
  }
  return durationMinutes;
}

function ensureSupportedIntensityFactor(intensityFactor: number): number {
  if (
    !Number.isFinite(intensityFactor) ||
    intensityFactor < MIN_INTENSITY_FACTOR ||
    intensityFactor > MAX_INTENSITY_FACTOR
  ) {
    throw new Error(
      `Intensity Factor must be between ${MIN_INTENSITY_FACTOR} and ${MAX_INTENSITY_FACTOR}.`
    );
  }
  return intensityFactor;
}

function ensureSupportedTss(tss: number): number {
  if (!Number.isFinite(tss) || tss < MIN_TSS) {
    throw new Error('TSS must be greater than 0.');
  }
  return tss;
}

export function resolveRideMetrics(input: {
  inputPair: AutoInputPair;
  durationMinutes?: number;
  intensityFactor?: number;
  tss?: number;
}): ResolvedRideMetrics {
  const { inputPair } = input;

  let durationMinutes: number;
  let intensityFactor: number;
  let tss: number;

  if (inputPair === 'duration_if') {
    durationMinutes = ensureFinitePositive(input.durationMinutes, 'Duration');
    intensityFactor = ensureFinitePositive(
      input.intensityFactor,
      'Intensity Factor'
    );
    const durationHours = durationMinutes / 60;
    tss = 100 * intensityFactor * intensityFactor * durationHours;
  } else if (inputPair === 'duration_tss') {
    durationMinutes = ensureFinitePositive(input.durationMinutes, 'Duration');
    tss = ensureFinitePositive(input.tss, 'TSS');
    const durationHours = durationMinutes / 60;
    intensityFactor = Math.sqrt(tss / (100 * durationHours));
  } else {
    intensityFactor = ensureFinitePositive(
      input.intensityFactor,
      'Intensity Factor'
    );
    tss = ensureFinitePositive(input.tss, 'TSS');
    const durationHours = tss / (100 * intensityFactor * intensityFactor);
    durationMinutes = durationHours * 60;
  }

  durationMinutes = ensureSupportedDuration(durationMinutes);
  intensityFactor = ensureSupportedIntensityFactor(intensityFactor);
  tss = ensureSupportedTss(tss);

  return {
    durationMinutes: roundTo(durationMinutes, 1),
    durationHours: durationMinutes / 60,
    intensityFactor: roundTo(intensityFactor, 3),
    tss: roundTo(tss, 1),
  };
}

export function mapIfToIntensity(intensityFactor: number): IntensityLevel {
  if (intensityFactor < 0.6) return 'recovery';
  if (intensityFactor < 0.75) return 'endurance';
  if (intensityFactor < 0.85) return 'tempo';
  if (intensityFactor < 0.95) return 'threshold';
  return 'race';
}

export function calculatePowerMetrics(
  intensityFactor: number,
  ftpWatts: number,
  durationHours: number
): PowerMetrics {
  const validFtpWatts = ensureFinitePositive(ftpWatts, 'FTP');
  const normalizedPowerWatts = intensityFactor * validFtpWatts;
  const kilojoulesPerHour = normalizedPowerWatts * 3.6;

  return {
    normalizedPowerWatts: roundTo(normalizedPowerWatts, 1),
    kilojoulesPerHour: roundTo(kilojoulesPerHour, 1),
    kilojoulesTotal: roundTo(kilojoulesPerHour * durationHours, 1),
  };
}

export function calculateAutoCarbTargetGramsPerHour(input: {
  intensityFactor: number;
  durationHours: number;
  kilojoulesPerHour: number;
  intensity: IntensityLevel;
  gutTrained: boolean;
}): number {
  const {
    intensityFactor,
    durationHours,
    kilojoulesPerHour,
    intensity,
    gutTrained,
  } = input;

  if (durationHours < 1 && intensityFactor < 0.7) {
    return 0;
  }

  const oxidationShare = clamp(0.45 + 0.1 * (intensityFactor - 0.75), 0.4, 0.5);
  const rawTarget = (oxidationShare * kilojoulesPerHour) / 4;

  let flooredTarget = Math.max(rawTarget, 30);
  if (intensityFactor >= 0.85 && durationHours >= 2) {
    flooredTarget = Math.max(flooredTarget, 60);
  }

  const cap = intensity === 'race' && gutTrained ? 120 : 90;
  return Math.round(clamp(flooredTarget, 0, cap) / 5) * 5;
}

export function calculateHydrationMlPerHour(input: {
  sweatRateLph?: number;
  heatFactor: HeatFactor;
}): number {
  const { sweatRateLph, heatFactor } = input;
  if (
    typeof sweatRateLph === 'number' &&
    Number.isFinite(sweatRateLph) &&
    sweatRateLph > 0
  ) {
    return Math.round(sweatRateLph * 1000);
  }

  return HYDRATION_FALLBACK_ML_PER_HOUR[heatFactor];
}

export function calculateSodiumMgPerHour(input: {
  heatFactor: HeatFactor;
  durationHours: number;
  intensityFactor: number;
  heavySweater: boolean;
}): number {
  const { heatFactor, durationHours, intensityFactor, heavySweater } = input;
  let sodiumMgPerHour = 500;

  if (heatFactor === 'hot' || durationHours >= 2 || intensityFactor >= 0.8) {
    sodiumMgPerHour = 1000;
  }

  if (heavySweater) {
    sodiumMgPerHour += 500;
  }

  return sodiumMgPerHour;
}

function resolveCarbOverride(
  carbTargetOverrideGramsPerHour: number | undefined
): number | undefined {
  if (carbTargetOverrideGramsPerHour === undefined) return undefined;
  if (
    !Number.isFinite(carbTargetOverrideGramsPerHour) ||
    carbTargetOverrideGramsPerHour < 0 ||
    carbTargetOverrideGramsPerHour > MAX_OVERRIDE_CARBS_GPH
  ) {
    throw new Error(`Carb override must be between 0 and ${MAX_OVERRIDE_CARBS_GPH} g/h.`);
  }
  return Math.round(carbTargetOverrideGramsPerHour);
}

export function calculateAutoTarget(input: AutoTargetInput): AutoTargetResult {
  const resolved = resolveRideMetrics({
    inputPair: input.inputPair,
    durationMinutes: input.durationMinutes,
    intensityFactor: input.intensityFactor,
    tss: input.tss,
  });

  const intensity = mapIfToIntensity(resolved.intensityFactor);
  const powerMetrics = calculatePowerMetrics(
    resolved.intensityFactor,
    input.ftpWatts,
    resolved.durationHours
  );

  const autoCarbTargetGramsPerHour = calculateAutoCarbTargetGramsPerHour({
    intensityFactor: resolved.intensityFactor,
    durationHours: resolved.durationHours,
    kilojoulesPerHour: powerMetrics.kilojoulesPerHour,
    intensity,
    gutTrained: input.gutTrained,
  });

  const hydrationMlPerHour = calculateHydrationMlPerHour({
    sweatRateLph: input.sweatRateLph,
    heatFactor: input.heatFactor,
  });
  const sodiumMgPerHour = calculateSodiumMgPerHour({
    heatFactor: input.heatFactor,
    durationHours: resolved.durationHours,
    intensityFactor: resolved.intensityFactor,
    heavySweater: input.heavySweater,
  });

  const carbTargetOverride = resolveCarbOverride(
    input.carbTargetOverrideGramsPerHour
  );
  const carbTargetGramsPerHour =
    carbTargetOverride ?? autoCarbTargetGramsPerHour;

  return {
    durationMinutes: Math.round(resolved.durationMinutes),
    intensity,
    carbTargetGramsPerHour,
    autoMetrics: {
      inputPair: input.inputPair,
      intensityFactor: resolved.intensityFactor,
      tss: resolved.tss,
      normalizedPowerWatts: powerMetrics.normalizedPowerWatts,
      kilojoulesPerHour: powerMetrics.kilojoulesPerHour,
      autoCarbTargetGramsPerHour,
      hydrationMlPerHour,
      sodiumMgPerHour,
      carbOverrideApplied:
        carbTargetOverride !== undefined &&
        carbTargetOverride !== autoCarbTargetGramsPerHour,
    },
  };
}
