import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { GearDueRow } from './gear-due-list';
import { GearHistoryTable } from './gear-history-table';
import { getBikeSlot, getGearServiceType } from '@/lib/gear/constants';
import type { GearDueItem } from '@/lib/gear/derive-gear-due';
import type {
  Bike,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
  GearServiceEvent,
} from '@/types/gear';

interface ServiceTimelineProps {
  dueItems: GearDueItem[];
  events: GearServiceEvent[];
  installRecords: GearInstallRecord[];
  bikes: Bike[];
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  /** True when "All bikes" is selected; appends bike name to each row. */
  showBikeName: boolean;
  onLogService: (item: GearDueItem) => void;
  onEditEvent: (eventId: string) => void;
}

const RECENT_DEFAULT_COUNT = 3;

function formatRelative(dateIso: string, now: Date = new Date()): string {
  const target = new Date(`${dateIso}T00:00:00`);
  if (!Number.isFinite(target.getTime())) return dateIso;
  const diffDays = Math.round((now.getTime() - target.getTime()) / 86_400_000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.round(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.round(diffDays / 30.44)} mo ago`;
  return `${Math.round(diffDays / 365.25)}y ago`;
}

function partOrSlotLabel(
  event: GearServiceEvent,
  instances: GearPartInstance[],
  catalog: GearPartCatalogItem[]
): string | null {
  if (event.partInstanceId) {
    const instance = instances.find((c) => c.id === event.partInstanceId);
    if (instance?.label) return instance.label;
    const item = instance
      ? catalog.find((c) => c.id === instance.catalogItemId)
      : null;
    if (item) {
      const brandModel = [item.brand, item.model].filter(Boolean).join(' ');
      if (brandModel) return brandModel;
    }
  }
  if (event.slotKey) return getBikeSlot(event.slotKey).label;
  return null;
}

function totalHistoryRowCount(
  events: GearServiceEvent[],
  installRecords: GearInstallRecord[]
): number {
  const removalCount = installRecords.filter(
    (record) =>
      record.removedDateIso !== undefined &&
      record.removedAtMileageMi !== undefined
  ).length;
  return events.length + installRecords.length + removalCount;
}

interface RecentRowProps {
  event: GearServiceEvent;
  bikes: Bike[];
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  showBikeName: boolean;
  onEditEvent: (eventId: string) => void;
}

function RecentRow({
  event,
  bikes,
  catalog,
  instances,
  showBikeName,
  onEditEvent,
}: RecentRowProps) {
  const typeLabel = getGearServiceType(event.typeKey).label;
  const target = partOrSlotLabel(event, instances, catalog);
  const bike = bikes.find((b) => b.id === event.bikeId) ?? null;
  const mileage =
    event.mileageMi != null
      ? `${Math.round(event.mileageMi).toLocaleString()} mi`
      : null;

  return (
    <button
      type="button"
      onClick={() => onEditEvent(event.id)}
      aria-label={`Edit ${typeLabel}${target ? ` on ${target}` : ''}, ${formatRelative(event.dateIso)}`}
      className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-shell-50 focus:outline-none focus-visible:bg-shell-50 md:px-4 md:py-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium leading-5 text-ink-900">
            {typeLabel}
          </span>
          {target ? (
            <span className="truncate text-xs leading-5 text-ink-600">
              {target}
            </span>
          ) : null}
        </div>
        {showBikeName && bike ? (
          <p className="mt-0.5 truncate text-xs leading-5 text-ink-500">
            {bike.name}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium leading-5 text-ink-700 tabular-nums">
          {formatRelative(event.dateIso)}
        </p>
        {mileage ? (
          <p className="text-[0.68rem] leading-4 text-ink-500 tabular-nums">
            {mileage}
          </p>
        ) : null}
      </div>
    </button>
  );
}

export function ServiceTimeline({
  dueItems,
  events,
  installRecords,
  bikes,
  catalog,
  instances,
  showBikeName,
  onLogService,
  onEditEvent,
}: ServiceTimelineProps) {
  const [showAll, setShowAll] = useState(false);

  const recentEvents = useMemo(() => {
    const copy = [...events];
    copy.sort((a, b) => {
      if (a.dateIso !== b.dateIso) return a.dateIso > b.dateIso ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
    return copy;
  }, [events]);

  const recentPreview = recentEvents.slice(0, RECENT_DEFAULT_COUNT);
  const fullHistoryCount = totalHistoryRowCount(events, installRecords);
  const hasMoreInTable = fullHistoryCount > recentPreview.length;

  const comingUpEmpty = dueItems.length === 0;
  const recentEmpty = recentEvents.length === 0;

  if (comingUpEmpty && recentEmpty) {
    return (
      <p className="text-sm leading-5 text-ink-600">
        No service yet.
      </p>
    );
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <section aria-labelledby="service-coming-up" className="space-y-3">
        <h3
          id="service-coming-up"
          className="section-kicker text-[0.68rem] text-ink-700"
        >
          Coming up
        </h3>
        {comingUpEmpty ? (
          <p className="text-sm leading-5 text-ink-600">
            Nothing scheduled.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--border-soft)] border-y border-[color:var(--border-soft)]">
            {dueItems.map((item) => (
              <li key={item.id}>
                <GearDueRow
                  item={item}
                  bikes={bikes}
                  showBikeName={showBikeName}
                  onLogService={onLogService}
                  variant="plain"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div
        role="presentation"
        className="border-t border-[color:var(--border-soft)]"
      />

      <section aria-labelledby="service-recently-done" className="space-y-3">
        <h3
          id="service-recently-done"
          className="section-kicker text-[0.68rem] text-ink-700"
        >
          Recently done
        </h3>

        {recentEmpty ? (
          <p className="text-sm leading-5 text-ink-600">
            No recent service.
          </p>
        ) : showAll ? (
          <GearHistoryTable
            events={events}
            installRecords={installRecords}
            bikes={bikes}
            catalog={catalog}
            instances={instances}
            onEditEvent={onEditEvent}
          />
        ) : (
          <ul
            className={clsx(
              'overflow-hidden border-y border-[color:var(--border-soft)]',
              'divide-y divide-[color:var(--border-soft)]'
            )}
          >
            {recentPreview.map((event) => (
              <li key={event.id}>
                <RecentRow
                  event={event}
                  bikes={bikes}
                  catalog={catalog}
                  instances={instances}
                  showBikeName={showBikeName}
                  onEditEvent={onEditEvent}
                />
              </li>
            ))}
          </ul>
        )}

        {!recentEmpty && (hasMoreInTable || showAll) ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              aria-expanded={showAll}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
            >
              {showAll
                ? 'Show recent only'
                : `Show all ${fullHistoryCount} entries`}
              <span aria-hidden>{showAll ? '↑' : '→'}</span>
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
