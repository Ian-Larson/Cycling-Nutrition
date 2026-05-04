import type { Activity } from '@/types/activity';
import type { Bike } from '@/types/gear';

export interface BikeLink {
  stravaId: string;
  bikeId: string;
}

export function resolveBikeLinks(
  activities: readonly Activity[],
  bikes: readonly Bike[]
): BikeLink[] {
  const byStravaGearId = new Map<string, string>();
  for (const bike of bikes) {
    if (bike.stravaGearId) byStravaGearId.set(bike.stravaGearId, bike.id);
  }
  const links: BikeLink[] = [];
  for (const activity of activities) {
    if (activity.bikeId) continue;
    if (!activity.stravaGearId) continue;
    const bikeId = byStravaGearId.get(activity.stravaGearId);
    if (bikeId) links.push({ stravaId: activity.stravaId, bikeId });
  }
  return links;
}
