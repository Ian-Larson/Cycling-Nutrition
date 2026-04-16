import type { SessionPurpose } from '../types';

/**
 * Classify session purpose from intensity factor and duration,
 * or accept a user-provided override.
 *
 * IF-based classification:
 *   < 0.55        → recovery
 *   0.55 – 0.65   → adaptation
 *   0.65 – 0.82   → endurance
 *   0.82 – 0.90   → tempo
 *   0.90 – 0.97   → threshold
 *   0.97 – 1.05   → vo2
 *   >= 1.05       → race (if duration > 30 min), else vo2
 *
 * Special: duration > 180 min AND IF >= 0.82 → race
 */
export function classifyPurpose(
  intensityFactor: number,
  durationMinutes: number,
  purposeOverride?: SessionPurpose,
): SessionPurpose {
  if (purposeOverride !== undefined) return purposeOverride;

  // Special case: long hard efforts are race-level fueling
  if (durationMinutes > 180 && intensityFactor >= 0.82) return 'race';

  if (intensityFactor < 0.55) return 'recovery';
  if (intensityFactor < 0.65) return 'adaptation';
  if (intensityFactor < 0.82) return 'endurance';
  if (intensityFactor < 0.90) return 'tempo';
  if (intensityFactor < 0.97) return 'threshold';
  if (intensityFactor < 1.05) return 'vo2';

  // IF >= 1.05
  return durationMinutes > 30 ? 'race' : 'vo2';
}
