import type {
  Bike,
  GearInstallRecord,
  GearPartInstance,
} from '@/types/gear';

interface LifetimeMileageInput {
  instance: GearPartInstance;
  installRecords: readonly GearInstallRecord[];
  bikes: readonly Bike[];
}

export function computePartLifetimeMileage({
  instance,
  installRecords,
  bikes,
}: LifetimeMileageInput): number | null {
  const initial = instance.initialMileageMi ?? 0;
  const bikesById = new Map(bikes.map((bike) => [bike.id, bike]));
  let accrued = 0;
  let anyKnown = instance.initialMileageMi !== undefined;

  for (const record of installRecords) {
    if (record.partInstanceId !== instance.id) continue;

    if (record.removedAtMileageMi !== undefined) {
      const segment = record.removedAtMileageMi - record.installedAtMileageMi;
      if (Number.isFinite(segment) && segment > 0) accrued += segment;
      anyKnown = true;
      continue;
    }

    const bike = bikesById.get(record.bikeId);
    if (bike?.cachedOdometerMi != null) {
      const segment = bike.cachedOdometerMi - record.installedAtMileageMi;
      if (Number.isFinite(segment) && segment > 0) accrued += segment;
      anyKnown = true;
    }
  }

  if (!anyKnown) return null;
  return initial + accrued;
}
