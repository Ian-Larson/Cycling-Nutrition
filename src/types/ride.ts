export type IntensityLevel = 'recovery' | 'endurance' | 'tempo' | 'threshold' | 'race';
export type HeatFactor = 'cool' | 'moderate' | 'warm' | 'hot';
export type PlanningMode = 'manual' | 'auto';
export type AutoInputPair = 'duration_if' | 'duration_tss' | 'if_tss';
export type AutoInputMode = 'pair' | 'triple';
export type NeedsLevel = 'low' | 'moderate' | 'high' | 'extreme';

export interface AutoMetrics {
  inputPair?: AutoInputPair;
  inputMode?: AutoInputMode;
  intensityFactor: number;
  tss: number;
  normalizedPowerWatts: number;
  kilojoulesPerHour: number;
  autoCarbTargetGramsPerHour: number;
  hydrationMlPerHour: number;
  sodiumMgPerHour: number;
  carbOverrideApplied: boolean;
  userProvidedDurationMinutes?: number;
  userProvidedIntensityFactor?: number;
  userProvidedTss?: number;
  correctedTss?: number;
  tssCorrectionApplied?: boolean;
  tssCorrectionDelta?: number;
  needsLevel?: NeedsLevel;
  needsScore?: number;
}

export interface RideCharacteristics {
  durationMinutes: number;
  intensity: IntensityLevel;
  heatFactor: HeatFactor;
  carbTargetGramsPerHour: number;
  planningMode?: PlanningMode;
  autoMetrics?: AutoMetrics;
  refuelStops?: number;
}
