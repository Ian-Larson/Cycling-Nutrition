import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Card, CardContent } from '@/components/ui';
import { getBikeSlot, getGearServiceType } from '@/lib/gear/constants';
import { useStore } from '@/store';
import type {
  Bike,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
  GearServiceEvent,
} from '@/types/gear';

interface GearHistoryTableProps {
  events: GearServiceEvent[];
  installRecords: GearInstallRecord[];
  bikes: Bike[];
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  onEditEvent?: (eventId: string) => void;
}

type RowKind = 'Service' | 'Install' | 'Remove';

interface HistoryRow {
  id: string;
  kind: RowKind;
  dateIso: string;
  sortTime: number;
  item: string;
  bike: string;
  part: string | null;
  mileageMi: number | null;
  notes: string[];
  eventId?: string;
}

type SortColumn = 'date' | 'kind' | 'item' | 'bike' | 'mileage';
type SortDirection = 'asc' | 'desc';

function formatDate(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

function formatMi(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value).toLocaleString()} mi`;
}

function partLabel(
  partInstanceId: string | undefined,
  instances: GearPartInstance[],
  catalog: GearPartCatalogItem[]
): string | null {
  if (!partInstanceId) return null;
  const instance = instances.find((c) => c.id === partInstanceId);
  const item = instance
    ? catalog.find((c) => c.id === instance.catalogItemId)
    : null;
  if (instance?.label) return instance.label;
  if (item) return [item.brand, item.model].filter(Boolean).join(' ') || item.model;
  return partInstanceId;
}

function buildRows(
  events: GearServiceEvent[],
  installRecords: GearInstallRecord[],
  bikes: Bike[],
  catalog: GearPartCatalogItem[],
  instances: GearPartInstance[]
): HistoryRow[] {
  const bikeName = (id: string) =>
    bikes.find((b) => b.id === id)?.name ?? 'Unknown bike';

  const serviceRows: HistoryRow[] = events.map((event) => ({
    id: `service:${event.id}`,
    kind: 'Service',
    dateIso: event.dateIso,
    sortTime: event.createdAt,
    item: getGearServiceType(event.typeKey).label,
    bike: bikeName(event.bikeId),
    part:
      partLabel(event.partInstanceId, instances, catalog) ??
      (event.slotKey ? getBikeSlot(event.slotKey).label : null),
    mileageMi: event.mileageMi ?? null,
    notes: [
      event.materialsNote ? `Materials: ${event.materialsNote}` : null,
      event.notes ? `Notes: ${event.notes}` : null,
    ].filter((v): v is string => v !== null),
    eventId: event.id,
  }));

  const installRows: HistoryRow[] = installRecords.map((record) => ({
    id: `install:${record.id}`,
    kind: 'Install',
    dateIso: record.installedDateIso,
    sortTime: record.createdAt,
    item: getBikeSlot(record.slotKey).label,
    bike: bikeName(record.bikeId),
    part: partLabel(record.partInstanceId, instances, catalog),
    mileageMi: record.installedAtMileageMi,
    notes: [],
  }));

  const removeRows: HistoryRow[] = installRecords.flatMap((record) => {
    if (!record.removedDateIso || record.removedAtMileageMi === undefined) {
      return [];
    }
    return [
      {
        id: `remove:${record.id}`,
        kind: 'Remove',
        dateIso: record.removedDateIso,
        sortTime: record.updatedAt,
        item: getBikeSlot(record.slotKey).label,
        bike: bikeName(record.bikeId),
        part: partLabel(record.partInstanceId, instances, catalog),
        mileageMi: record.removedAtMileageMi,
        notes: record.removeReason ? [`Reason: ${record.removeReason}`] : [],
      },
    ];
  });

  return [...serviceRows, ...installRows, ...removeRows];
}

function compareBy(column: SortColumn, a: HistoryRow, b: HistoryRow): number {
  if (column === 'date') {
    if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso);
    return a.sortTime - b.sortTime;
  }
  if (column === 'kind') return a.kind.localeCompare(b.kind);
  if (column === 'item') return a.item.localeCompare(b.item);
  if (column === 'bike') return a.bike.localeCompare(b.bike);
  if (column === 'mileage') {
    const av = a.mileageMi ?? Number.NEGATIVE_INFINITY;
    const bv = b.mileageMi ?? Number.NEGATIVE_INFINITY;
    return av - bv;
  }
  return 0;
}

export function GearHistoryTable({
  events,
  installRecords,
  bikes,
  catalog,
  instances,
  onEditEvent,
}: GearHistoryTableProps) {
  const deleteGearServiceEvent = useStore((s) => s.deleteGearServiceEvent);
  const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection }>({
    column: 'date',
    direction: 'desc',
  });

  const rows = useMemo(
    () => buildRows(events, installRecords, bikes, catalog, instances),
    [events, installRecords, bikes, catalog, instances]
  );
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const cmp = compareBy(sort.column, a, b);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort]);

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-5 md:py-6">
          <p className="text-sm leading-5 text-ink-600">
            No gear service history yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleHeaderClick = (column: SortColumn) => {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: column === 'date' || column === 'mileage' ? 'desc' : 'asc' }
    );
  };

  const handleDelete = (eventId: string) => {
    const confirmed = window.confirm(
      'Delete this service event? This cannot be undone.'
    );
    if (!confirmed) return;
    deleteGearServiceEvent(eventId);
  };

  const sortIndicator = (column: SortColumn) =>
    sort.column === column ? (sort.direction === 'asc' ? '▲' : '▼') : '';

  const ariaSortFor = (column: SortColumn): 'ascending' | 'descending' | 'none' =>
    sort.column === column
      ? sort.direction === 'asc'
        ? 'ascending'
        : 'descending'
      : 'none';

  const headerButton = (column: SortColumn, label: string, align: 'left' | 'right' = 'left') => (
    <button
      type="button"
      onClick={() => handleHeaderClick(column)}
      className={clsx(
        'flex w-full items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-wide text-ink-600 hover:text-ink-900',
        align === 'right' ? 'justify-end' : 'justify-start'
      )}
    >
      <span>{label}</span>
      <span aria-hidden className="text-[0.6rem] text-ink-500">
        {sortIndicator(column)}
      </span>
    </button>
  );

  return (
    <div className="surface-note overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead className="bg-shell-50">
          <tr>
            <th scope="col" aria-sort={ariaSortFor('date')} className="px-3 py-2 text-left">
              {headerButton('date', 'Date')}
            </th>
            <th scope="col" aria-sort={ariaSortFor('kind')} className="px-3 py-2 text-left">
              {headerButton('kind', 'Type')}
            </th>
            <th scope="col" aria-sort={ariaSortFor('item')} className="px-3 py-2 text-left">
              {headerButton('item', 'Item')}
            </th>
            <th scope="col" aria-sort={ariaSortFor('bike')} className="px-3 py-2 text-left">
              {headerButton('bike', 'Bike')}
            </th>
            <th scope="col" aria-sort={ariaSortFor('mileage')} className="px-3 py-2 text-right">
              {headerButton('mileage', 'Mileage', 'right')}
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => (
            <tr
              key={row.id}
              className={clsx(
                'align-top',
                index % 2 === 1 ? 'bg-white' : 'bg-ink-50'
              )}
            >
              <td className="whitespace-nowrap px-3 py-2 text-ink-700 tabular-nums">
                {formatDate(row.dateIso)}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <span
                  className={clsx(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    row.kind === 'Service' && 'bg-brand-100 text-brand-900',
                    row.kind === 'Install' && 'bg-emerald-100 text-emerald-800',
                    row.kind === 'Remove' && 'bg-amber-100 text-amber-800'
                  )}
                >
                  {row.kind}
                </span>
              </td>
              <td className="px-3 py-2 text-ink-900">
                <div className="font-medium">{row.item}</div>
                {row.part ? (
                  <div className="text-xs text-ink-600">{row.part}</div>
                ) : null}
                {row.notes.map((note) => (
                  <div key={note} className="text-xs text-ink-500">
                    {note}
                  </div>
                ))}
              </td>
              <td className="px-3 py-2 text-ink-700">{row.bike}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right text-ink-700 tabular-nums">
                {formatMi(row.mileageMi)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                {row.eventId ? (
                  <div className="flex justify-end gap-1">
                    {onEditEvent ? (
                      <button
                        type="button"
                        onClick={() => onEditEvent(row.eventId as string)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-ink-700 hover:bg-shell-100"
                        aria-label="Edit service event"
                      >
                        Edit
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleDelete(row.eventId as string)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      aria-label="Delete service event"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
