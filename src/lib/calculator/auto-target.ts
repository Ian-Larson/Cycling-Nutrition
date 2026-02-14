import type {
  AutoInputPair,
  AutoMetrics,
  HeatFactor,
  IntensityLevel,
  NeedsLevel,
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
  inputPair?: AutoInputPair;
  durationMinutes?: number;
  intensityFactor?: number;
  tss?: number;
  ftpWatts: number;
  heatFactor: HeatFactor;
  sweatRateLph?: number;
  heavySweater: boolean;
  gutTrainingTargetGph?: number;
  carbTargetOverrideGramsPerHour?: number;
}

export interface ResolvedRideMetrics {
  durationMinutes: number;
  durationHours: number;
  intensityFactor: number;
  tss: number;
}

export interface TripleInputResolution {
  durationMinutes: number;
  durationHours: number;
  intensityFactor: number;
  enteredTss: number;
  correctedTss: number;
  tssCorrectionApplied: boolean;
  tssCorrectionDelta: number;
}

export interface PowerMetrics {
  normalizedPowerWatts: number;
  kilojoulesPerHour: number;
  kilojoulesTotal: number;
}

export interface NeedsScoreResult {
  needsScore: number;
  needsLevel: NeedsLevel;
}

export interface AutoTargetResult {
  durationMinutes: number;
  intensity: IntensityLevel;
  carbTargetGramsPerHour: number;
  autoMetrics: AutoMetrics;
}

