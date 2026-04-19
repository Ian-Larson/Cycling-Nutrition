import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import { clsx } from 'clsx';
import { Button, Input, Select } from '@/components/ui';
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
      {open ? <RemovePartForm {...props} /> : null}
    </dialog>
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            Remove part
          </h2>
          <p className="text-sm leading-5 text-ink-600">
            {partTitle(instance, catalogItem)}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          aria-pressed={nextStatus === 'removed'}
          onClick={() => setNextStatus('removed')}
          className={clsx(
            'min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors',
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
            nextStatus === 'retired'
              ? 'border-brand-500 bg-brand-100 text-brand-900'
              : 'border-[color:var(--border-soft)] bg-white text-ink-900 hover:bg-shell-50'
          )}
        >
          Retire permanently
        </button>
        {errors.nextStatus ? (
          <p className="text-sm text-rose-700">{errors.nextStatus}</p>
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
        <p className="text-sm text-rose-700">
          {errors.installRecordId ?? errors.activeRecord}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={!installRecord}>
        Save removal
      </Button>
    </form>
  );
}
