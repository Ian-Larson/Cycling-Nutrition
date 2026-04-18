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

function dateIso(value: unknown): string | undefined {
  const parsed = text(value);
  if (!parsed) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(parsed) ? parsed : undefined;
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

  const toothCount = positiveNumber(value.toothCount);
  if (!toothCount) return undefined;
  return {
    category: 'chainring',
    toothCount,
    position: text(value.position),
    mount: text(value.mount),
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
    if (item.weightGrams !== undefined && positiveNumber(item.weightGrams) === undefined) {
      return [];
    }

    return [
      {
        id,
        category: parsedCategory,
        brand: text(item.brand),
        model,
        weightGrams: positiveNumber(item.weightGrams),
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
    if (item.acquiredDateIso !== undefined && dateIso(item.acquiredDateIso) === undefined) {
      return [];
    }
    if (item.retiredDateIso !== undefined && dateIso(item.retiredDateIso) === undefined) {
      return [];
    }

    return [
      {
        id,
        catalogItemId,
        label: text(item.label),
        status,
        acquiredDateIso: dateIso(item.acquiredDateIso),
        retiredDateIso: dateIso(item.retiredDateIso),
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

    const removedAtMileageMi = nonNegativeNumber(item.removedAtMileageMi);
    const removedDateIso = dateIso(item.removedDateIso);
    if (item.removedAtMileageMi !== undefined && removedAtMileageMi === undefined) {
      return [];
    }
    if (item.removedDateIso !== undefined && removedDateIso === undefined) {
      return [];
    }

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
        removeReason:
          item.removeReason === 'swapped' ||
          item.removeReason === 'worn' ||
          item.removeReason === 'damaged' ||
          item.removeReason === 'sold' ||
          item.removeReason === 'other'
            ? item.removeReason
            : undefined,
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
    if (item.mileageMi !== undefined && nonNegativeNumber(item.mileageMi) === undefined) {
      return [];
    }
    if (item.intervalMi !== undefined && positiveNumber(item.intervalMi) === undefined) {
      return [];
    }
    if (item.intervalDays !== undefined && positiveNumber(item.intervalDays) === undefined) {
      return [];
    }
    if (
      item.nextDueMileageMi !== undefined &&
      nonNegativeNumber(item.nextDueMileageMi) === undefined
    ) {
      return [];
    }
    if (item.nextDueDateIso !== undefined && dateIso(item.nextDueDateIso) === undefined) {
      return [];
    }

    return [
      {
        id,
        bikeId,
        partInstanceId: text(item.partInstanceId),
        slotKey: slotKey(item.slotKey),
        typeKey: parsedType,
        dateIso: parsedDate,
        mileageMi: nonNegativeNumber(item.mileageMi),
        intervalMi: positiveNumber(item.intervalMi),
        intervalDays: positiveNumber(item.intervalDays),
        nextDueMileageMi: nonNegativeNumber(item.nextDueMileageMi),
        nextDueDateIso: dateIso(item.nextDueDateIso),
        materialsNote: text(item.materialsNote),
        notes: text(item.notes),
        createdAt: timestamp(item.createdAt),
        updatedAt: timestamp(item.updatedAt),
      },
    ];
  });
}
