import type { RideFormSnapshot } from '@/components/planner/ride-form';
import type { BottleInventory } from '@/types/bottle';
import { totalBottleCount } from '@/types/bottle';
import type { FuelPlan, Product, RideCharacteristics } from '@/types';

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getPlanTitleSuggestion(ride: RideCharacteristics): string {
  const intensity = `${ride.intensity[0].toUpperCase()}${ride.intensity.slice(1)}`;
  return `${formatDuration(ride.durationMinutes)} ${intensity} Plan`;
}

export function formatSetupSummary({
  selectedBottleCounts,
  selectedDrinkMix,
  selectedSolidIds,
}: {
  selectedBottleCounts: BottleInventory;
  selectedDrinkMix: Product | null;
  selectedSolidIds: readonly string[];
}): string {
  const bottleCount = totalBottleCount(selectedBottleCounts);

  if (bottleCount === 0 && !selectedDrinkMix) {
    return 'Select bottles and drink mix';
  }
  if (bottleCount === 0) return 'Select bottles';
  if (!selectedDrinkMix) return 'Select drink mix';

  const parts = [
    `${bottleCount} bottle${bottleCount === 1 ? '' : 's'}`,
    selectedDrinkMix.name,
  ];

  if (selectedSolidIds.length > 0) {
    parts.push(
      `${selectedSolidIds.length} solid${selectedSolidIds.length === 1 ? '' : 's'}`
    );
  }

  return parts.join(' - ');
}

export function formatRideSummary(ride: RideCharacteristics | undefined): string {
  if (!ride) return 'Enter ride data';

  return [
    formatDuration(ride.durationMinutes),
    ride.intensity,
    ride.heatFactor,
    `${ride.carbTargetGramsPerHour}g/h`,
  ].join(' - ');
}

export function isRideSnapshotEquivalentToRide(
  snapshot: RideFormSnapshot | undefined,
  ride: RideCharacteristics | undefined
): boolean {
  if (!snapshot || !ride) return false;

  return (
    snapshot.durationMinutes === ride.durationMinutes &&
    snapshot.intensity === ride.intensity &&
    snapshot.heatFactor === ride.heatFactor &&
    snapshot.carbTarget === ride.carbTargetGramsPerHour &&
    snapshot.planningMode === (ride.planningMode ?? 'manual') &&
    (snapshot.refuelStops ?? 0) === (ride.refuelStops ?? 0)
  );
}

export function getFuelResultPlan(
  plan: FuelPlan
): Omit<FuelPlan, 'id' | 'createdAt'> {
  const { id, createdAt, ...rest } = plan;
  void id;
  void createdAt;
  return rest;
}
