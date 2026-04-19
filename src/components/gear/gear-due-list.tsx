import { clsx } from 'clsx';
import { Button, Card, CardContent } from '@/components/ui';
import { GearLifeBar } from './gear-life-bar';
import type { GearDueItem } from '@/lib/gear/derive-gear-due';
import type { Bike } from '@/types/gear';

interface GearDueListProps {
  items: GearDueItem[];
  bikes: Bike[];
  onLogService: (item: GearDueItem) => void;
}

function formatMi(value: number | null): string {
  if (value === null) return 'Mileage unavailable';
  const abs = Math.abs(Math.round(value)).toLocaleString();
  if (value < 0) return `${abs} mi overdue`;
  if (value === 0) return 'Due now by mileage';
  return `${abs} mi remaining`;
}

function formatDays(value: number | null): string {
  if (value === null) return 'Date unavailable';
  const abs = Math.abs(Math.round(value)).toLocaleString();
  if (value < 0) return `${abs} days overdue`;
  if (value === 0) return 'Due today';
  return `${abs} days remaining`;
}

function urgencyLabel(urgency: GearDueItem['urgency']): string {
  if (urgency === 'overdue') return 'Overdue';
  if (urgency === 'soon') return 'Due soon';
  if (urgency === 'ok') return 'On track';
  return 'Unscheduled';
}

function urgencyClass(urgency: GearDueItem['urgency']): string {
  if (urgency === 'overdue') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (urgency === 'soon') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (urgency === 'ok') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return 'border-[color:var(--border-soft)] bg-shell-50 text-ink-600';
}

export function GearDueList({ items, bikes, onLogService }: GearDueListProps) {
  const bikeName = (item: GearDueItem) =>
    item.bike?.name ??
    bikes.find((bike) => bike.id === item.bikeId)?.name ??
    'Unknown bike';

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-5 md:py-6">
          <p className="text-sm leading-5 text-ink-600">
            Nothing is due. Logged gear service with a next due mileage or date
            will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="py-3.5 md:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="min-w-0 max-w-full truncate text-base font-semibold leading-6 text-ink-900">
                    {item.label}
                  </p>
                  <span
                    className={clsx(
                      'shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold',
                      urgencyClass(item.urgency)
                    )}
                  >
                    {urgencyLabel(item.urgency)}
                  </span>
                </div>
                <p className="truncate text-sm leading-5 text-ink-600">
                  {bikeName(item)}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm leading-5 text-ink-700">
                  <span>{formatMi(item.remainingMi)}</span>
                  <span>{formatDays(item.remainingDays)}</span>
                </div>
                <GearLifeBar
                  remainingMi={item.remainingMi}
                  remainingDays={item.remainingDays}
                  intervalMi={item.intervalMi}
                  intervalDays={item.intervalDays}
                  nextDueMileageMi={item.event.nextDueMileageMi}
                  nextDueDateIso={item.event.nextDueDateIso}
                  lastServiceMileageMi={item.event.mileageMi}
                  lastServiceDateIso={item.event.dateIso}
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onLogService(item)}
                className="sm:w-[9.5rem]"
              >
                Log service
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