interface CarbBounds {
  min: number;
  max: number;
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

export function resolveTripleInputMetrics(input: {
  durationMinutes?: number;
  intensityFactor?: number;
  tss?: number;
}): TripleInputResolution {
  const durationMinutes = ensureSupportedDuration(
    ensureFinitePositive(input.durationMinutes, 'Duration')
  );
  const intensityFactor = ensureSupportedIntensityFactor(
    ensureFinitePositive(input.intensityFactor, 'Intensity Factor')
  );
  const enteredTss = ensureSupportedTss(ensureFinitePositive(input.tss, 'TSS'));

  const durationHours = durationMinutes / 60;
  const correctedTss = roundTo(
    100 * intensityFactor * intensityFactor * durationHours,
    1
  );
  const tssCorrectionDelta = roundTo(correctedTss - enteredTss, 1);

  return {
    durationMinutes: roundTo(durationMinutes, 1),
    durationHours,
    intensityFactor: roundTo(intensityFactor, 3),
    enteredTss: roundTo(enteredTss, 1),
    correctedTss,
    tssCorrectionApplied: Math.abs(tssCorrectionDelta) >= 0.5,
    tssCorrectionDelta,
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
}): number {
  const { intensityFactor, durationHours, kilojoulesPerHour, intensity } = input;

  if (durationHours < 1 && intensityFactor < 0.7) {
    return 0;
  }

  const bounds = getCarbBounds({ intensityFactor, durationHours, intensity });

  const oxidationShare = clamp(0.45 + 0.1 * (intensityFactor - 0.75), 0.4, 0.5);
  const rawTarget = (oxidationShare * kilojoulesPerHour) / 4;

  return Math.round(clamp(rawTarget, bounds.min, bounds.max) / 5) * 5;
}

export function getCarbBounds(input: {
  intensityFactor: number;
  durationHours: number;
  intensity: IntensityLevel;
}): CarbBounds {
  const { intensityFactor, durationHours, intensity } = input;

  let min = 30;
  if (durationHours < 1 && intensityFactor < 0.7) {
    min = 0;
  } else if (intensityFactor >= 0.85 && durationHours >= 2) {
    min = 60;
  }

  const max = intensity === 'race' ? 120 : 90;
  return { min, max };
}

export function applyGutTrainingBias(input: {
  baselineTargetGph: number;
  gutTrainingTargetGph?: number;
  carbBounds: CarbBounds;
}): number {
  const { baselineTargetGph, gutTrainingTargetGph, carbBounds } = input;

  if (baselineTargetGph === 0) {
    return 0;
  }

  if (
    gutTrainingTargetGph === undefined ||
    !Number.isFinite(gutTrainingTargetGph)
  ) {
    return baselineTargetGph;
  }

  const alpha = 0.35;
  const weightedTarget =
    baselineTargetGph + alpha * (gutTrainingTargetGph - baselineTargetGph);

  return Math.round(clamp(weightedTarget, carbBounds.min, carbBounds.max) / 5) * 5;
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

function scoreHydration(hydrationMlPerHour: number): number {
  if (hydrationMlPerHour < 600) return 20;
  if (hydrationMlPerHour < 850) return 45;
  if (hydrationMlPerHour < 1050) return 70;
  return 90;
}

function scoreSodium(sodiumMgPerHour: number): number {
  if (sodiumMgPerHour <= 500) return 20;
  if (sodiumMgPerHour < 1000) return 45;
  if (sodiumMgPerHour < 1500) return 75;
  return 95;
}

function scoreIntensityFactor(intensityFactor: number): number {
  return Math.round(clamp(((intensityFactor - 0.4) / 0.7) * 100, 0, 100));
}

function scoreTssPerHour(tssPerHour: number): number {
  return Math.round(clamp(((tssPerHour - 30) / 70) * 100, 0, 100));
}

function mapNeedsLevel(score: number): NeedsLevel {
  if (score >= 75) return 'extreme';
  if (score >= 50) return 'high';
  if (score >= 25) return 'moderate';
  return 'low';
}

export function calculateNeedsScore(input: {
  hydrationMlPerHour: number;
  sodiumMgPerHour: number;
  intensityFactor: number;
  tssPerHour: number;
}): NeedsScoreResult {
  const hydrationScore = scoreHydration(input.hydrationMlPerHour);
  const sodiumScore = scoreSodium(input.sodiumMgPerHour);
  const intensityScore = scoreIntensityFactor(input.intensityFactor);
  const tssPerHourScore = scoreTssPerHour(input.tssPerHour);

  const needsScore = Math.round(
    hydrationScore * 0.4 +
      sodiumScore * 0.25 +
      intensityScore * 0.2 +
      tssPerHourScore * 0.15
  );

  return {
    needsScore,
    needsLevel: mapNeedsLevel(needsScore),
  };
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

export function calculateAutoTargetFromTripleInput(
  input: Omit<AutoTargetInput, 'inputPair'>
): AutoTargetResult {
  return calculateAutoTarget(input);
}

export function calculateAutoTarget(input: AutoTargetInput): AutoTargetResult {
  const hasTripleInputs =
    input.durationMinutes !== undefined &&
    input.intensityFactor !== undefined &&
    input.tss !== undefined;

  const tripleMetrics = hasTripleInputs
    ? resolveTripleInputMetrics({
        durationMinutes: input.durationMinutes,
        intensityFactor: input.intensityFactor,
        tss: input.tss,
      })
    : undefined;

  const resolved = tripleMetrics
    ? {
        durationMinutes: tripleMetrics.durationMinutes,
        durationHours: tripleMetrics.durationHours,
        intensityFactor: tripleMetrics.intensityFactor,
        tss: tripleMetrics.correctedTss,
      }
    : input.inputPair
      ? resolveRideMetrics({
          inputPair: input.inputPair,
          durationMinutes: input.durationMinutes,
          intensityFactor: input.intensityFactor,
          tss: input.tss,
        })
      : null;

  if (!resolved) {
    throw new Error(
      'Provide either all three values (Duration, IF, TSS) or an input pair for auto calculations.'
    );
  }

  const intensity = mapIfToIntensity(resolved.intensityFactor);
  const powerMetrics = calculatePowerMetrics(
    resolved.intensityFactor,
    input.ftpWatts,
    resolved.durationHours
  );

  const carbBounds = getCarbBounds({
    intensityFactor: resolved.intensityFactor,
    durationHours: resolved.durationHours,
    intensity,
  });
  const baselineAutoCarbTargetGph = calculateAutoCarbTargetGramsPerHour({
    intensityFactor: resolved.intensityFactor,
    durationHours: resolved.durationHours,
    kilojoulesPerHour: powerMetrics.kilojoulesPerHour,
    intensity,
  });
  const biasedAutoCarbTargetGph = applyGutTrainingBias({
    baselineTargetGph: baselineAutoCarbTargetGph,
    gutTrainingTargetGph: input.gutTrainingTargetGph,
    carbBounds,
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

  const tssPerHour = resolved.tss / resolved.durationHours;
  const needs = calculateNeedsScore({
    hydrationMlPerHour,
    sodiumMgPerHour,
    intensityFactor: resolved.intensityFactor,
    tssPerHour,
  });

  const carbTargetOverride = resolveCarbOverride(
    input.carbTargetOverrideGramsPerHour
  );
  const carbTargetGramsPerHour =
    carbTargetOverride ?? biasedAutoCarbTargetGph;

  return {
    durationMinutes: Math.round(resolved.durationMinutes),
    intensity,
    carbTargetGramsPerHour,
    autoMetrics: {
      inputPair: input.inputPair,
      inputMode: tripleMetrics ? 'triple' : 'pair',
      intensityFactor: resolved.intensityFactor,
      tss: resolved.tss,
      normalizedPowerWatts: powerMetrics.normalizedPowerWatts,
      kilojoulesPerHour: powerMetrics.kilojoulesPerHour,
      autoCarbTargetGramsPerHour: biasedAutoCarbTargetGph,
      baselineAutoCarbTargetGph,
      biasedAutoCarbTargetGph,
      gutTrainingTargetGph: input.gutTrainingTargetGph,
      hydrationMlPerHour,
      sodiumMgPerHour,
      carbOverrideApplied:
        carbTargetOverride !== undefined &&
        carbTargetOverride !== biasedAutoCarbTargetGph,
      userProvidedDurationMinutes: tripleMetrics?.durationMinutes,
      userProvidedIntensityFactor: tripleMetrics?.intensityFactor,
      userProvidedTss: tripleMetrics?.enteredTss,
      correctedTss: tripleMetrics?.correctedTss,
      tssCorrectionApplied: tripleMetrics?.tssCorrectionApplied,
      tssCorrectionDelta: tripleMetrics?.tssCorrectionDelta,
      needsLevel: needs.needsLevel,
      needsScore: needs.needsScore,
    },
  };
}
