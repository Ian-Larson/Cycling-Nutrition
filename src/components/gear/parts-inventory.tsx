import { Card, CardContent } from '@/components/ui';
import { getGearPartCategory } from '@/lib/gear/constants';
import type {
  GearPartAttributes,
  GearPartCatalogItem,
  GearPartInstance,
  GearPartInstanceStatus,
} from '@/types/gear';

interface PartsInventoryProps {
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
}

const STATUS_ORDER: GearPartInstanceStatus[] = [
  'installed',
  'spare',
  'removed',
  'retired',
];

function formatStatus(status: GearPartInstanceStatus): string {
  return status.replace('_', ' ');
}

function formatDate(dateIso?: string): string | null {
  if (!dateIso) return null;
  const date = new Date(`${dateIso}T00:00:00`);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAttributes(attributes: GearPartAttributes): string {
  if (attributes.category === 'chain') {
    return attributes.speedCount ? `${attributes.speedCount}-speed` : 'Chain';
  }

  if (attributes.category === 'tire') {
    return [
      `${attributes.widthMm} mm`,
      attributes.diameter,
      attributes.tubelessReady ? 'tubeless ready' : null,
    ]
      .filter(Boolean)
      .join(' - ');
  }

  if (attributes.category === 'brake_pad') {
    return [attributes.compound, attributes.padShape].filter(Boolean).join(' - ');
  }

  if (attributes.category === 'cassette') {
    return [attributes.range, attributes.speedCount && `${attributes.speedCount}-speed`]
      .filter(Boolean)
      .join(' - ');
  }

  return [attributes.toothCount && `${attributes.toothCount}T`, attributes.position, attributes.mount]
    .filter(Boolean)
    .join(' - ');
}

function itemTitle(item: GearPartCatalogItem): string {
  return [item.brand, item.model].filter(Boolean).join(' ') || item.model;
}

function instanceLabel(instance: GearPartInstance): string {
  return instance.label || instance.id;
}

function statusCounts(instances: GearPartInstance[]): string {
  if (instances.length === 0) return '0 physical parts';

  return STATUS_ORDER.map((status) => {
    const count = instances.filter((instance) => instance.status === status).length;
    return count > 0 ? `${count} ${formatStatus(status)}` : null;
  })
    .filter(Boolean)
    .join(' - ');
}

export function PartsInventory({ catalog, instances }: PartsInventoryProps) {
  if (catalog.length === 0 && instances.length === 0) {
    return (
      <Card>
        <CardContent className="py-5 md:py-6">
          <p className="text-sm leading-5 text-ink-600">
            No gear parts in inventory yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const catalogById = new Map(catalog.map((item) => [item.id, item]));
  const orphanInstances = instances.filter(
    (instance) => !catalogById.has(instance.catalogItemId)
  );

  return (
    <div className="flex flex-col gap-3">
      {catalog.map((item) => {
        const itemInstances = instances.filter(
          (instance) => instance.catalogItemId === item.id
        );
        const category = getGearPartCategory(item.category).label;
        const attributes = formatAttributes(item.attributes);

        return (
          <Card key={item.id}>
            <CardContent className="space-y-3 py-3.5 md:py-4">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-6 text-ink-900">
                  {itemTitle(item)}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm leading-5 text-ink-600">
                  <span>{category}</span>
                  {item.weightGrams ? <span>{item.weightGrams} g</span> : null}
                  {attributes ? <span>{attributes}</span> : null}
                </div>
                {item.notes ? (
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink-600">
                    {item.notes}
                  </p>
                ) : null}
              </div>

              <div className="border-t border-[color:var(--border-soft)] pt-3">
                <p className="section-kicker text-[0.66rem] text-ink-500">
                  {statusCounts(itemInstances)}
                </p>

                {itemInstances.length > 0 ? (
                  <div className="mt-2 grid gap-2">
                    {itemInstances.map((instance) => {
                      const acquiredDate = formatDate(instance.acquiredDateIso);
                      const retiredDate = formatDate(instance.retiredDateIso);

                      return (
                        <div
                          key={instance.id}
                          className="flex min-w-0 flex-col gap-1 rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <p className="min-w-0 truncate text-sm font-medium leading-5 text-ink-900">
                            {instanceLabel(instance)}
                          </p>
                          <p className="shrink-0 text-sm leading-5 text-ink-600">
                            {formatStatus(instance.status)}
                            {acquiredDate ? ` - acquired ${acquiredDate}` : ''}
                            {retiredDate ? ` - retired ${retiredDate}` : ''}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-5 text-ink-600">
                    No physical instances logged for this catalog item.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {orphanInstances.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 py-3.5 md:py-4">
            <div>
              <p className="text-base font-semibold leading-6 text-ink-900">
                Unmatched physical parts
              </p>
              <p className="text-sm leading-5 text-ink-600">
                These instances reference catalog items that are not available.
              </p>
            </div>
            <div className="grid gap-2">
              {orphanInstances.map((instance) => (
                <div
                  key={instance.id}
                  className="flex min-w-0 flex-col gap-1 rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="min-w-0 truncate text-sm font-medium leading-5 text-ink-900">
                    {instanceLabel(instance)}
                  </p>
                  <p className="shrink-0 text-sm leading-5 text-ink-600">
                    {formatStatus(instance.status)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
