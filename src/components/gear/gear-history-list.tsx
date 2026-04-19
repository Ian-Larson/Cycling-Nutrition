import { Card, CardContent } from '@/components/ui';
import { getBikeSlot, getGearServiceType } from '@/lib/gear/constants';
import type {
  Bike,
  GearInstallRecord,
  GearPartCatalogItem,
  GearPartInstance,
  GearServiceEvent,
} from '@/types/gear';

interface GearHistoryListProps {
  events: GearServiceEvent[];
  installRecords: GearInstallRecord[];
  bikes: Bike[];
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
}

interface HistoryRow {
  id: string;
  kind: 'Service' | 'Install' | 'Remove';
  dateIso: string;
  sortTime: number;
  title: string;
  context: string;
  details: string[];
  notes: string[];
}

function formatDate(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00`);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMi(value: number): string {
  return `${Math.round(value).toLocaleString()} mi`;
}

function compareRows(a: HistoryRow, b: HistoryRow): number {
  if (a.dateIso !== b.dateIso) return a.dateIso > b.dateIso ? -1 : 1;
  if (a.sortTime !== b.sortTime) return b.sortTime - a.sortTime;
  return b.id.localeCompare(a.id);
}

function partLabel(
  partInstanceId: string | undefined,
  instances: GearPartInstance[],
  catalog: GearPartCatalogItem[]
): string | null {
  if (!partInstanceId) return null;

  const instance = instances.find(
    (candidate) => candidate.id === partInstanceId
  );
  const item = instance
    ? catalog.find((candidate) => candidate.id === instance.catalogItemId)
    : null;

  if (instance?.label) return instance.label;
  if (item) return [item.brand, item.model].filter(Boolean).join(' ') || item.model;
  return partInstanceId;
}

function detailParts(event: GearServiceEvent): string[] {
  return [
    event.mileageMi !== undefined ? `Mileage ${formatMi(event.mileageMi)}` : null,
    event.intervalMi !== undefined ? `Interval ${formatMi(event.intervalMi)}` : null,
    event.intervalDays !== undefined
      ? `Interval ${event.intervalDays.toLocaleString()} days`
      : null,
    event.nextDueMileageMi !== undefined
      ? `Next mileage ${formatMi(event.nextDueMileageMi)}`
      : null,
    event.nextDueDateIso ? `Next date ${formatDate(event.nextDueDateIso)}` : null,
  ].filter((part): part is string => part !== null);
}

export function GearHistoryList({
  events,
  installRecords,
  bikes,
  catalog,
  instances,
}: GearHistoryListProps) {
  if (events.length === 0 && installRecords.length === 0) {
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

  const bikeName = (id: string) =>
    bikes.find((bike) => bike.id === id)?.name ?? 'Unknown bike';
  const serviceRows: HistoryRow[] = events.map((event) => {
    const slot = event.slotKey ? getBikeSlot(event.slotKey).label : null;
    const part = partLabel(event.partInstanceId, instances, catalog);
    return {
      id: `service:${event.id}`,
      kind: 'Service',
      dateIso: event.dateIso,
      sortTime: event.createdAt,
      title: getGearServiceType(event.typeKey).label,
      context: [bikeName(event.bikeId), slot, part].filter(Boolean).join(' - '),
      details: detailParts(event),
      notes: [
        event.materialsNote ? `Materials: ${event.materialsNote}` : null,
        event.notes ? `Notes: ${event.notes}` : null,
      ].filter((note): note is string => note !== null),
    };
  });
  const installRows: HistoryRow[] = installRecords.map((record) => {
    const slot = getBikeSlot(record.slotKey).label;
    const part = partLabel(record.partInstanceId, instances, catalog);
    return {
      id: `install:${record.id}`,
      kind: 'Install',
      dateIso: record.installedDateIso,
      sortTime: record.createdAt,
      title: slot,
      context: [bikeName(record.bikeId), part].filter(Boolean).join(' - '),
      details: [`Installed at ${formatMi(record.installedAtMileageMi)}`],
      notes: [],
    };
  });
  const removeRows: HistoryRow[] = installRecords.flatMap((record) => {
    if (!record.removedDateIso || record.removedAtMileageMi === undefined) {
      return [];
    }

    const slot = getBikeSlot(record.slotKey).label;
    const part = partLabel(record.partInstanceId, instances, catalog);
    return [
      {
        id: `remove:${record.id}`,
        kind: 'Remove',
        dateIso: record.removedDateIso,
        sortTime: record.updatedAt,
        title: slot,
        context: [bikeName(record.bikeId), part].filter(Boolean).join(' - '),
        details: [
          `Removed at ${formatMi(record.removedAtMileageMi)}`,
          record.removeReason ? `Reason ${record.removeReason}` : null,
        ].filter((detail): detail is string => detail !== null),
        notes: [],
      },
    ];
  });
  const rows = [...serviceRows, ...installRows, ...removeRows].sort(compareRows);

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <Card key={row.id}>
          <CardContent className="space-y-2 py-3.5 md:py-4">
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-6 text-ink-900">
                  {row.kind} - {row.title}
                </p>
                <p className="truncate text-sm leading-5 text-ink-600">
                  {formatDate(row.dateIso)}
                  {row.context ? ` - ${row.context}` : ''}
                </p>
              </div>
            </div>

            {row.details.length > 0 ? (
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm leading-5 text-ink-700">
                {row.details.map((detail) => (
                  <span key={detail}>{detail}</span>
                ))}
              </div>
            ) : null}

            {row.notes.map((note) => (
              <p key={note} className="text-sm leading-5 text-ink-600">
                {note}
              </p>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
