import type { Bike, GearServiceEvent } from '@/types/gear';
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

  return input.serviceEvents
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
