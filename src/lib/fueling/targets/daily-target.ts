import type { RiderProfile, DailyTargets, TrainingLoad } from '../types';
import {
  DAILY_CHO_G_PER_KG_BY_LOAD,
  DAILY_PROTEIN_G_PER_KG,
  DAILY_CAFFEINE_CEILING_MG,
  MASTERS_AGE_THRESHOLD,
} from '../constants/science';

/** Ordinal ranking for training-load tiers, used to pick the higher of two. */
const LOAD_ORDINAL: Record<TrainingLoad, number> = {
  light: 0,
  moderate: 1,
  high: 2,
  veryHigh: 3,
};

const ORDINAL_TO_LOAD: TrainingLoad[] = ['light', 'moderate', 'high', 'veryHigh'];

/** Map today's total session minutes to a training-load tier. */
function inferLoadFromMinutes(totalMinutes: number): TrainingLoad {
  if (totalMinutes < 60) return 'light';
  if (totalMinutes < 120) return 'moderate';
  if (totalMinutes < 180) return 'high';
  return 'veryHigh';
}

/**
 * Daily macro and caffeine targets, scaled by the effective training-load
 * tier (max of rider self-report and today's actual volume).
 */
export function dailyTargets(
  rider: Pick<RiderProfile, 'massKg' | 'age' | 'trainingLoad' | 'doesConcurrentStrength'>,
  todaysTotalSessionMinutes: number,
): DailyTargets {
  // 1. Determine effective training-load tier
  const inferred = inferLoadFromMinutes(todaysTotalSessionMinutes);
  const effectiveOrdinal = Math.max(LOAD_ORDINAL[rider.trainingLoad], LOAD_ORDINAL[inferred]);
  const tier = ORDINAL_TO_LOAD[effectiveOrdinal];

  // 2. CHO — midpoint of the tier's range
  const choRange = DAILY_CHO_G_PER_KG_BY_LOAD[tier];
  const carbsGPerKg = (choRange.min + choRange.max) / 2;
  const carbsGramsTotal = Math.round(carbsGPerKg * rider.massKg);

  // 3. Protein — base RDA, bumped for masters and/or concurrent strength
  let proteinGPerKg: number = DAILY_PROTEIN_G_PER_KG.rda;
  if (rider.age !== undefined && rider.age >= MASTERS_AGE_THRESHOLD) {
    proteinGPerKg = DAILY_PROTEIN_G_PER_KG.mastersCeiling;
  }
  if (rider.doesConcurrentStrength) {
    proteinGPerKg += 0.2;
  }
  const proteinGramsTotal = Math.round(proteinGPerKg * rider.massKg);

  // 4. Caffeine ceiling
  const caffeineMgCeiling = DAILY_CAFFEINE_CEILING_MG;

  return {
    carbsGPerKg,
    carbsGramsTotal,
    proteinGPerKg,
    proteinGramsTotal,
    caffeineMgCeiling,
  };
}
