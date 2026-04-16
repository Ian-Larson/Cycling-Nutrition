export type SessionPurpose =
  | 'recovery'          // Zone 1; minimal fuel
  | 'adaptation'        // Z2, deliberately train-low OK
  | 'endurance'         // Z2–3 steady
  | 'tempo'             // Z3 sustained
  | 'threshold'         // Z4 intervals
  | 'vo2'               // Z5 intervals
  | 'race'              // event day — max fueling
  | 'stage_race_day';   // part of multi-day block

/**
 * Ordered list of all purposes from lowest to highest fueling demand.
 * Used for comparison / clamping logic in targets.
 */
export const SESSION_PURPOSE_ORDER: readonly SessionPurpose[] = [
  'recovery',
  'adaptation',
  'endurance',
  'tempo',
  'threshold',
  'vo2',
  'race',
  'stage_race_day',
] as const;
