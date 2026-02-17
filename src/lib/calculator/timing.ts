import type {
  BottleAllocation,
  SolidAllocation,
  ConsumptionGuideItem,
  RideCharacteristics,
  Bottle,
  Product,
} from '@/types';
import { PREFERRED_SOLIDS_PER_HOUR, MAX_SOLIDS_PER_HOUR } from './constants';

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function snapToFraction(decimal: number): string {
  if (decimal >= 0.9) return 'all';
  if (decimal >= 0.7) return '~3/4';
  if (decimal >= 0.58) return '~2/3';
  if (decimal >= 0.42) return '~1/2';
  if (decimal >= 0.29) return '~1/3';
  return '~1/4';
}

interface SolidUnit {
  allocation: SolidAllocation;
  product: Product | undefined;
}

export function generateConsumptionGuide(
  bottles: BottleAllocation[],
  solids: SolidAllocation[],
  ride: RideCharacteristics,
  bottleData: Bottle[],
  productData: Product[]
): ConsumptionGuideItem[] {
  const guide: ConsumptionGuideItem[] = [];
  const durationMins = ride.durationMinutes;

  if (bottles.length === 0) return guide;

  // --- Build flat list of solid units (skip allocations with missing products) ---
  const solidUnits: SolidUnit[] = [];
  for (const alloc of solids) {
    const product = productData.find((p) => p.id === alloc.productId);
    if (!product) continue;
    for (let i = 0; i < alloc.quantity; i++) {
      solidUnits.push({ allocation: alloc, product });
    }
  }

  // --- Compute hour buckets ---
  const numHours = Math.ceil(durationMins / 60);
  const hourBuckets: { start: number; end: number; sips: number; solids: SolidUnit[] }[] = [];
  for (let h = 0; h < numHours; h++) {
    const start = h * 60;
    const end = Math.min((h + 1) * 60, durationMins);
    hourBuckets.push({ start, end, sips: 0, solids: [] });
  }

  // --- Distribute solids round-robin across hours ---
  // First pass: up to PREFERRED_SOLIDS_PER_HOUR per hour
  let solidIndex = 0;
  for (let pass = 0; pass < MAX_SOLIDS_PER_HOUR && solidIndex < solidUnits.length; pass++) {
    const limit = pass < PREFERRED_SOLIDS_PER_HOUR ? PREFERRED_SOLIDS_PER_HOUR : MAX_SOLIDS_PER_HOUR;
    for (let h = 0; h < numHours && solidIndex < solidUnits.length; h++) {
      if (hourBuckets[h].solids.length < limit) {
        hourBuckets[h].solids.push(solidUnits[solidIndex]);
        solidIndex++;
      }
    }
  }

  // --- Distribute sips across hours ---
  // Target ~2 sips per full hour (every 30 min), proportional for partial hours
  const totalSips = Math.max(1, Math.floor(durationMins / 30));
  const sipsPerBottle = Math.max(1, Math.ceil(totalSips / bottles.length));

  // Distribute sips proportionally to hour length
  let sipsRemaining = totalSips;
  for (let h = 0; h < numHours; h++) {
    const hourLen = hourBuckets[h].end - hourBuckets[h].start;
    const hourSips = Math.min(
      sipsRemaining,
      Math.max(1, Math.round(totalSips * (hourLen / durationMins)))
    );
    hourBuckets[h].sips = hourSips;
    sipsRemaining -= hourSips;
  }
  // Distribute any remaining sips
  for (let h = 0; sipsRemaining > 0 && h < numHours; h++) {
    hourBuckets[h].sips++;
    sipsRemaining--;
  }

  // --- Refuel stops ---
  const refuelStops = ride.refuelStops || 0;
  const refuelTimes: number[] = [];
  if (refuelStops > 0) {
    const legDuration = durationMins / (refuelStops + 1);
    for (let i = 1; i <= refuelStops; i++) {
      refuelTimes.push(Math.round(legDuration * i));
    }
  }

  // --- Generate events per hour bucket ---
  let cumulativeCarbs = 0;
  let globalSipCount = 0;
  let currentBottleIndex = 0;
  let refuelsEmitted = 0;

  for (let h = 0; h < numHours; h++) {
    const bucket = hourBuckets[h];
    const numSips = bucket.sips;
    const numSolids = bucket.solids.length;
    const totalEvents = numSips + numSolids;

    if (totalEvents === 0) continue;

    const hourLen = bucket.end - bucket.start;

    // Space events evenly within the hour
    const eventSpacing = hourLen / (totalEvents + 1);

    // Interleave: alternate sip, solid, sip, solid...
    let sipsDone = 0;
    let solidsDone = 0;

    for (let e = 0; e < totalEvents; e++) {
      const eventTime = Math.round(bucket.start + eventSpacing * (e + 1));

      // Check for refuel stop before this event
      const refuelIdx = refuelTimes.findIndex(
        (rt) => rt <= eventTime && rt > (e === 0 ? bucket.start : bucket.start + eventSpacing * e)
      );
      if (refuelIdx !== -1) {
        refuelsEmitted++;
        guide.push({
          timeOffsetMinutes: refuelTimes[refuelIdx],
          action: `Refill bottles (fill ${refuelsEmitted + 1} of ${refuelStops + 1})`,
          carbsConsumed: 0,
          cumulativeCarbs,
        });
        refuelTimes.splice(refuelIdx, 1);
        // Reset bottle cycling after refuel
        currentBottleIndex = 0;
        globalSipCount = 0;
      }

      // Decide: sip or solid? Alternate, starting with sip
      const remainingSips = numSips - sipsDone;
      const remainingSolids = numSolids - solidsDone;
      const doSip =
        remainingSips > 0 &&
        (remainingSolids === 0 || sipsDone / Math.max(1, numSips) <= solidsDone / Math.max(1, numSolids));

      if (doSip) {
        // Advance bottle if needed
        if (globalSipCount > 0 && globalSipCount % sipsPerBottle === 0 && currentBottleIndex < bottles.length - 1) {
          currentBottleIndex++;
        }

        const currentBottle = bottles[currentBottleIndex];
        if (currentBottle) {
          const bottle = bottleData.find((b) => b.id === currentBottle.bottleId);
          const bottleName = bottle?.name || `bottle ${currentBottleIndex + 1}`;
          const carbsPerSip = Math.round(currentBottle.carbsTotal / sipsPerBottle);
          cumulativeCarbs += carbsPerSip;

          const fraction = snapToFraction(1 / sipsPerBottle);
          const waterSuffix = currentBottle.isWaterOnly ? ' (water)' : '';
          const action = `Drink ${fraction} of ${bottle?.capacityMl || '?'}ml ${bottleName}${waterSuffix}`;

          guide.push({
            timeOffsetMinutes: eventTime,
            action,
            carbsConsumed: carbsPerSip,
            cumulativeCarbs,
          });

          globalSipCount++;
        }
        sipsDone++;
      } else if (remainingSolids > 0) {
        const solidUnit = bucket.solids[solidsDone];
        const carbsFromSolid = solidUnit.product?.nutrition.carbsGrams || 0;
        cumulativeCarbs += carbsFromSolid;

        guide.push({
          timeOffsetMinutes: eventTime,
          action: `Eat ${solidUnit.product?.name || 'solid'} (${carbsFromSolid}g carbs)`,
          carbsConsumed: carbsFromSolid,
          cumulativeCarbs,
        });
        solidsDone++;
      }
    }
  }

  // Handle any remaining refuel stops not yet emitted
  for (const rt of refuelTimes) {
    refuelsEmitted++;
    guide.push({
      timeOffsetMinutes: rt,
      action: `Refill bottles (fill ${refuelsEmitted + 1} of ${refuelStops + 1})`,
      carbsConsumed: 0,
      cumulativeCarbs,
    });
  }

  return guide.sort((a, b) => a.timeOffsetMinutes - b.timeOffsetMinutes);
}
