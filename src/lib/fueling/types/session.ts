import type { SessionPurpose } from './purpose';

export type SessionInputMode =
  | { kind: 'duration_if'; durationMinutes: number; intensityFactor: number }
  | { kind: 'duration_tss'; durationMinutes: number; tss: number }
  | { kind: 'if_tss'; intensityFactor: number; tss: number }
  | { kind: 'duration_rpe'; durationMinutes: number; rpe: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 };

export type Terrain = 'flat' | 'rolling' | 'hilly' | 'mountainous';

export interface SessionPlan {
  id: string;
  startAtIso?: string;                // optional; enables pre-ride / timeline anchoring
  inputMode: SessionInputMode;
  purposeOverride?: SessionPurpose;   // if user manually picks
  terrain?: Terrain;
  elevationGainMeters?: number;
  refuelStopOffsets?: number[];       // offsets in minutes from ride start
  nextSessionAtIso?: string;          // drives recovery aggressiveness
  priorSessionEndedAtIso?: string;    // drives pre-ride glycogen state estimate
  /**
   * User-provided during-ride carb target (g/h). When set, the engine honors
   * this as the primary target instead of the duration-bracket default. The
   * rider's gut ceiling is still applied as a safety cap. Pre/post-ride
   * prescriptions never reduce this value — they stack on top.
   */
  carbsGPerHourOverride?: number;
}
