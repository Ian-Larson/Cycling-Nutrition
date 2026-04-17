import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import { clsx } from 'clsx';
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, Input, Select } from '@/components/ui';
import { useStore } from '@/store';
import { SERVICE_TYPES, getServiceType } from '@/lib/gear/service-types';
import {
  validateServiceEntryDraft,
  type ValidationErrors,
} from '@/lib/gear/validate-service-entry';
import type { Bike, ServiceEntry, ServiceTypeKey } from '@/types/gear';
import type { StravaBike } from '@/lib/gear/strava-gear';

interface LogServiceSheetProps {
  open: boolean;
  onClose: () => void;
  bikes: Bike[];
  entries: ServiceEntry[];
  preselectedTypeKey?: ServiceTypeKey;
  preselectedBikeId?: string;
  stravaBikes: StravaBike[] | null;
  onRefreshStrava: () => void;
  isStravaRefreshing: boolean;
  stravaLastSyncedAt: number | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatSyncedAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'synced just now';
  if (diffMin < 60) return `synced ${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `synced ${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `synced ${diffDay}d ago`;
}

function resolveInitialBikeId(
  bikes: Bike[],
  preselected: string | undefined
): string {
  if (preselected && bikes.some((b) => b.id === preselected)) return preselected;
  const primary = bikes.find((b) => b.isPrimary);
  if (primary) return primary.id;
  return bikes[0]?.id ?? '';
}

export function LogServiceSheet(props: LogServiceSheetProps) {
  const { open, onClose } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
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
        'w-full max-w-none m-0 mt-auto rounded-t-2xl bg-white p-4 shadow-xl',
        'md:m-auto md:max-w-md md:rounded-2xl md:p-6',
        'backdrop:bg-black/40 backdrop:backdrop-blur-sm'
      )}
    >
      {open ? <LogServiceForm {...props} /> : null}
    </dialog>
  );
}

