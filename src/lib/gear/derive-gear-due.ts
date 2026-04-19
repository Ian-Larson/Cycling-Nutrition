import type { Bike, GearInstallRecord, GearServiceEvent } from '@/types/gear';
import { getGearServiceType } from './constants';
import type { GearUrgency } from './derive-active-setup';

export interface GearDueItem {
  id: string;
  bike: Bike | null;
  bikeId: string;
  event: GearServiceEvent;
  typeKey: GearServiceEvent['typeKey'];
  label: string;
  remainingMi: number | null;
  remainingDays: number | null;
  urgency: GearUrgency;
}

interface DeriveGearDueInput {
  bikes: readonly Bike[];
  installRecords: readonly GearInstallRecord[];
  serviceEvents: readonly GearServiceEvent[];
  today: string;
}

const URGENCY_ORDER: Record<GearUrgency, number> = {
  overdue: 0,
  soon: 1,
  ok: 2,
  unknown: 3,
};

function daysBetween(startIso: string, endIso: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = Date.parse(`${startIso}T00:00:00.000Z`);
  const end = Date.parse(`${endIso}T00:00:00.000Z`);
  return Math.round((end - start) / msPerDay);
}

function isActiveInstall(record: GearInstallRecord): boolean {
  return record.removedAtMileageMi === undefined && record.removedDateIso === undefined;
}

function activeInstallKey(bikeId: string, value: string): string {
  return `${bikeId}\u0000${value}`;
}

function logicalTargetKey(event: GearServiceEvent): string {
  if (event.partInstanceId) {
    return `part\u0000${event.bikeId}\u0000${event.partInstanceId}\u0000${event.typeKey}`;
  }
  if (event.slotKey) {
    return `slot\u0000${event.bikeId}\u0000${event.slotKey}\u0000${event.typeKey}`;
  }
  return `bike\u0000${event.bikeId}\u0000${event.typeKey}`;
}

function compareServiceRecency(a: GearServiceEvent, b: GearServiceEvent): number {
  if (a.dateIso !== b.dateIso) return a.dateIso > b.dateIso ? -1 : 1;
  if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
  return b.id.localeCompare(a.id);
}

function hasActiveTarget(
  event: GearServiceEvent,
  activePartKeys: ReadonlySet<string>,
  activeSlotKeys: ReadonlySet<string>
): boolean {
  if (event.partInstanceId) {
    return activePartKeys.has(activeInstallKey(event.bikeId, event.partInstanceId));
  }
  if (event.slotKey) {
    return activeSlotKeys.has(activeInstallKey(event.bikeId, event.slotKey));
  }
  return true;
}

function deriveUrgency(
  event: GearServiceEvent,
  remainingMi: number | null,
  remainingDays: number | null
): GearUrgency {
  if (
    (remainingMi !== null && remainingMi < 0) ||
    (remainingDays !== null && remainingDays < 0)
  ) {
    return 'overdue';
  }

  const mileageIsSoon =
    remainingMi !== null &&
    event.intervalMi !== undefined &&
    remainingMi <= event.intervalMi * 0.1;
  const dateIsSoon = remainingDays !== null && remainingDays <= 14;
  if (mileageIsSoon || dateIsSoon) return 'soon';

  if (remainingMi !== null || remainingDays !== null) return 'ok';
  return 'unknown';
}

function nearestDueValue(item: GearDueItem): number {
  const values = [item.remainingMi, item.remainingDays].filter(
    (value): value is number => value !== null
  );
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...values);
}

export function deriveGearDue(input: DeriveGearDueInput): GearDueItem[] {
  const bikesById = new Map(input.bikes.map((bike) => [bike.id, bike]));
  const activeRecords = input.installRecords.filter(isActiveInstall);
  const activePartKeys = new Set(
    activeRecords.map((record) =>
      activeInstallKey(record.bikeId, record.partInstanceId)
    )
  );
  const activeSlotKeys = new Set(
    activeRecords.map((record) => activeInstallKey(record.bikeId, record.slotKey))
  );
  const latestByTarget = new Map<string, GearServiceEvent>();

  for (const event of input.serviceEvents) {
    if (!hasActiveTarget(event, activePartKeys, activeSlotKeys)) continue;

    const targetKey = logicalTargetKey(event);
    const previous = latestByTarget.get(targetKey);
    if (!previous || compareServiceRecency(event, previous) < 0) {
      latestByTarget.set(targetKey, event);
    }
  }

  return [...latestByTarget.values()]
    .filter(
      (event) =>
        event.nextDueMileageMi !== undefined || event.nextDueDateIso !== undefined
    )
    .map((event) => {
      const bike = bikesById.get(event.bikeId) ?? null;
      const remainingMi =
        event.nextDueMileageMi !== undefined && bike?.cachedOdometerMi != null
          ? event.nextDueMileageMi - bike.cachedOdometerMi
          : null;
      const remainingDays = event.nextDueDateIso
        ? daysBetween(input.today, event.nextDueDateIso)
        : null;

      return {
        id: event.id,
        bike,
        bikeId: event.bikeId,
        event,
        typeKey: event.typeKey,
        label: getGearServiceType(event.typeKey).label,
        remainingMi,
        remainingDays,
        urgency: deriveUrgency(event, remainingMi, remainingDays),
      };
    })
    .sort((a, b) => {
      const urgencyDelta = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
      if (urgencyDelta !== 0) return urgencyDelta;
      return nearestDueValue(a) - nearestDueValue(b);
    });
}
