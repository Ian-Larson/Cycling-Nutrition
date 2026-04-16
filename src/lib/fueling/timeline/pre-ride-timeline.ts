import type { PreRidePrescription, TimelineItem } from '../types';

/**
 * Build timeline items for the pre-ride phase.
 *
 * Events:
 *  1. Pre-ride meal (offset = windowHoursBefore * 60 before start)
 *  2. Caffeine (offset = caffeineTimingMinutesBefore before start, default 45 min)
 *  3. Final top-up at −15 min (~20 g CHO + 150 ml fluid)
 *
 * Returns items sorted by offsetMinutesFromStart ascending with cumulativeCarbs computed.
 */
export function buildPreRideTimeline(
  preRide?: PreRidePrescription,
): TimelineItem[] {
  if (!preRide) return [];

  const items: TimelineItem[] = [];

  // 1. Pre-ride meal
  const mealOffset = -(preRide.windowHoursBefore * 60);
  const proteinNote = preRide.proteinGrams
    ? ` + ${preRide.proteinGrams}g protein`
    : '';
  items.push({
    offsetMinutesFromStart: mealOffset,
    action: `Pre-ride meal: ~${preRide.carbsGrams}g CHO${proteinNote}`,
    carbsGrams: preRide.carbsGrams,
    proteinGrams: preRide.proteinGrams,
    cumulativeCarbs: 0, // recomputed below
    phase: 'pre',
  });

  // 2. Caffeine (if prescribed)
  if (preRide.caffeineMg) {
    const caffeineOffset = -(preRide.caffeineTimingMinutesBefore ?? 45);
    items.push({
      offsetMinutesFromStart: caffeineOffset,
      action: `Caffeine: ${preRide.caffeineMg}mg`,
      carbsGrams: 0,
      caffeineMg: preRide.caffeineMg,
      cumulativeCarbs: 0,
      phase: 'pre',
    });
  }

  // 3. Final top-up at −15 min
  items.push({
    offsetMinutesFromStart: -15,
    action: 'Final top-up: ~20g CHO + 150ml fluid',
    carbsGrams: 20,
    cumulativeCarbs: 0,
    phase: 'pre',
  });

  // Sort by time ascending and compute cumulative carbs
  items.sort((a, b) => a.offsetMinutesFromStart - b.offsetMinutesFromStart);

  let cumulative = 0;
  for (const item of items) {
    cumulative += item.carbsGrams;
    item.cumulativeCarbs = cumulative;
  }

  return items;
}
