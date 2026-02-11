export type IntensityLevel = 'recovery' | 'endurance' | 'tempo' | 'threshold' | 'race';
export type HeatFactor = 'cool' | 'moderate' | 'warm' | 'hot';

export interface RideCharacteristics {
  durationMinutes: number;
  intensity: IntensityLevel;
  heatFactor: HeatFactor;
  carbTargetGramsPerHour: number;
  refuelStops?: number;
}
