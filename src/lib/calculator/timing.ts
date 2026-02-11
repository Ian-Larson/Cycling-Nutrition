import type {
  BottleAllocation,
  SolidAllocation,
  ConsumptionGuideItem,
  RideCharacteristics,
  Bottle,
  Product,
} from '@/types';

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

  // Sip every 30 minutes
  const sipInterval = 30;
  let cumulativeCarbs = 0;
  let currentBottleIndex = 0;

  // Calculate total solids and interval
  const totalSolids = solids.reduce((sum, s) => sum + s.quantity, 0);
  const solidInterval =
    totalSolids > 0 ? Math.floor(durationMins / (totalSolids + 1)) : durationMins;
  let nextSolidTime = solidInterval;
  let solidsConsumed = 0;
  let solidProductIndex = 0;
  let solidUnitIndex = 0;

  // Calculate sips per bottle
  const totalSips = Math.floor(durationMins / sipInterval);
  const sipsPerBottle = Math.ceil(totalSips / bottles.length);

  // Refuel stops
  const refuelStops = ride.refuelStops || 0;
  const refuelTimes: number[] = [];
  if (refuelStops > 0) {
    const legDuration = durationMins / (refuelStops + 1);
    for (let i = 1; i <= refuelStops; i++) {
      refuelTimes.push(Math.round(legDuration * i));
    }
  }

  let sipCount = 0;

  for (let time = sipInterval; time <= durationMins; time += sipInterval) {
    // Check for refuel stop at this time
    const refuelIndex = refuelTimes.findIndex(
      (rt) => time >= rt && time < rt + sipInterval
    );
    if (refuelIndex !== -1) {
      guide.push({
        timeOffsetMinutes: refuelTimes[refuelIndex],
        action: `Refill bottles (fill ${refuelIndex + 2} of ${refuelStops + 1})`,
        carbsConsumed: 0,
        cumulativeCarbs,
      });
      // Reset bottle cycling for new fill
      currentBottleIndex = 0;
      sipCount = 0;
      refuelTimes.splice(refuelIndex, 1);
    }

    // Switch to next bottle after sipsPerBottle sips
    if (sipCount > 0 && sipCount % sipsPerBottle === 0 && currentBottleIndex < bottles.length - 1) {
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
        timeOffsetMinutes: time,
        action,
        carbsConsumed: carbsPerSip,
        cumulativeCarbs,
      });

      sipCount++;
    }

    // Check if it's time for a solid
    if (time >= nextSolidTime && solidsConsumed < totalSolids && solids.length > 0) {
      // Find which solid to consume
      while (
        solidProductIndex < solids.length &&
        solidUnitIndex >= solids[solidProductIndex].quantity
      ) {
        solidProductIndex++;
        solidUnitIndex = 0;
      }

      if (solidProductIndex < solids.length) {
        const solid = solids[solidProductIndex];
        const product = productData.find((p) => p.id === solid.productId);
        const carbsFromSolid = product?.nutrition.carbsGrams || 0;
        cumulativeCarbs += carbsFromSolid;

        guide.push({
          timeOffsetMinutes: time,
          action: `Eat ${product?.name || 'solid'} (${carbsFromSolid}g carbs)`,
          carbsConsumed: carbsFromSolid,
          cumulativeCarbs,
        });

        solidUnitIndex++;
        solidsConsumed++;
        nextSolidTime = time + solidInterval;
      }
    }
  }

  return guide.sort((a, b) => a.timeOffsetMinutes - b.timeOffsetMinutes);
}
