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

interface GearDueRowProps {
  item: GearDueItem;
  bikes: Bike[];
  showBikeName?: boolean;
  onLogService: (item: GearDueItem) => void;
}

function formatMi(value: number | null, intervalMi: number | null): string {
  if (value === null) {
    return intervalMi === null ? 'No mileage schedule' : 'Odometer not set';
  }
  const abs = Math.abs(Math.round(value)).toLocaleString();
  if (value < 0) return `${abs} mi overdue`;
  if (value === 0) return 'Due now by mileage';
  return `${abs} mi remaining`;
}

function formatDays(value: number | null, intervalDays: number | null): string {
  if (value === null) {
    return intervalDays === null ? 'No time schedule' : 'Date unavailable';
  }
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
  if (urgency === 'overdue') return 'border-error-200 bg-error-50 text-error-700';
  if (urgency === 'soon') return 'border-warning-200 bg-warning-50 text-warning-700';
  if (urgency === 'ok') return 'border-success-200 bg-success-50 text-success-700';
  return 'border-[color:var(--border-soft)] bg-shell-50 text-ink-600';
}

function UrgencyIcon({ urgency }: { urgency: GearDueItem['urgency'] }) {
  if (urgency === 'overdue' || urgency === 'soon') {
    return (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-3 w-3">
        <path
          d="M8 1.75 14.5 13.5h-13L8 1.75Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M8 6.5v3.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="8" cy="11.5" r="0.85" fill="currentColor" />
      </svg>
    );
  }
  if (urgency === 'ok') {
    return (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-3 w-3">
        <path
          d="m3.25 8.5 3 3L12.5 5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return null;
}

function resolveBikeName(item: GearDueItem, bikes: Bike[]): string {
  return (
    item.bike?.name ??
    bikes.find((bike) => bike.id === item.bikeId)?.name ??
    'Unknown bike'
  );
}

export function GearDueRow({
  item,
  bikes,
  showBikeName = true,
  onLogService,
}: GearDueRowProps) {
  return (
    <Card>
      <CardContent className="py-3.5 md:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="min-w-0 max-w-full truncate text-base font-semibold leading-6 text-ink-900">
                {item.label}
              </p>
              <span
                className={clsx(
                  'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
                  urgencyClass(item.urgency)
                )}
              >
                <UrgencyIcon urgency={item.urgency} />
                <span aria-hidden>{urgencyLabel(item.urgency)}</span>
                <span className="sr-only">
                  Service status: {urgencyLabel(item.urgency)}
                </span>
              </span>
            </div>
            {showBikeName ? (
              <p className="truncate text-sm leading-5 text-ink-600">
                {resolveBikeName(item, bikes)}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm leading-5 text-ink-700">
              <span>{formatMi(item.remainingMi, item.intervalMi)}</span>
              <span>{formatDays(item.remainingDays, item.intervalDays)}</span>
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
  );
}

export function GearDueList({ items, bikes, onLogService }: GearDueListProps) {
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
        <GearDueRow
          key={item.id}
          item={item}
          bikes={bikes}
          onLogService={onLogService}
        />
      ))}
    </div>
  );
}
