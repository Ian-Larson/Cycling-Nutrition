import type { TimelineItem } from '../types';

/**
 * Merge multiple phase timelines into a single sorted timeline.
 *
 * Sorts all items by offsetMinutesFromStart ascending, then
 * recomputes cumulativeCarbs as a running sum across all phases.
 */
export function mergeTimelines(timelines: TimelineItem[][]): TimelineItem[] {
  const all = timelines.flat();

  // Sort by offset ascending (stable sort preserves insertion order for ties)
  all.sort((a, b) => a.offsetMinutesFromStart - b.offsetMinutesFromStart);

  // Recompute cumulative carbs across all phases
  let cumulative = 0;
  for (const item of all) {
    cumulative += item.carbsGrams;
    item.cumulativeCarbs = cumulative;
  }

  return all;
}
