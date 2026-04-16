import type { PostRidePrescription, TimelineItem } from '../types';

/**
 * Build timeline items for the post-ride recovery phase.
 *
 * Events:
 *  - Window 1 (0–2h post-ride): immediate recovery + mid-window feed
 *  - Window 2 (2–4h post-ride): if prescribed (rapid recovery)
 *  - Recovery drink recommendation note
 *
 * All items have phase: 'post'.
 */
export function buildPostRideTimeline(
  postRide?: PostRidePrescription,
  rideEndOffsetMinutes?: number,
): TimelineItem[] {
  if (!postRide) return [];

  const base = rideEndOffsetMinutes ?? 0;
  const items: TimelineItem[] = [];

  // Window 1: immediate recovery
  items.push({
    offsetMinutesFromStart: base,
    action: `Recovery: ${postRide.window1.carbsGrams}g CHO + ${postRide.window1.proteinGrams}g protein`,
    carbsGrams: Math.round(postRide.window1.carbsGrams * 0.6),
    proteinGrams: Math.round(postRide.window1.proteinGrams * 0.6),
    sodiumMg: postRide.window1.sodiumMg,
    cumulativeCarbs: 0,
    phase: 'post',
  });

  // Window 1: mid-window feed at +30 min (remaining portion)
  items.push({
    offsetMinutesFromStart: base + 30,
    action: `Recovery continued: remaining CHO + protein`,
    carbsGrams:
      postRide.window1.carbsGrams -
      Math.round(postRide.window1.carbsGrams * 0.6),
    proteinGrams:
      postRide.window1.proteinGrams -
      Math.round(postRide.window1.proteinGrams * 0.6),
    cumulativeCarbs: 0,
    phase: 'post',
  });

  // Window 2: 2h post-ride (if prescribed)
  if (postRide.window2) {
    items.push({
      offsetMinutesFromStart: base + 120,
      action: `Recovery window 2: ${postRide.window2.carbsGrams}g CHO + ${postRide.window2.proteinGrams}g protein`,
      carbsGrams: postRide.window2.carbsGrams,
      proteinGrams: postRide.window2.proteinGrams,
      cumulativeCarbs: 0,
      phase: 'post',
    });
  }

  // Recovery drink recommendation
  if (postRide.recommendRecoveryDrink) {
    items.push({
      offsetMinutesFromStart: base,
      action: 'Use recovery drink',
      carbsGrams: 0,
      cumulativeCarbs: 0,
      phase: 'post',
    });
  }

  // Sort by offset ascending
  items.sort((a, b) => a.offsetMinutesFromStart - b.offsetMinutesFromStart);

  // Compute cumulative carbs
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.carbsGrams;
    item.cumulativeCarbs = cumulative;
  }

  return items;
}
