import { clsx } from 'clsx';
import { Button, Card, CardContent } from '@/components/ui';
import type { ActiveSetupRow } from '@/lib/gear/derive-active-setup';
import type { BikeSlotKey } from '@/types/gear';

interface ActiveSetupListProps {
  rows: ActiveSetupRow[];
  onInstall: (slotKey: BikeSlotKey) => void;
  onRemove: (row: ActiveSetupRow) => void;
  onService: (row: ActiveSetupRow) => void;
}

function formatDate(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00`);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMi(value: number | null): string {
  if (value === null) return 'Mileage unavailable';
  return `${Math.max(0, Math.round(value)).toLocaleString()} mi since install`;
}

function partName(row: ActiveSetupRow): string {
  if (row.instance?.label) return row.instance.label;
  if (row.catalogItem?.model) return row.catalogItem.model;
  return 'Installed part';
}

function partMeta(row: ActiveSetupRow): string {
  const parts = [
    row.catalogItem?.brand,
    row.catalogItem?.model,
    row.instance?.status,
  ].filter(Boolean);
  return parts.join(' - ') || 'Part details unavailable';
}

function urgencyLabel(urgency: ActiveSetupRow['urgency']): string {
  if (urgency === 'overdue') return 'Overdue';
  if (urgency === 'soon') return 'Due soon';
  if (urgency === 'ok') return 'On track';
  return 'No schedule';
}

function urgencyClass(urgency: ActiveSetupRow['urgency']): string {
  if (urgency === 'overdue') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (urgency === 'soon') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (urgency === 'ok') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return 'border-[color:var(--border-soft)] bg-shell-50 text-ink-600';
}

export function ActiveSetupList({
  rows,
  onInstall,
  onRemove,
  onService,
}: ActiveSetupListProps) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const isInstalled = row.installRecord !== null;
        const latestService = row.latestService
          ? formatDate(row.latestService.dateIso)
          : 'No service logged';

        return (
          <Card key={row.slotKey}>
            <CardContent className="py-3.5 md:py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="min-w-0 max-w-full truncate text-base font-semibold leading-6 text-ink-900">
                      {row.slotLabel}
                    </p>
                    <span
                      className={clsx(
                        'shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold',
                        urgencyClass(row.urgency)
                      )}
                    >
                      {urgencyLabel(row.urgency)}
                    </span>
                  </div>

                  {isInstalled ? (
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium leading-5 text-ink-900">
                        {partName(row)}
                      </p>
                      <p className="truncate text-sm leading-5 text-ink-600">
                        {partMeta(row)}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm leading-5 text-ink-600">
                        <span>{formatMi(row.milesSinceInstall)}</span>
                        <span>Latest service: {latestService}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-5 text-ink-600">
                      Empty slot. Install a part when the install sheet is ready.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:w-[9.5rem]">
                  {isInstalled ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onService(row)}
                        className="w-full"
                      >
                        Log service
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(row)}
                        className="w-full"
                      >
                        Remove
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onInstall(row.slotKey)}
                      className="w-full"
                    >
                      Install part
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
