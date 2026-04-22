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
  return (
    <Dialog open={open} onClose={onClose} size="md">
      <InstallPartForm {...props} />
    </Dialog>
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
    <form onSubmit={handleSubmit}>
      <DialogHeader
        title="Install part"
        description={
          slotKey ? `Choose a compatible part for ${slotLabel}.` : 'Choose a bike slot first.'
        }
        onClose={onClose}
      />

      <DialogContent>
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
            <p className="text-sm text-error-700">{errors.partInstanceId}</p>
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
          <p className="text-sm text-error-700">
            {errors.bikeId ?? errors.slotKey}
          </p>
        ) : null}
      </DialogContent>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!bikeId || !slotKey || candidates.length === 0}
        >
          Install part
        </Button>
      </DialogFooter>
    </form>
  );
}
