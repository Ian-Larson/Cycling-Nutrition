import type {
  Bike,
  BikeSlotKey,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
  GearServiceEvent,
} from '@/types/gear';
import { FIXED_BIKE_SLOTS } from './constants';

export type GearUrgency = 'overdue' | 'soon' | 'ok' | 'unknown';

export interface ActiveSetupRow {
  slotKey: BikeSlotKey;
  slotLabel: string;
  installRecord: GearInstallRecord | null;
  instance: GearPartInstance | null;
  catalogItem: GearPartCatalogItem | null;
  latestService: GearServiceEvent | null;
  milesSinceInstall: number | null;
  urgency: GearUrgency;
}

interface DeriveActiveSetupInput {
  bike: Bike | null;
  catalog: readonly GearPartCatalogItem[];
  instances: readonly GearPartInstance[];
  installRecords: readonly GearInstallRecord[];
  serviceEvents: readonly GearServiceEvent[];
  today: string;
}

function isActiveInstall(record: GearInstallRecord): boolean {
  return record.removedAtMileageMi === undefined && record.removedDateIso === undefined;
}

function daysBetween(startIso: string, endIso: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = Date.parse(`${startIso}T00:00:00.000Z`);
  const end = Date.parse(`${endIso}T00:00:00.000Z`);
  return Math.round((end - start) / msPerDay);
}

function eventIsAtOrAfterInstall(
  event: GearServiceEvent,
  installRecord: GearInstallRecord
): boolean {
  if (event.dateIso < installRecord.installedDateIso) return false;
  return (
    event.mileageMi === undefined ||
    event.mileageMi >= installRecord.installedAtMileageMi
  );
}

function serviceMatchesSlot(
  event: GearServiceEvent,
  bike: Bike,
  slotKey: BikeSlotKey,
  installRecord: GearInstallRecord
): boolean {
  if (event.bikeId !== bike.id) return false;
  if (event.partInstanceId === installRecord.partInstanceId) return true;
  return (
    !event.partInstanceId &&
    event.slotKey === slotKey &&
    eventIsAtOrAfterInstall(event, installRecord)
  );
}

function compareServiceRecency(a: GearServiceEvent, b: GearServiceEvent): number {
  if (a.dateIso !== b.dateIso) return a.dateIso > b.dateIso ? -1 : 1;
  if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
  return b.id.localeCompare(a.id);
}

function deriveUrgency(
  service: GearServiceEvent | null,
  currentMileage: number | null,
  today: string
): GearUrgency {
  if (!service) return 'unknown';

  const mileageRemaining =
    service.nextDueMileageMi !== undefined && currentMileage !== null
      ? service.nextDueMileageMi - currentMileage
      : null;
  const daysRemaining = service.nextDueDateIso
    ? daysBetween(today, service.nextDueDateIso)
    : null;

  if (
    (mileageRemaining !== null && mileageRemaining < 0) ||
    (daysRemaining !== null && daysRemaining < 0)
  ) {
    return 'overdue';
  }

  const mileageIsSoon =
    mileageRemaining !== null &&
    service.intervalMi !== undefined &&
    mileageRemaining <= service.intervalMi * 0.1;
  const dateIsSoon = daysRemaining !== null && daysRemaining <= 14;
  if (mileageIsSoon || dateIsSoon) return 'soon';

  if (mileageRemaining !== null || daysRemaining !== null) return 'ok';
  return 'unknown';
}

export function deriveActiveSetup(input: DeriveActiveSetupInput): ActiveSetupRow[] {
  const bike = input.bike;
  const currentMileage = bike?.cachedOdometerMi ?? null;

  return FIXED_BIKE_SLOTS.map((slot) => {
    const installRecord =
      bike === null
        ? null
        : input.installRecords.find(
            (record) =>
              record.bikeId === bike.id &&
              record.slotKey === slot.key &&
              isActiveInstall(record)
          ) ?? null;
    const instance =
      installRecord === null
        ? null
        : input.instances.find(
            (candidate) => candidate.id === installRecord.partInstanceId
          ) ?? null;
    const catalogItem =
      instance === null
        ? null
        : input.catalog.find((item) => item.id === instance.catalogItemId) ?? null;
    const latestService =
      bike === null || installRecord === null
        ? null
        : [...input.serviceEvents]
            .filter((event) =>
              serviceMatchesSlot(event, bike, slot.key, installRecord)
            )
            .sort(compareServiceRecency)[0] ?? null;
    const milesSinceInstall =
      currentMileage !== null && installRecord !== null
        ? currentMileage - installRecord.installedAtMileageMi
        : null;

    return {
      slotKey: slot.key,
      slotLabel: slot.label,
      installRecord,
      instance,
      catalogItem,
      latestService,
      milesSinceInstall,
      urgency: deriveUrgency(latestService, currentMileage, input.today),
    };
  });
}
