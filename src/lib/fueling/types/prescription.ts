import type { RiderProfile } from './rider';
import type { SessionPurpose } from './purpose';
import type { EffectiveHeat } from './environment';

// --- Context summary (snapshot of resolved inputs) ---

export interface ContextSummary {
  rider: Pick<RiderProfile, 'massKg' | 'sex' | 'age' | 'trainingLoad' | 'currentGutCeilingGph'>;
  durationMinutes: number;
  intensityFactor: number;
  tss: number;
  effectiveHeat: EffectiveHeat;
  purpose: SessionPurpose;
}

// --- Pre-ride ---

export interface PreRidePrescription {
  carbsGrams: number;
  carbsGPerKg: number;
  windowHoursBefore: number;
  proteinGrams?: number;
  caffeineMg?: number;
  caffeineTimingMinutesBefore?: number;
  notes: string[];
}

export interface CarbLoadProtocol {
  days: number;
  targetGPerKgPerDay: number;
  hourlyCeilingGPerKg: number;
}

// --- During-ride ---

export type DuringRideStrategy = 'steady' | 'top-of-hour' | 'pre-climb-stack' | 'refuel-anchored';

export interface DuringRidePrescription {
  carbsGPerHour: number;
  totalCarbsGrams: number;
  hydrationMlPerHour: number;
  totalHydrationMl: number;
  sodiumMgPerHour: number;
  sodiumMgPerLiterTargetInBottles: number;
  bottleConcentrationGPerMl: number;
  usesMultiTransportableCarbs: boolean;
  caffeineMg?: number;
  caffeineTimingOffsetMinutes?: number;
  strategy: DuringRideStrategy;
}

// --- Post-ride ---

export type RecoveryMode = 'rapid' | 'normal' | 'relaxed';

export interface RecoveryWindow {
  carbsGrams: number;
  proteinGrams: number;
  fluidsMl?: number;
  sodiumMg?: number;
}

export interface PostRidePrescription {
  mode: RecoveryMode;
  window1: RecoveryWindow;       // 0–2h
  window2?: RecoveryWindow;      // 2–4h, only if rapid
  recommendRecoveryDrink: boolean;
  notes: string[];
}

// --- Daily ---

export interface DailyTargets {
  carbsGramsTotal: number;
  carbsGPerKg: number;
  proteinGramsTotal: number;
  proteinGPerKg: number;
  caffeineMgCeiling: number;
}

// --- Pack list ---

export interface BottleAllocation {
  bottleId: string;
  productId: string | null;       // null = water-only
  mixGrams: number;
  mixScoops?: number;
  carbsTotal: number;
  sodiumMgTotal?: number;
  isWaterOnly: boolean;
}

export interface SolidAllocation {
  productId: string;
  quantity: number;
  carbsTotal: number;
  sodiumMgTotal?: number;
  caffeineMgTotal?: number;
  timingIntervalMinutes: number;
}

export interface PackList {
  bottles: BottleAllocation[];
  solids: SolidAllocation[];
  /**
   * Total fluid (ml) that your bottles can't cover across the ride, given
   * refuel stops. When > 0, the UI should prompt for an extra refill stop
   * or a smaller fluid target. 0 or undefined means the plan fully covers
   * the hydration target.
   */
  fluidShortfallMl?: number;
}

// --- Timeline ---

export interface TimelineItem {
  offsetMinutesFromStart: number;   // negative for pre-ride
  action: string;                   // human-readable, e.g. "Eat 1 GU Energy Gel"
  carbsGrams: number;
  proteinGrams?: number;
  sodiumMg?: number;
  caffeineMg?: number;
  cumulativeCarbs: number;
  phase: 'pre' | 'during' | 'post';
}

// --- Warnings ---

export type WarningCode =
  | 'gut-cap-applied'
  | 'no-multi-transport-product'
  | 'glucose-fructose-ratio-off'
  | 'bottle-concentration-exceeded'
  | 'hydration-deficit'
  | 'hyponatremia-risk'
  | 'sodium-ceiling'
  | 'caffeine-excess'
  | 'late-caffeine'
  | 'no-pre-ride-time'
  | 'carb-load-recommended'
  | 'gut-training-outpaced'
  | 'missing-sweat-rate'
  | 'missing-start-time'
  | 'train-low-not-recommended-for-quality';

export type WarningSeverity = 'info' | 'warn' | 'error';

export interface Warning {
  code: WarningCode;
  severity: WarningSeverity;
  message: string;
  details?: Record<string, unknown>;
}

// --- Confidence ---

export interface Confidence {
  score: number;                   // 0–1
  missing: string[];               // list of data gaps
}

// --- Top-level output ---

export interface FuelingPrescription {
  contextSummary: ContextSummary;
  pre?: PreRidePrescription;
  carbLoad?: CarbLoadProtocol;
  during: DuringRidePrescription;
  post?: PostRidePrescription;
  daily?: DailyTargets;
  packList?: PackList;
  timeline?: TimelineItem[];
  warnings: Warning[];
  confidence: Confidence;
  engineVersion: 'v3';
}
