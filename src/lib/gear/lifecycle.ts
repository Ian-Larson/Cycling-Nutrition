import type {
  BikeSlotKey,
  GearInstallRecord,
  GearPartInstanceStatus,
  GearServiceTypeKey,
} from '@/types/gear';

export interface InstallDraft {
  bikeId?: string | null;
  partInstanceId?: string | null;
  slotKey?: BikeSlotKey | null;
  installedAtMileageMi?: number | null;
  installedDateIso?: string | null;
}

export interface RemoveDraft {
  installRecordId?: string | null;
  removedAtMileageMi?: number | null;
  removedDateIso?: string | null;
  removeReason?: GearInstallRecord['removeReason'];
  nextStatus: Extract<GearPartInstanceStatus, 'removed' | 'retired'>;
}

export interface ServiceDraft {
  bikeId?: string | null;
  partInstanceId?: string | null;
  slotKey?: BikeSlotKey | null;
  typeKey?: GearServiceTypeKey | null;
  dateIso?: string | null;
  mileageMi?: number | null;
  intervalMi?: number | null;
  intervalDays?: number | null;
  materialsNote?: string | null;
  notes?: string | null;
}

type LifecycleErrors = Record<string, string>;

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateRequiredPastDate(
  value: string | null | undefined,
  today: string,
  requiredMessage: string,
  futureMessage: string
): string | undefined {
  if (!hasText(value)) return requiredMessage;
  return value > today ? futureMessage : undefined;
}

export function validateInstallDraft(
  draft: InstallDraft,
  today: string
): LifecycleErrors {
  const errors: LifecycleErrors = {};

  if (!hasText(draft.bikeId)) errors.bikeId = 'Bike is required.';
  if (!hasText(draft.partInstanceId)) {
    errors.partInstanceId = 'Part instance is required.';
  }
  if (!hasText(draft.slotKey)) errors.slotKey = 'Slot is required.';
  if (
    !isFiniteNumber(draft.installedAtMileageMi) ||
    draft.installedAtMileageMi < 0
  ) {
    errors.installedAtMileageMi =
      'Mileage must be a finite number greater than or equal to 0.';
  }

  const dateError = validateRequiredPastDate(
    draft.installedDateIso,
    today,
    'Install date is required.',
    'Install date cannot be in the future.'
  );
  if (dateError) errors.installedDateIso = dateError;

  return errors;
}

export function validateRemoveDraft(
  draft: RemoveDraft,
  activeRecord: GearInstallRecord | null | undefined,
  today: string
): LifecycleErrors {
  const errors: LifecycleErrors = {};

  if (!hasText(draft.installRecordId)) {
    errors.installRecordId = 'Install record is required.';
  }
  if (!activeRecord) errors.activeRecord = 'Active install record is required.';
  if (draft.nextStatus !== 'removed' && draft.nextStatus !== 'retired') {
    errors.nextStatus = 'Choose whether to remove or retire this part.';
  }
  if (
    !isFiniteNumber(draft.removedAtMileageMi) ||
    draft.removedAtMileageMi < 0
  ) {
    errors.removedAtMileageMi =
      'Removal mileage must be a finite number greater than or equal to 0.';
  } else if (
    activeRecord &&
    draft.removedAtMileageMi < activeRecord.installedAtMileageMi
  ) {
    errors.removedAtMileageMi =
      'Removal mileage cannot be before install mileage.';
  }

  const dateError = validateRequiredPastDate(
    draft.removedDateIso,
    today,
    'Remove date is required.',
    'Remove date cannot be in the future.'
  );
  if (dateError) {
    errors.removedDateIso = dateError;
  } else if (
    activeRecord &&
    hasText(draft.removedDateIso) &&
    draft.removedDateIso < activeRecord.installedDateIso
  ) {
    errors.removedDateIso = 'Remove date cannot be before install date.';
  }

  return errors;
}

export function validateServiceDraft(
  draft: ServiceDraft,
  today: string
): LifecycleErrors {
  const errors: LifecycleErrors = {};

  if (!hasText(draft.bikeId)) errors.bikeId = 'Bike is required.';
  if (!hasText(draft.typeKey)) errors.typeKey = 'Service type is required.';

  const dateError = validateRequiredPastDate(
    draft.dateIso,
    today,
    'Service date is required.',
    'Service date cannot be in the future.'
  );
  if (dateError) errors.dateIso = dateError;

  if (
    draft.mileageMi !== undefined &&
    draft.mileageMi !== null &&
    (!isFiniteNumber(draft.mileageMi) || draft.mileageMi < 0)
  ) {
    errors.mileageMi =
      'Mileage must be a finite number greater than or equal to 0.';
  }
  if (
    draft.intervalMi !== undefined &&
    draft.intervalMi !== null &&
    (!isFiniteNumber(draft.intervalMi) || draft.intervalMi <= 0)
  ) {
    errors.intervalMi = 'Mileage interval must be a finite number greater than 0.';
  }
  if (
    draft.intervalDays !== undefined &&
    draft.intervalDays !== null &&
    (!isFiniteNumber(draft.intervalDays) || draft.intervalDays <= 0)
  ) {
    errors.intervalDays = 'Day interval must be a finite number greater than 0.';
  }

  return errors;
}
