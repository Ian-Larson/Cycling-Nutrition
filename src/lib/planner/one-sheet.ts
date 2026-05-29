import {
  calculateAutoTarget,
  mapIfToIntensity,
} from '@/lib/planner/auto-target';
import type { HeatFactor, RideCharacteristics } from '@/types';

const MIN_DURATION_MINUTES = 30;
const MAX_DURATION_MINUTES = 300;
const MIN_INTENSITY_FACTOR = 0.4;
const MAX_INTENSITY_FACTOR = 1.3;

export interface OneSheetRideInput {
  durationMinutes: number;
  intensityFactor: number;
  heatFactor: HeatFactor;
  ftpWatts?: number;
  heavySweater: boolean;
  gutTrainingTargetGph?: number;
  carbTargetOverrideGramsPerHour?: number;
  refuelStops: number;
}

export interface PlanRequirementInput {
  weightReady: boolean;
  durationMinutes: number;
  intensityFactor: number;
  bottleCount: number;
  hasDrinkMix: boolean;
}

function hasValidFtp(ftpWatts: number | undefined): ftpWatts is number {
  return (
    typeof ftpWatts === 'number' &&
    Number.isFinite(ftpWatts) &&
    ftpWatts > 0
  );
}

function getTargetFallback(input: OneSheetRideInput): number {
  const override = input.carbTargetOverrideGramsPerHour;
  if (typeof override === 'number' && Number.isFinite(override)) {
    return Math.round(Math.max(0, Math.min(120, override)));
  }

  const gutTarget = input.gutTrainingTargetGph;
  if (typeof gutTarget === 'number' && Number.isFinite(gutTarget)) {
    return Math.round(Math.max(0, Math.min(120, gutTarget)));
  }

  return 65;
}

export function buildOneSheetRide(
  input: OneSheetRideInput
): RideCharacteristics {
  if (hasValidFtp(input.ftpWatts)) {
    const target = calculateAutoTarget({
      inputPair: 'duration_if',
      durationMinutes: input.durationMinutes,
      intensityFactor: input.intensityFactor,
      ftpWatts: input.ftpWatts,
      heatFactor: input.heatFactor,
      heavySweater: input.heavySweater,
      gutTrainingTargetGph: input.gutTrainingTargetGph,
      carbTargetOverrideGramsPerHour: input.carbTargetOverrideGramsPerHour,
    });

    return {
      durationMinutes: target.durationMinutes,
      intensity: target.intensity,
      heatFactor: input.heatFactor,
      carbTargetGramsPerHour: target.carbTargetGramsPerHour,
      planningMode: 'auto',
      autoMetrics: {
        ...target.autoMetrics,
        userProvidedDurationMinutes: input.durationMinutes,
        userProvidedIntensityFactor: input.intensityFactor,
      },
      ...(input.refuelStops > 0 && target.durationMinutes >= 120
        ? { refuelStops: input.refuelStops }
        : {}),
    };
  }

  const fallbackTarget = getTargetFallback(input);

  return {
    durationMinutes: input.durationMinutes,
    intensity: mapIfToIntensity(input.intensityFactor),
    heatFactor: input.heatFactor,
    carbTargetGramsPerHour: fallbackTarget,
    planningMode: 'auto',
    autoMetrics: {
      inputPair: 'duration_if',
      intensityFactor: input.intensityFactor,
      tss: Math.round(
        100 *
          input.intensityFactor *
          input.intensityFactor *
          (input.durationMinutes / 60)
      ),
      normalizedPowerWatts: 0,
      kilojoulesPerHour: 0,
      autoCarbTargetGramsPerHour: input.gutTrainingTargetGph ?? fallbackTarget,
      hydrationMlPerHour: 0,
      sodiumMgPerHour: 0,
      carbOverrideApplied:
        input.carbTargetOverrideGramsPerHour !== undefined &&
        input.carbTargetOverrideGramsPerHour !== input.gutTrainingTargetGph,
      userProvidedDurationMinutes: input.durationMinutes,
      userProvidedIntensityFactor: input.intensityFactor,
    },
    ...(input.refuelStops > 0 && input.durationMinutes >= 120
      ? { refuelStops: input.refuelStops }
      : {}),
  };
}

export function formatEveryThirtyMinutesCue(carbsGPerHour: number): string {
  return `Every 30 min: ${Math.round(carbsGPerHour / 2)} g carbs`;
}

export function getMissingPlanRequirements(
  input: PlanRequirementInput
): string[] {
  const missing: string[] = [];

  if (!input.weightReady) {
    missing.push('Add rider weight');
  }

  if (
    !Number.isFinite(input.durationMinutes) ||
    input.durationMinutes < MIN_DURATION_MINUTES ||
    input.durationMinutes > MAX_DURATION_MINUTES
  ) {
    missing.push(
      `Enter a duration from ${MIN_DURATION_MINUTES} to ${MAX_DURATION_MINUTES} min`
    );
  }

  if (
    !Number.isFinite(input.intensityFactor) ||
    input.intensityFactor < MIN_INTENSITY_FACTOR ||
    input.intensityFactor > MAX_INTENSITY_FACTOR
  ) {
    missing.push(
      `Enter IF from ${MIN_INTENSITY_FACTOR.toFixed(1)} to ${MAX_INTENSITY_FACTOR.toFixed(1)}`
    );
  }

  if (input.bottleCount <= 0) {
    missing.push('Add at least one bottle');
  }

  if (!input.hasDrinkMix) {
    missing.push('Select a drink mix');
  }

  return missing;
}

export function normalizeSolidOverrides(
  value: unknown
): Record<string, number> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const overrides = Object.entries(value as Record<string, unknown>).reduce<
    Record<string, number>
  >((acc, [productId, quantity]) => {
    if (
      typeof quantity === 'number' &&
      Number.isFinite(quantity) &&
      quantity >= 0
    ) {
      acc[productId] = quantity;
    }
    return acc;
  }, {});

  return Object.keys(overrides).length > 0 ? overrides : undefined;
}