function LogServiceForm({
  onClose,
  bikes,
  entries,
  preselectedTypeKey,
  preselectedBikeId,
  stravaBikes,
  onRefreshStrava,
  isStravaRefreshing,
  stravaLastSyncedAt,
}: LogServiceSheetProps) {
  const addServiceEntry = useStore((s) => s.addServiceEntry);
  const bikeSelectId = useId();
  const dateInputId = useId();
  const mileageInputId = useId();
  const intervalInputId = useId();

  const initialTypeKey: ServiceTypeKey = preselectedTypeKey ?? 'chain_wax';
  const initialBikeId = resolveInitialBikeId(bikes, preselectedBikeId);
  const initialBike = bikes.find((b) => b.id === initialBikeId);
  const initialMileage =
    initialBike && initialBike.cachedOdometerMi != null
      ? Math.round(initialBike.cachedOdometerMi)
      : '';

  const [typeKey, setTypeKey] = useState<ServiceTypeKey>(initialTypeKey);
  const [bikeId, setBikeId] = useState<string>(initialBikeId);
  const [dateIso, setDateIso] = useState<string>(() => todayIso());
  const [mileageMi, setMileageMi] = useState<number | ''>(initialMileage);
  const [intervalMi, setIntervalMi] = useState<number | ''>(
    getServiceType(initialTypeKey).defaultIntervalMi
  );
  const [errors, setErrors] = useState<ValidationErrors>({});
  // Track whether the user has typed their own mileage so refresh doesn't clobber it.
  const [mileageDirty, setMileageDirty] = useState(false);
  const [seenSync, setSeenSync] = useState<number | null>(stravaLastSyncedAt);

  // When a fresh Strava sync lands, patch the mileage field unless the user
  // has already typed their own value. (Derived-state-from-props pattern.)
  if (stravaLastSyncedAt !== seenSync) {
    setSeenSync(stravaLastSyncedAt);
    if (!mileageDirty) {
      const selectedBike = bikes.find((b) => b.id === bikeId);
      if (selectedBike?.stravaGearId) {
        const match = stravaBikes?.find(
          (sb) => sb.stravaGearId === selectedBike.stravaGearId
        );
        if (match) {
          const next = Math.round(match.odometerMi);
          if (next !== mileageMi) {
            setMileageMi(next);
          }
        }
      }
    }
  }

  const selectedBike = bikes.find((b) => b.id === bikeId) ?? null;
  const nextServiceMi =
    typeof mileageMi === 'number' && typeof intervalMi === 'number'
      ? mileageMi + intervalMi
      : null;

  const handleChipClick = (key: ServiceTypeKey) => {
    setTypeKey(key);
    setIntervalMi(getServiceType(key).defaultIntervalMi);
  };

  const handleBikeChange = (nextId: string) => {
    setBikeId(nextId);
    if (!mileageDirty) {
      const nextBike = bikes.find((b) => b.id === nextId);
      setMileageMi(
        nextBike && nextBike.cachedOdometerMi != null
          ? Math.round(nextBike.cachedOdometerMi)
          : ''
      );
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const draft = {
      bikeId,
      typeKey,
      dateIso,
      mileageMi: typeof mileageMi === 'number' ? mileageMi : Number.NaN,
      intervalMi: typeof intervalMi === 'number' ? intervalMi : Number.NaN,
    };
    const nextErrors = validateServiceEntryDraft(draft, entries, new Date());
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    addServiceEntry(draft);
    onClose();
  };

  const hasErrors = Object.keys(errors).length > 0;
  const canRefresh = Boolean(selectedBike?.stravaGearId);
  const syncedLabel = stravaLastSyncedAt ? formatSyncedAgo(stravaLastSyncedAt) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink-900">
          Log service
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Close"
        >
          <span aria-hidden>×</span>
        </Button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink-700">Service</p>
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_TYPES.map((preset) => {
            const active = preset.key === typeKey;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => handleChipClick(preset.key)}
                aria-pressed={active}
                className={clsx(
                  'min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-brand-500 bg-brand-100 text-brand-900'
                    : 'border-[color:var(--border-soft)] bg-white text-ink-900 hover:bg-shell-50'
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Select
          id={bikeSelectId}
          label="Bike"
          value={bikeId}
          onChange={(e) => handleBikeChange(e.target.value)}
          disabled={bikes.length === 0}
          options={
            bikes.length === 0
              ? [{ value: '', label: 'No bikes yet — add one first' }]
              : bikes.map((b) => ({ value: b.id, label: b.name }))
          }
        />
        {errors.bikeId ? (
          <p className="mt-1 text-sm text-rose-700">{errors.bikeId}</p>
        ) : null}
      </div>

      <div>
        <Input
          id={dateInputId}
          label="Date"
          type="date"
          value={dateIso}
          max={todayIso()}
          onChange={(e) => setDateIso(e.target.value)}
        />
        {errors.dateIso ? (
          <p className="mt-1 text-sm text-rose-700">{errors.dateIso}</p>
        ) : null}
      </div>

      <div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              id={mileageInputId}
              label="Mileage (mi)"
              type="number"
              step="1"
              min="0"
              inputMode="numeric"
              value={mileageMi === '' ? '' : String(mileageMi)}
              onChange={(e) => {
                const raw = e.target.value;
                setMileageDirty(true);
                if (raw === '') {
                  setMileageMi('');
                  return;
                }
                const n = Number(raw);
                setMileageMi(Number.isFinite(n) ? n : '');
              }}
              error={errors.mileageMi}
            />
          </div>
          <button
            type="button"
            onClick={onRefreshStrava}
            disabled={!canRefresh || isStravaRefreshing}
            aria-label="Refresh mileage from Strava"
            title="Refresh from Strava"
            className={clsx(
              'mb-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border-soft)] bg-white text-ink-700 transition-colors md:h-10 md:w-10',
              'hover:bg-shell-50 disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <span
              aria-hidden
              className={clsx('text-base leading-none', isStravaRefreshing && 'animate-spin')}
            >
              ↻
            </span>
          </button>
        </div>
        {!canRefresh ? (
          <p className="mt-1 text-xs text-ink-500">
            Manual bike — no Strava odometer
          </p>
        ) : syncedLabel ? (
          <p className="mt-1 text-xs text-ink-500">{syncedLabel}</p>
        ) : null}
      </div>

      <Collapsible>
        <CollapsibleTrigger className="text-sm font-medium text-ink-700">
          Advanced
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <Input
            id={intervalInputId}
            label="Interval (mi)"
            type="number"
            step="1"
            min="1"
            inputMode="numeric"
            value={intervalMi === '' ? '' : String(intervalMi)}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                setIntervalMi('');
                return;
              }
              const n = Number(raw);
              setIntervalMi(Number.isFinite(n) ? n : '');
            }}
            error={errors.intervalMi}
          />
        </CollapsibleContent>
      </Collapsible>

      <p className="text-sm text-ink-600">
        {nextServiceMi != null
          ? `Next service at ${nextServiceMi.toLocaleString()} mi`
          : 'Next service at — mi'}
      </p>

      <Button
        type="submit"
        variant="primary"
        size="md"
        className="w-full"
        disabled={hasErrors || bikes.length === 0}
      >
        Save service
      </Button>
    </form>
  );
}
