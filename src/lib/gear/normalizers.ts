import type {
  BikeSlotKey,
  GearInstallRecord,
  GearPartAttributes,
  GearPartCatalogItem,
  GearPartCategory,
  GearPartInstance,
  GearPartInstanceStatus,
  GearServiceEvent,
  GearServiceTypeKey,
} from '@/types/gear';
import {
  FIXED_BIKE_SLOTS,
  GEAR_PART_CATEGORIES,
  GEAR_SERVICE_TYPES,
} from './constants';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  const parsed = numberValue(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

function nonNegativeNumber(value: unknown): number | undefined {
  const parsed = numberValue(value);
  return parsed !== undefined && parsed >= 0 ? parsed : undefined;
}

function timestamp(value: unknown): number {
  return nonNegativeNumber(value) ?? Date.now();
}

function isRealCalendarDateIso(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function dateIso(value: unknown): string | undefined {
  const parsed = text(value);
  if (!parsed) return undefined;
  return isRealCalendarDateIso(parsed) ? parsed : undefined;
}

function category(value: unknown): GearPartCategory | undefined {
  const parsed = text(value);
  return GEAR_PART_CATEGORIES.some((candidate) => candidate.key === parsed)
    ? (parsed as GearPartCategory)
    : undefined;
}

function serviceType(value: unknown): GearServiceTypeKey | undefined {
  const parsed = text(value);
  return GEAR_SERVICE_TYPES.some((candidate) => candidate.key === parsed)
    ? (parsed as GearServiceTypeKey)
    : undefined;
}

function slotKey(value: unknown): BikeSlotKey | undefined {
  const parsed = text(value);
  if (!parsed) return undefined;
  if (parsed.startsWith('custom:')) return parsed as BikeSlotKey;
  return FIXED_BIKE_SLOTS.some((slot) => slot.key === parsed)
    ? (parsed as BikeSlotKey)
    : undefined;
}

function instanceStatus(value: unknown): GearPartInstanceStatus | undefined {
  return value === 'spare' ||
    value === 'installed' ||
    value === 'removed' ||
    value === 'retired'
    ? value
    : undefined;
}

function normalizeAttributes(
  incomingCategory: GearPartCategory,
  value: unknown
): GearPartAttributes | undefined {
  if (!isObject(value) || value.category !== incomingCategory) return undefined;

  if (incomingCategory === 'tire') {
    const widthMm = positiveNumber(value.widthMm);
    if (!widthMm) return undefined;
    return {
      category: 'tire',
      widthMm,
      diameter: text(value.diameter),
      tubelessReady: typeof value.tubelessReady === 'boolean' ? value.tubelessReady : undefined,
    };
  }

  if (incomingCategory === 'chain') {
    return { category: 'chain', speedCount: positiveNumber(value.speedCount) };
  }

  if (incomingCategory === 'brake_pad') {
    return {
      category: 'brake_pad',
      compound: text(value.compound),
      padShape: text(value.padShape),
    };
  }

  if (incomingCategory === 'cassette') {
    const range = text(value.range);
    if (!range) return undefined;
    return {
      category: 'cassette',
      range,
      speedCount: positiveNumber(value.speedCount),
    };
  }

  const outerRing = positiveNumber(value.outerRing) ?? positiveNumber(value.toothCount);
  if (!outerRing) return undefined;
  const drivetrainType = value.drivetrainType === '2x' ? '2x' : '1x';
  const innerRing = drivetrainType === '2x' ? positiveNumber(value.innerRing) : undefined;
  return {
    category: 'chainring',
    drivetrainType,
    outerRing,
    innerRing,
  };
}

export function normalizeGearPartCatalog(value: unknown): GearPartCatalogItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isObject(item)) return [];
    const id = text(item.id);
    const model = text(item.model);
    const parsedCategory = category(item.category);
    if (!id || !model || !parsedCategory) return [];
    const attributes = normalizeAttributes(parsedCategory, item.attributes);
    if (!attributes) return [];

    return [
      {
        id,
        category: parsedCategory,
        brand: text(item.brand),
        model,
        weightGrams:
          item.weightGrams === undefined ? undefined : positiveNumber(item.weightGrams),
        attributes,
        notes: text(item.notes),
        createdAt: timestamp(item.createdAt),
        updatedAt: timestamp(item.updatedAt),
      },
    ];
  });
}

