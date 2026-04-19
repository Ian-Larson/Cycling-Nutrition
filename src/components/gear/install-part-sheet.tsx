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
  getBikeSlot,
  getGearPartCategory,
  isPartCategoryCompatibleWithSlot,
} from '@/lib/gear/constants';
import { validateInstallDraft } from '@/lib/gear/lifecycle';
import type {
  BikeSlotKey,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
} from '@/types/gear';

interface InstallPartSheetProps {
  open: boolean;
  onClose: () => void;
  bikeId: string | null;
  slotKey: BikeSlotKey | null;
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  installRecords: GearInstallRecord[];
  currentMileageMi: number | null;
  onInstall: (input: {
    bikeId: string;
    partInstanceId: string;
    slotKey: BikeSlotKey;
    installedAtMileageMi: number;
    installedDateIso: string;
  }) => void;
}

type FormErrors = Record<string, string>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isActiveInstall(record: GearInstallRecord): boolean {
  return record.removedAtMileageMi === undefined && record.removedDateIso === undefined;
}

function partTitle(
  instance: GearPartInstance,
  catalog: readonly GearPartCatalogItem[]
): string {
  const item = catalog.find((candidate) => candidate.id === instance.catalogItemId);
  const title = [
    instance.label,
    item ? [item.brand, item.model].filter(Boolean).join(' ') || item.model : null,
  ].filter(Boolean);
  return title.join(' - ') || instance.id;
}

function isInstallCandidate(
  instance: GearPartInstance,
  slotKey: BikeSlotKey | null,
  catalog: readonly GearPartCatalogItem[],
  installRecords: readonly GearInstallRecord[]
): boolean {
  if (instance.status === 'retired') return false;
  if (!slotKey) return false;
  const item = catalog.find((candidate) => candidate.id === instance.catalogItemId);
  if (!item || !isPartCategoryCompatibleWithSlot(item.category, slotKey)) return false;
  return !installRecords.some(
    (record) =>
      record.partInstanceId === instance.id &&
      isActiveInstall(record)
  );
}

export function InstallPartSheet(props: InstallPartSheetProps) {
  const { open, onClose } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={clsx(
        'm-0 mt-auto w-full max-w-none rounded-t-2xl bg-white p-4 shadow-xl',
        'md:m-auto md:max-w-md md:rounded-2xl md:p-6',
        'backdrop:bg-black/40 backdrop:backdrop-blur-sm'
      )}
    >
      {open ? <InstallPartForm {...props} /> : null}
    </dialog>
  );
}

function InstallPartForm({
  onClose,
  bikeId,
  slotKey,
  catalog,
  instances,
  installRecords,
  currentMileageMi,
  onInstall,
}: InstallPartSheetProps) {
  const [partInstanceId, setPartInstanceId] = useState('');
  const [installedAtMileageMi, setInstalledAtMileageMi] = useState(
    currentMileageMi === null ? '' : String(Math.round(currentMileageMi))
  );
  const [installedDateIso, setInstalledDateIso] = useState(() => todayIso());
  const [errors, setErrors] = useState<FormErrors>({});

  const candidates = instances.filter((instance) =>
    isInstallCandidate(instance, slotKey, catalog, installRecords)
  );
  const selectedPartInstanceId = candidates.some(
    (instance) => instance.id === partInstanceId
  )
    ? partInstanceId
    : candidates[0]?.id ?? '';
  const slotLabel = slotKey ? getBikeSlot(slotKey).label : 'slot';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const mileage = Number(installedAtMileageMi);
    const draft = {
      bikeId,
      partInstanceId: selectedPartInstanceId,
      slotKey,
      installedAtMileageMi:
        installedAtMileageMi.trim() === '' ? Number.NaN : mileage,
      installedDateIso,
    };
    const nextErrors = validateInstallDraft(draft, todayIso());
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!bikeId || !slotKey || !selectedPartInstanceId) return;

    onInstall({
      bikeId,
      partInstanceId: selectedPartInstanceId,
      slotKey,
      installedAtMileageMi: mileage,
      installedDateIso,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            Install part
          </h2>
          <p className="text-sm leading-5 text-ink-600">
            {slotKey ? `Choose a compatible part for ${slotLabel}.` : 'Choose a bike slot first.'}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="space-y-2">
        <Select
          label="Part"
          value={selectedPartInstanceId}
          disabled={candidates.length === 0}
          onChange={(event) => setPartInstanceId(event.target.value)}
          options={
            candidates.length === 0
              ? [{ value: '', label: 'No compatible spare or removed parts' }]
              : candidates.map((instance) => {
                  const item = catalog.find(
                    (candidate) => candidate.id === instance.catalogItemId
                  );
                  return {
                    value: instance.id,
                    label: item
                      ? `${partTitle(instance, catalog)} - ${getGearPartCategory(item.category).label}`
                      : partTitle(instance, catalog),
                  };
                })
          }
        />
        {errors.partInstanceId ? (
          <p className="text-sm text-rose-700">{errors.partInstanceId}</p>
        ) : null}
      </div>

      <Input
        label="Install mileage"
        type="number"
        min="0"
        step="1"
        value={installedAtMileageMi}
        onChange={(event) => setInstalledAtMileageMi(event.target.value)}
        error={errors.installedAtMileageMi}
      />

      <Input
        label="Install date"
        type="date"
        max={todayIso()}
        value={installedDateIso}
        onChange={(event) => setInstalledDateIso(event.target.value)}
        error={errors.installedDateIso}
      />

      {errors.bikeId || errors.slotKey ? (
        <p className="text-sm text-rose-700">
          {errors.bikeId ?? errors.slotKey}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={!bikeId || !slotKey || candidates.length === 0}
      >
        Install part
      </Button>
    </form>
  );
}
