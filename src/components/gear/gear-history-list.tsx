import { Card, CardContent } from '@/components/ui';
import { getBikeSlot, getGearServiceType } from '@/lib/gear/constants';
import type {
  Bike,
  GearPartCatalogItem,
  GearPartInstance,
  GearServiceEvent,
} from '@/types/gear';

interface GearHistoryListProps {
  events: GearServiceEvent[];
  bikes: Bike[];
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
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

function compareEvents(a: GearServiceEvent, b: GearServiceEvent): number {
  if (a.dateIso !== b.dateIso) return a.dateIso > b.dateIso ? -1 : 1;
  if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
  return b.id.localeCompare(a.id);
}

function partLabel(
  event: GearServiceEvent,
  instances: GearPartInstance[],
  catalog: GearPartCatalogItem[]
): string | null {
  if (!event.partInstanceId) return null;

  const instance = instances.find(
    (candidate) => candidate.id === event.partInstanceId
  );
  const item = instance
    ? catalog.find((candidate) => candidate.id === instance.catalogItemId)
    : null;

  if (instance?.label) return instance.label;
  if (item) return [item.brand, item.model].filter(Boolean).join(' ') || item.model;
  return event.partInstanceId;
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
  bikes,
  catalog,
  instances,
}: GearHistoryListProps) {
  if (events.length === 0) {
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
  const sortedEvents = [...events].sort(compareEvents);

  return (
    <div className="flex flex-col gap-3">
      {sortedEvents.map((event) => {
        const slot = event.slotKey ? getBikeSlot(event.slotKey).label : null;
        const part = partLabel(event, instances, catalog);
        const context = [slot, part].filter(Boolean).join(' - ');
        const details = detailParts(event);

        return (
          <Card key={event.id}>
            <CardContent className="space-y-2 py-3.5 md:py-4">
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold leading-6 text-ink-900">
                    {getGearServiceType(event.typeKey).label}
                  </p>
                  <p className="truncate text-sm leading-5 text-ink-600">
                    {formatDate(event.dateIso)} - {bikeName(event.bikeId)}
                    {context ? ` - ${context}` : ''}
                  </p>
                </div>
              </div>

              {details.length > 0 ? (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm leading-5 text-ink-700">
                  {details.map((detail) => (
                    <span key={detail}>{detail}</span>
                  ))}
                </div>
              ) : null}

              {event.materialsNote ? (
                <p className="text-sm leading-5 text-ink-600">
                  Materials: {event.materialsNote}
                </p>
              ) : null}

              {event.notes ? (
                <p className="text-sm leading-5 text-ink-600">
                  Notes: {event.notes}
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
