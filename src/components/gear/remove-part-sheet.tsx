import { useState, type FormEvent } from 'react';
import { clsx } from 'clsx';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Input,
  Select,
} from '@/components/ui';
import { validateRemoveDraft } from '@/lib/gear/lifecycle';
import type {
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
} from '@/types/gear';

interface RemovePartSheetProps {
  open: boolean;
  onClose: () => void;
  installRecord: GearInstallRecord | null;
  instance: GearPartInstance | null;
  catalogItem: GearPartCatalogItem | null;
  currentMileageMi: number | null;
  onRemove: (input: {
    installRecordId: string;
    removedAtMileageMi: number;
    removedDateIso: string;
    removeReason?: GearInstallRecord['removeReason'];
    nextStatus: 'removed' | 'retired';
  }) => void;
}

type FormErrors = Record<string, string>;
type RemoveStatus = 'removed' | 'retired';

const REMOVE_REASONS: Array<{
  value: '' | NonNullable<GearInstallRecord['removeReason']>;
  label: string;
}> = [
  { value: '', label: 'No reason' },
  { value: 'swapped', label: 'Swapped' },
  { value: 'worn', label: 'Worn' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'sold', label: 'Sold' },
  { value: 'other', label: 'Other' },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function partTitle(
  instance: GearPartInstance | null,
  catalogItem: GearPartCatalogItem | null
): string {
  if (instance?.label) return instance.label;
  if (catalogItem) {
    return [catalogItem.brand, catalogItem.model].filter(Boolean).join(' ') ||
      catalogItem.model;
  }
  return 'Installed part';
}

export function RemovePartSheet(props: RemovePartSheetProps) {
  const { open, onClose } = props;
  return (
    <Dialog open={open} onClose={onClose} size="md">
      <RemovePartForm {...props} />
    </Dialog>
  );
}

function RemovePartForm({
  onClose,
  installRecord,
  instance,
  catalogItem,
  currentMileageMi,
  onRemove,
}: RemovePartSheetProps) {
  const [removedAtMileageMi, setRemovedAtMileageMi] = useState(
    currentMileageMi === null
      ? String(installRecord?.installedAtMileageMi ?? '')
      : String(Math.round(currentMileageMi))
  );
  const [removedDateIso, setRemovedDateIso] = useState(() => todayIso());
  const [nextStatus, setNextStatus] = useState<RemoveStatus>('removed');
  const [removeReason, setRemoveReason] =
    useState<'' | NonNullable<GearInstallRecord['removeReason']>>('');
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const mileage = Number(removedAtMileageMi);
    const draft = {
      installRecordId: installRecord?.id,
      removedAtMileageMi:
        removedAtMileageMi.trim() === '' ? Number.NaN : mileage,
      removedDateIso,
      removeReason: removeReason || undefined,
      nextStatus,
    };
    const nextErrors = validateRemoveDraft(draft, installRecord, todayIso());
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!installRecord) return;

    onRemove({
      installRecordId: installRecord.id,
      removedAtMileageMi: mileage,
      removedDateIso,
      removeReason: removeReason || undefined,
      nextStatus,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader
        title="Remove part"
        description={partTitle(instance, catalogItem)}
        onClose={onClose}
      />

      <DialogContent>
        <div className="grid gap-2">
          <button
            type="button"
            aria-pressed={nextStatus === 'removed'}
            onClick={() => setNextStatus('removed')}
            className={clsx(
              'min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
              nextStatus === 'removed'
                ? 'border-brand-500 bg-brand-100 text-brand-900'
                : 'border-[color:var(--border-soft)] bg-white text-ink-900 hover:bg-shell-50'
            )}
          >
            Remove and keep for later
          </button>
          <button
            type="button"
            aria-pressed={nextStatus === 'retired'}
            onClick={() => setNextStatus('retired')}
            className={clsx(
              'min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100',
              nextStatus === 'retired'
                ? 'border-brand-500 bg-brand-100 text-brand-900'
                : 'border-[color:var(--border-soft)] bg-white text-ink-900 hover:bg-shell-50'
            )}
          >
            Retire permanently
          </button>
          {errors.nextStatus ? (
            <p className="text-sm text-error-700">{errors.nextStatus}</p>
          ) : null}
        </div>

        <Input
          label="Removal mileage"
          type="number"
          min="0"
          step="1"
          value={removedAtMileageMi}
          onChange={(event) => setRemovedAtMileageMi(event.target.value)}
          error={errors.removedAtMileageMi}
        />

        <Input
          label="Removal date"
          type="date"
          max={todayIso()}
          value={removedDateIso}
          onChange={(event) => setRemovedDateIso(event.target.value)}
          error={errors.removedDateIso}
        />

        <Select
          label="Reason"
          value={removeReason}
          onChange={(event) =>
            setRemoveReason(
              event.target.value as '' | NonNullable<GearInstallRecord['removeReason']>
            )
          }
          options={REMOVE_REASONS}
        />

        {errors.installRecordId || errors.activeRecord ? (
          <p className="text-sm text-error-700">
            {errors.installRecordId ?? errors.activeRecord}
          </p>
        ) : null}
      </DialogContent>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!installRecord}>
          Save removal
        </Button>
      </DialogFooter>
    </form>
  );
}