export function normalizeGearPartInstances(value: unknown): GearPartInstance[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isObject(item)) return [];
    const id = text(item.id);
    const catalogItemId = text(item.catalogItemId);
    const status = instanceStatus(item.status);
    if (!id || !catalogItemId || !status) return [];
    const acquiredDateIso = dateIso(item.acquiredDateIso);
    const retiredDateIso = dateIso(item.retiredDateIso);
    const initialMileageMi =
      item.initialMileageMi === undefined
        ? undefined
        : nonNegativeNumber(item.initialMileageMi);

    return [
      {
        id,
        catalogItemId,
        label: text(item.label),
        status,
        acquiredDateIso,
        retiredDateIso,
        initialMileageMi,
        notes: text(item.notes),
        createdAt: timestamp(item.createdAt),
        updatedAt: timestamp(item.updatedAt),
      },
    ];
  });
}

export function normalizeGearInstallRecords(value: unknown): GearInstallRecord[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isObject(item)) return [];
    const id = text(item.id);
    const bikeId = text(item.bikeId);
    const partInstanceId = text(item.partInstanceId);
    const parsedSlotKey = slotKey(item.slotKey);
    const installedAtMileageMi = nonNegativeNumber(item.installedAtMileageMi);
    const installedDateIso = dateIso(item.installedDateIso);
    if (
      !id ||
      !bikeId ||
      !partInstanceId ||
      !parsedSlotKey ||
      installedAtMileageMi === undefined ||
      !installedDateIso
    ) {
      return [];
    }

    const removedAtMileageMi =
      item.removedAtMileageMi === undefined ? undefined : nonNegativeNumber(item.removedAtMileageMi);
    const removedDateIso = dateIso(item.removedDateIso);
    const removeReason =
      item.removeReason === 'swapped' ||
      item.removeReason === 'worn' ||
      item.removeReason === 'damaged' ||
      item.removeReason === 'sold' ||
      item.removeReason === 'other'
        ? item.removeReason
        : undefined;

    return [
      {
        id,
        bikeId,
        partInstanceId,
        slotKey: parsedSlotKey,
        installedAtMileageMi,
        installedDateIso,
        removedAtMileageMi,
        removedDateIso,
        removeReason,
        createdAt: timestamp(item.createdAt),
        updatedAt: timestamp(item.updatedAt),
      },
    ];
  });
}

export function normalizeGearServiceEvents(value: unknown): GearServiceEvent[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isObject(item)) return [];
    const id = text(item.id);
    const bikeId = text(item.bikeId);
    const parsedType = serviceType(item.typeKey);
    const parsedDate = dateIso(item.dateIso);
    if (!id || !bikeId || !parsedType || !parsedDate) return [];

    return [
      {
        id,
        bikeId,
        partInstanceId: text(item.partInstanceId),
        slotKey: slotKey(item.slotKey),
        typeKey: parsedType,
        dateIso: parsedDate,
        mileageMi:
          item.mileageMi === undefined ? undefined : nonNegativeNumber(item.mileageMi),
        intervalMi:
          item.intervalMi === undefined ? undefined : positiveNumber(item.intervalMi),
        intervalDays:
          item.intervalDays === undefined ? undefined : positiveNumber(item.intervalDays),
        nextDueMileageMi:
          item.nextDueMileageMi === undefined
            ? undefined
            : nonNegativeNumber(item.nextDueMileageMi),
        nextDueDateIso: dateIso(item.nextDueDateIso),
        materialsNote: text(item.materialsNote),
        notes: text(item.notes),
        createdAt: timestamp(item.createdAt),
        updatedAt: timestamp(item.updatedAt),
      },
    ];
  });
}
