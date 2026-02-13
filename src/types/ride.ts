export type IntensityLevel = 'recovery' | 'endurance' | 'tempo' | 'threshold' | 'race';
export type HeatFactor = 'cool' | 'moderate' | 'warm' | 'hot';
export type PlanningMode = 'manual' | 'auto';
export type AutoInputPair = 'duration_if' | 'duration_tss' | 'if_tss';

export interface AutoMetrics {
  inputPair: AutoInputPair;
  intensityFactor: number;
  tss: number;
  normalizedPowerWatts: number;
  kilojoulesPerHour: number;
  autoCarbTargetGramsPerHour: number;
  hydrationMlPerHour: number;
  sodiumMgPerHour: number;
  carbOverrideApplied: boolean;
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
