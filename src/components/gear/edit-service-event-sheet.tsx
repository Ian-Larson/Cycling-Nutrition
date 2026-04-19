import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import { clsx } from 'clsx';
import { Button, Input, Select } from '@/components/ui';
import {
  FIXED_BIKE_SLOTS,
  GEAR_SERVICE_TYPES,
} from '@/lib/gear/constants';
import { validateServiceDraft } from '@/lib/gear/lifecycle';
import { useStore } from '@/store';
import type {
  Bike,
  BikeSlotKey,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
  GearServiceEvent,
  GearServiceTypeKey,
} from '@/types/gear';

interface EditServiceEventSheetProps {
  open: boolean;
  event: GearServiceEvent | null;
  bikes: Bike[];
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  installRecords: GearInstallRecord[];
  onClose: () => void;
}

type FormErrors = Record<string, string>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isActiveInstall(record: GearInstallRecord): boolean {
  return (
    record.removedAtMileageMi === undefined && record.removedDateIso === undefined
  );
}

function partTitle(
  instance: GearPartInstance,
  catalog: readonly GearPartCatalogItem[]
): string {
  const item = catalog.find((c) => c.id === instance.catalogItemId);
  if (instance.label) return instance.label;
  if (item) return [item.brand, item.model].filter(Boolean).join(' ') || item.model;
  return instance.id;
}

function parseOptionalNumber(
  value: string,
  key: string,
  label: string,
  errors: FormErrors,
  options: { positive?: boolean; nonNegative?: boolean } = {}
): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    errors[key] = `${label} must be a number.`;
    return undefined;
  }
  if (options.positive && parsed <= 0) {
    errors[key] = `${label} must be greater than 0.`;
    return undefined;
  }
  if (options.nonNegative && parsed < 0) {
    errors[key] = `${label} cannot be negative.`;
    return undefined;
  }

  return parsed;
}

export function EditServiceEventSheet(props: EditServiceEventSheetProps) {
  const { open, onClose, event } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleDialogClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={clsx(
        'm-0 mt-auto w-full max-w-none rounded-t-2xl bg-white p-4 shadow-xl',
        'md:m-auto md:max-w-lg md:rounded-2xl md:p-6',
        'backdrop:bg-black/40 backdrop:backdrop-blur-sm'
      )}
    >
      {open && event ? <EditServiceEventForm {...props} event={event} /> : null}
    </dialog>
  );
}

interface EditFormProps extends Omit<EditServiceEventSheetProps, 'event'> {
  event: GearServiceEvent;
}

