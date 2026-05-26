import type { DuringRidePrescription, PackList, TimelineItem } from '../types';

/**
 * Build timeline items for the during-ride phase.
 *
 * Distributes feeding events every ~20 minutes across the ride duration.
 * Interleaves sip events (from bottles in pack list) with solid food events.
 * Inserts refuel stop events at specified offsets.
 */
export function buildDuringTimeline(
  during: DuringRidePrescription,
  packList?: PackList,
  durationMinutes: number = 60,
  refuelStopOffsets?: number[],
): TimelineItem[] {
  // Hydration-only ride (0 carbs/h)
  if (during.carbsGPerHour === 0) {
    return [
      {
        offsetMinutesFromStart: 0,
        action: `Hydration only: sip ${during.hydrationMlPerHour}ml/h`,
        carbsGrams: 0,
        cumulativeCarbs: 0,
        phase: 'during',
      },
    ];
  }

  const items: TimelineItem[] = [];

  // Number of feeding events: one every ~20 min, minimum 1
  const feedingCount = Math.max(1, Math.floor(durationMinutes / 20));
  const intervalMinutes = durationMinutes / feedingCount;

  // Total carbs per feeding event from drink
  const totalDrinkCarbs = packList
    ? packList.bottles.reduce((sum, b) => sum + b.carbsTotal, 0)
    : during.totalCarbsGrams;

  // Total carbs from solids
  const totalSolidCarbs = packList
    ? packList.solids.reduce((sum, s) => sum + s.carbsTotal, 0)
    : 0;

  // If we have a pack list, separate drink vs solid events
  const carbsFromDrinkPerEvent = totalDrinkCarbs / feedingCount;

  // Solid events: spread each solid item across the ride
  const solidEvents: { offset: number; carbsGrams: number; label: string }[] =
    [];
  if (packList && packList.solids.length > 0) {
    let solidIndex = 0;
    const totalSolidItems = packList.solids.reduce(
      (sum, s) => sum + s.quantity,
      0,
    );
    for (const solid of packList.solids) {
      for (let q = 0; q < solid.quantity; q++) {
        // Distribute solids evenly across the ride
        const solidInterval = durationMinutes / (totalSolidItems + 1);
        const offset = Math.round(solidInterval * (solidIndex + 1));
        solidEvents.push({
          offset: Math.min(offset, durationMinutes - 1),
          carbsGrams: solid.carbsTotal / solid.quantity,
          label: solid.productName
            ? `Eat ${solid.productName}`
            : `Eat solid #${solidIndex + 1}`,
        });
        solidIndex++;
      }
    }
  }

  // Build sip events
  for (let i = 0; i < feedingCount; i++) {
    const offset = Math.round(i * intervalMinutes);
    const fractionLabel = packList
      ? `${Math.round((1 / feedingCount) * 100)}%`
      : `~${Math.round(carbsFromDrinkPerEvent)}g CHO`;

    items.push({
      offsetMinutesFromStart: offset,
      action: `Drink ~${fractionLabel}`,
      carbsGrams: Math.round(carbsFromDrinkPerEvent * 10) / 10,
      cumulativeCarbs: 0, // recomputed below
      phase: 'during',
    });
  }

  // Merge solid events, ensuring min 5 min gap from existing sip events
  for (const solidEvent of solidEvents) {
    let adjustedOffset = solidEvent.offset;

    // Check for conflicts with existing items (min 5 min gap)
    const conflicting = items.some(
      (item) => Math.abs(item.offsetMinutesFromStart - adjustedOffset) < 5,
    );
    if (conflicting) {
      adjustedOffset += 5;
    }

    // Keep within ride duration
    adjustedOffset = Math.min(adjustedOffset, durationMinutes - 1);

    items.push({
      offsetMinutesFromStart: adjustedOffset,
      action: solidEvent.label,
      carbsGrams: Math.round(solidEvent.carbsGrams * 10) / 10,
      cumulativeCarbs: 0,
      phase: 'during',
    });
  }

  // If no pack list but we have carbs, distribute generically
  if (!packList && totalSolidCarbs === 0) {
    // carbs are already distributed via sip events above
  }

  // Insert refuel stops
  if (refuelStopOffsets && refuelStopOffsets.length > 0) {
    for (const stopOffset of refuelStopOffsets) {
      items.push({
        offsetMinutesFromStart: stopOffset,
        action: 'Refuel stop: refill bottles',
        carbsGrams: 0,
        cumulativeCarbs: 0,
        phase: 'during',
      });
    }
  }

  // Sort by offset ascending
  items.sort((a, b) => a.offsetMinutesFromStart - b.offsetMinutesFromStart);

  // Compute cumulative carbs
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.carbsGrams;
    item.cumulativeCarbs = Math.round(cumulative * 10) / 10;
  }

  return items;
}
