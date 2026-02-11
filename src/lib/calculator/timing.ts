import type {
  BottleAllocation,
  SolidAllocation,
  ConsumptionGuideItem,
  RideCharacteristics,
  Bottle,
  Product,
} from '@/types';

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

  // Sip every 15 minutes
  const sipInterval = 15;
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

  let sipCount = 0;

  for (let time = sipInterval; time <= durationMins; time += sipInterval) {
    // Switch to next bottle after sipsPerBottle sips
    if (sipCount > 0 && sipCount % sipsPerBottle === 0 && currentBottleIndex < bottles.length - 1) {
      currentBottleIndex++;
    }

    const currentBottle = bottles[currentBottleIndex];
    if (currentBottle) {
      const bottle = bottleData.find((b) => b.id === currentBottle.bottleId);
      const carbsPerSip = Math.round(currentBottle.carbsTotal / sipsPerBottle);
      cumulativeCarbs += carbsPerSip;

      guide.push({
        timeOffsetMinutes: time,
        action: `Drink from ${bottle?.name || `bottle ${currentBottleIndex + 1}`} (~${carbsPerSip}g carbs)`,
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
