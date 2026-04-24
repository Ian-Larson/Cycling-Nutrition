import { useState, type FormEvent } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Input,
  Select,
} from '@/components/ui';
import {
  FIXED_BIKE_SLOTS,
  GEAR_SERVICE_TYPES,
  getGearServiceType,
} from '@/lib/gear/constants';
import { validateServiceDraft } from '@/lib/gear/lifecycle';
import type {
  Bike,
  BikeSlotKey,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
  GearServiceEvent,
  GearServiceTypeKey,
} from '@/types/gear';

interface LogGearServiceSheetProps {
  open: boolean;
  onClose: () => void;
  bikes: Bike[];
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  installRecords: GearInstallRecord[];
  initialContext: {
    bikeId?: string;
    slotKey?: BikeSlotKey;
    partInstanceId?: string;
    typeKey?: GearServiceTypeKey;
  } | null;
  currentMileageMi: number | null;
  onSave: (
    event: Omit<
      GearServiceEvent,
      'id' | 'createdAt' | 'updatedAt' | 'nextDueMileageMi' | 'nextDueDateIso'
    >
  ) => void;
}

type FormErrors = Record<string, string>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isActiveInstall(record: GearInstallRecord): boolean {
  return record.removedAtMileageMi === undefined && record.removedDateIso === undefined;
}

function resolveInitialBikeId(
  bikes: readonly Bike[],
  initialBikeId: string | undefined
): string {
  if (initialBikeId && bikes.some((bike) => bike.id === initialBikeId)) {
    return initialBikeId;
  }
  return bikes.find((bike) => bike.isPrimary)?.id ?? bikes[0]?.id ?? '';
}

function partTitle(
  instance: GearPartInstance,
  catalog: readonly GearPartCatalogItem[]
): string {
  const item = catalog.find((candidate) => candidate.id === instance.catalogItemId);
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

export function LogGearServiceSheet(props: LogGearServiceSheetProps) {
  const { open, onClose } = props;
  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <LogGearServiceForm {...props} />
    </Dialog>
  );
}

function LogGearServiceForm({
  onClose,
  bikes,
  catalog,
  instances,
  installRecords,
  initialContext,
  currentMileageMi,
  onSave,
}: LogGearServiceSheetProps) {
  const initialTypeKey = initialContext?.typeKey ?? 'chain_wax';
  const initialPreset = getGearServiceType(initialTypeKey);
  const initialBikeId = resolveInitialBikeId(bikes, initialContext?.bikeId);
  const [bikeId, setBikeId] = useState(initialBikeId);
  const [slotKey, setSlotKey] = useState<BikeSlotKey | ''>(
    initialContext?.slotKey ?? ''
  );
  const [partInstanceId, setPartInstanceId] = useState(
    initialContext?.partInstanceId ?? ''
  );
  const [typeKey, setTypeKey] = useState<GearServiceTypeKey>(initialTypeKey);
  const [dateIso, setDateIso] = useState(() => todayIso());
  const [mileageMi, setMileageMi] = useState(
    currentMileageMi === null ? '' : String(Math.round(currentMileageMi))
  );
  const [intervalMi, setIntervalMi] = useState(
    initialPreset.defaultIntervalMi === undefined
      ? ''
      : String(initialPreset.defaultIntervalMi)
  );
  const [intervalDays, setIntervalDays] = useState(
    initialPreset.defaultIntervalDays === undefined
      ? ''
      : String(initialPreset.defaultIntervalDays)
  );
  const [materialsNote, setMaterialsNote] = useState('');
  const [notes, setNotes] = useState('');
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
      const instance = instances.find(
        (candidate) => candidate.id === record.partInstanceId
      );
      if (!instance) return null;
      return {
        value: instance.id,
        label: partTitle(instance, catalog),
      };
    })
    .filter((option): option is { value: string; label: string } => option !== null);
  const selectedPartInstanceId = partOptions.some(
    (option) => option.value === partInstanceId
  )
    ? partInstanceId
    : '';

  const handleBikeChange = (nextBikeId: string) => {
    const nextBike = bikes.find((bike) => bike.id === nextBikeId) ?? null;
    setBikeId(nextBikeId);
    setSlotKey('');
    setPartInstanceId('');
    setMileageMi(
      nextBike?.cachedOdometerMi === null || nextBike?.cachedOdometerMi === undefined
        ? ''
        : String(Math.round(nextBike.cachedOdometerMi))
    );
  };

  const handleTypeChange = (nextTypeKey: GearServiceTypeKey) => {
    const preset = getGearServiceType(nextTypeKey);
    setTypeKey(nextTypeKey);
    setIntervalMi(
      preset.defaultIntervalMi === undefined ? '' : String(preset.defaultIntervalMi)
    );
    setIntervalDays(
      preset.defaultIntervalDays === undefined
        ? ''
        : String(preset.defaultIntervalDays)
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
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

    onSave(draft);
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader
        title="Log gear service"
        description="Add mileage, timing, and materials for a service event."
        onClose={onClose}
      />

      <DialogContent>
      <Select
        label="Service type"
        value={typeKey}
        onChange={(event) =>
          handleTypeChange(event.target.value as GearServiceTypeKey)
        }
        options={GEAR_SERVICE_TYPES.map((service) => ({
          value: service.key,
          label: service.label,
        }))}
      />

      <Select
        label="Bike"
        value={bikeId}
        onChange={(event) => handleBikeChange(event.target.value)}
        disabled={bikes.length === 0}
        options={
          bikes.length === 0
            ? [{ value: '', label: 'No bikes yet' }]
            : bikes.map((bike) => ({ value: bike.id, label: bike.name }))
        }
      />
      {errors.bikeId ? (
        <p className="text-sm text-error-700">{errors.bikeId}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Slot"
          value={slotKey}
          onChange={(event) => {
            setSlotKey(event.target.value as BikeSlotKey | '');
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
          onChange={(event) => setPartInstanceId(event.target.value)}
          options={[
            { value: '', label: 'No specific part' },
            ...partOptions,
          ]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Date"
          type="date"
          max={todayIso()}
          value={dateIso}
          onChange={(event) => setDateIso(event.target.value)}
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
          onChange={(event) => setMileageMi(event.target.value)}
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
          onChange={(event) => setIntervalMi(event.target.value)}
          error={errors.intervalMi}
        />
        <Input
          label="Interval days"
          type="number"
          min="1"
          step="1"
          placeholder="Optional"
          value={intervalDays}
          onChange={(event) => setIntervalDays(event.target.value)}
          error={errors.intervalDays}
        />
      </div>

      <Input
        label="Materials"
        placeholder="Wax, sealant, pads, torque notes"
        value={materialsNote}
        onChange={(event) => setMaterialsNote(event.target.value)}
      />

      <Input
        label="Notes"
        placeholder="Optional notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />

      {errors.typeKey ? (
        <p className="text-sm text-error-700">{errors.typeKey}</p>
      ) : null}
      </DialogContent>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={bikes.length === 0}>
          Save service
        </Button>
      </DialogFooter>
    </form>
  );
}
