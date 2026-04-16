import type { FuelPlan } from '@/types';
import type {
  FuelingPrescription,
  DuringRidePrescription,
  TimelineItem,
  Warning,
  WarningSeverity,
  WarningCode,
} from '../types';

type MigratedPrescription = Partial<Omit<FuelingPrescription, 'engineVersion'>> & {
  engineVersion: 'v3-migrated';
};

/** Map v2 warning types to the closest v3 warning code. */
function mapWarningCode(v2Type: string): WarningCode {
  switch (v2Type) {
    case 'concentration_limit':
      return 'bottle-concentration-exceeded';
    case 'insufficient_capacity':
      return 'hydration-deficit';
    case 'refuel_suggested':
      return 'hydration-deficit';
    default:
      return 'hydration-deficit';
  }
}

function mapWarningSeverity(v2Type: string): WarningSeverity {
  switch (v2Type) {
    case 'concentration_limit':
      return 'warn';
    case 'insufficient_capacity':
      return 'warn';
    case 'refuel_suggested':
      return 'info';
    default:
      return 'info';
  }
}

/**
 * Best-effort migration of a v2 FuelPlan into a partial v3 FuelingPrescription.
 *
 * V2 plans lack pre-ride, post-ride, daily, and carb-load data, so those fields
 * remain undefined. The during-ride block and timeline are mapped from the v2
 * summary and consumptionGuide.
 */
export function migrateV2Plan(
  v2Plan: FuelPlan,
): MigratedPrescription {
  const durationMinutes = v2Plan.rideCharacteristics.durationMinutes;
  const durationHours = durationMinutes / 60;

  // Map summary -> during block
  const carbsGPerHour =
    durationHours > 0
      ? Math.round(v2Plan.summary.totalCarbsNeeded / durationHours)
      : 0;

  const during: DuringRidePrescription = {
    carbsGPerHour,
    totalCarbsGrams: v2Plan.summary.totalCarbsNeeded,
    hydrationMlPerHour:
      durationHours > 0
        ? Math.round(v2Plan.summary.hydrationMl / durationHours)
        : 0,
    totalHydrationMl: v2Plan.summary.hydrationMl,
    sodiumMgPerHour: v2Plan.summary.sodiumMgPerHour ?? 0,
    sodiumMgPerLiterTargetInBottles: 0, // v2 didn't track this
    bottleConcentrationGPerMl: 0,       // v2 didn't track this
    usesMultiTransportableCarbs: carbsGPerHour > 60,
    strategy: 'steady',
  };

  // Map consumptionGuide -> timeline
  const timeline: TimelineItem[] = v2Plan.consumptionGuide.map((item) => ({
    offsetMinutesFromStart: item.timeOffsetMinutes,
    action: item.action,
    carbsGrams: item.carbsConsumed,
    cumulativeCarbs: item.cumulativeCarbs,
    phase: 'during' as const,
  }));

  // Map warnings
  const warnings: Warning[] = (v2Plan.warnings ?? []).map((w) => ({
    code: mapWarningCode(w.type),
    severity: mapWarningSeverity(w.type),
    message: w.message,
  }));

  return {
    during,
    timeline,
    warnings,
    confidence: { score: 0.3, missing: ['migrated-from-v2'] },
    engineVersion: 'v3-migrated',
  };
}