function EditServiceEventForm({
  event,
  bikes,
  catalog,
  instances,
  installRecords,
  onClose,
}: EditFormProps) {
  const updateGearServiceEvent = useStore((s) => s.updateGearServiceEvent);

  const [bikeId, setBikeId] = useState(event.bikeId);
  const [slotKey, setSlotKey] = useState<BikeSlotKey | ''>(event.slotKey ?? '');
  const [partInstanceId, setPartInstanceId] = useState(event.partInstanceId ?? '');
  const [typeKey, setTypeKey] = useState<GearServiceTypeKey>(event.typeKey);
  const [dateIso, setDateIso] = useState(event.dateIso);
  const [mileageMi, setMileageMi] = useState(
    event.mileageMi === undefined ? '' : String(Math.round(event.mileageMi))
  );
  const [intervalMi, setIntervalMi] = useState(
    event.intervalMi === undefined ? '' : String(event.intervalMi)
  );
  const [intervalDays, setIntervalDays] = useState(
    event.intervalDays === undefined ? '' : String(event.intervalDays)
  );
  const [materialsNote, setMaterialsNote] = useState(event.materialsNote ?? '');
  const [notes, setNotes] = useState(event.notes ?? '');
  const [errors, setErrors] = useState<FormErrors>({});

  const selectedBike = bikes.find((bike) => bike.id === bikeId) ?? null;
  const activeRecords = installRecords.filter(
    (record) => record.bikeId === bikeId && isActiveInstall(record)
  );
  const filteredRecords = slotKey
    ? activeRecords.filter((record) => record.slotKey === slotKey)
    : activeRecords;
  const partOptions = filteredRecords
    .map((record) => {
      const instance = instances.find((c) => c.id === record.partInstanceId);
      if (!instance) return null;
      return { value: instance.id, label: partTitle(instance, catalog) };
    })
    .filter((option): option is { value: string; label: string } => option !== null);
  // Keep the existing part in the options even if no longer active.
  const existingInstance = event.partInstanceId
    ? instances.find((i) => i.id === event.partInstanceId) ?? null
    : null;
  if (
    existingInstance &&
    !partOptions.some((option) => option.value === existingInstance.id)
  ) {
    partOptions.unshift({
      value: existingInstance.id,
      label: `${partTitle(existingInstance, catalog)} (existing)`,
    });
  }
  const selectedPartInstanceId = partOptions.some(
    (option) => option.value === partInstanceId
  )
    ? partInstanceId
    : '';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: FormErrors = {};
    const parsedMileage = parseOptionalNumber(
      mileageMi,
      'mileageMi',
      'Mileage',
      nextErrors,
      { nonNegative: true }
    );
    const parsedIntervalMi = parseOptionalNumber(
      intervalMi,
      'intervalMi',
      'Mileage interval',
      nextErrors,
      { positive: true }
    );
    const parsedIntervalDays = parseOptionalNumber(
      intervalDays,
      'intervalDays',
      'Day interval',
      nextErrors,
      { positive: true }
    );

    const draft = {
      bikeId,
      partInstanceId: selectedPartInstanceId || undefined,
      slotKey: slotKey || undefined,
      typeKey,
      dateIso,
      mileageMi: parsedMileage,
      intervalMi: parsedIntervalMi,
      intervalDays: parsedIntervalDays,
      materialsNote: materialsNote.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    Object.assign(nextErrors, validateServiceDraft(draft, todayIso()));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Derive nextDue values the same way logGearServiceEvent does.
    const nextDueMileageMi =
      parsedMileage !== undefined && parsedIntervalMi !== undefined
        ? parsedMileage + parsedIntervalMi
        : undefined;
    const nextDueDateIso =
      parsedIntervalDays !== undefined && dateIso
        ? (() => {
            const d = new Date(`${dateIso}T00:00:00`);
            d.setUTCDate(d.getUTCDate() + parsedIntervalDays);
            return d.toISOString().slice(0, 10);
          })()
        : undefined;

    updateGearServiceEvent(event.id, {
      bikeId: draft.bikeId,
      partInstanceId: draft.partInstanceId,
      slotKey: draft.slotKey,
      typeKey: draft.typeKey,
      dateIso: draft.dateIso,
      mileageMi: draft.mileageMi,
      intervalMi: draft.intervalMi,
      intervalDays: draft.intervalDays,
      materialsNote: draft.materialsNote,
      notes: draft.notes,
      nextDueMileageMi,
      nextDueDateIso,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            Edit service event
          </h2>
          <p className="text-sm leading-5 text-ink-600">
            Update details for this service log entry.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <Select
        label="Service type"
        value={typeKey}
        onChange={(e) => setTypeKey(e.target.value as GearServiceTypeKey)}
        options={GEAR_SERVICE_TYPES.map((service) => ({
          value: service.key,
          label: service.label,
        }))}
      />

      <Select
        label="Bike"
        value={bikeId}
        onChange={(e) => {
          setBikeId(e.target.value);
          setSlotKey('');
          setPartInstanceId('');
        }}
        disabled={bikes.length === 0}
        options={
          bikes.length === 0
            ? [{ value: '', label: 'No bikes yet' }]
            : bikes.map((bike) => ({ value: bike.id, label: bike.name }))
        }
      />
      {errors.bikeId ? (
        <p className="text-sm text-rose-700">{errors.bikeId}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Slot"
          value={slotKey}
          onChange={(e) => {
            setSlotKey(e.target.value as BikeSlotKey | '');
            setPartInstanceId('');
          }}
          options={[
            { value: '', label: 'Bike only' },
            ...FIXED_BIKE_SLOTS.map((slot) => ({
              value: slot.key,
              label: slot.label,
            })),
          ]}
        />
        <Select
          label="Installed part"
          value={selectedPartInstanceId}
          onChange={(e) => setPartInstanceId(e.target.value)}
          options={[{ value: '', label: 'No specific part' }, ...partOptions]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Date"
          type="date"
          max={todayIso()}
          value={dateIso}
          onChange={(e) => setDateIso(e.target.value)}
          error={errors.dateIso}
        />
        <Input
          label="Mileage"
          type="number"
          min="0"
          step="1"
          placeholder={
            selectedBike?.cachedOdometerMi == null
              ? 'Optional'
              : String(Math.round(selectedBike.cachedOdometerMi))
          }
          value={mileageMi}
          onChange={(e) => setMileageMi(e.target.value)}
          error={errors.mileageMi}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Interval miles"
          type="number"
          min="1"
          step="1"
          placeholder="Optional"
          value={intervalMi}
          onChange={(e) => setIntervalMi(e.target.value)}
          error={errors.intervalMi}
        />
        <Input
          label="Interval days"
          type="number"
          min="1"
          step="1"
          placeholder="Optional"
          value={intervalDays}
          onChange={(e) => setIntervalDays(e.target.value)}
          error={errors.intervalDays}
        />
      </div>

      <Input
        label="Materials"
        placeholder="Wax, sealant, pads, torque notes"
        value={materialsNote}
        onChange={(e) => setMaterialsNote(e.target.value)}
      />

      <Input
        label="Notes"
        placeholder="Optional notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {errors.typeKey ? (
        <p className="text-sm text-rose-700">{errors.typeKey}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={bikes.length === 0}>
        Save changes
      </Button>
    </form>
  );
}
