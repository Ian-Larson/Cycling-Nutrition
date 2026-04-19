import { Button, Card, CardContent } from '@/components/ui';
import {
  GEAR_PART_CATEGORIES,
  getGearPartCategory,
} from '@/lib/gear/constants';
import type {
  GearPartAttributes,
  GearPartCatalogItem,
  GearPartInstance,
  GearPartInstanceStatus,
} from '@/types/gear';

interface PartsInventoryProps {
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  onAddCatalog: () => void;
}

const STATUS_ORDER: GearPartInstanceStatus[] = [
  'spare',
  'installed',
  'removed',
  'retired',
];

function formatStatus(status: GearPartInstanceStatus): string {
  return status.replace('_', ' ');
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

function statusCounts(instances: GearPartInstance[]): string {
  if (instances.length === 0) return '0 physical parts';

  return STATUS_ORDER.map((status) => {
    const count = instances.filter((instance) => instance.status === status).length;
    return count > 0 ? `${count} ${formatStatus(status)}` : null;
  })
    .filter(Boolean)
    .join(' - ');
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function PartsInventory({
  catalog,
  instances,
  onAddCatalog,
}: PartsInventoryProps) {
  const catalogGroups = GEAR_PART_CATEGORIES.map((category) => ({
    category,
    items: catalog.filter((item) => item.category === category.key),
  })).filter((group) => group.items.length > 0);
  const isEmpty = catalog.length === 0;

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-7 text-ink-900">
            Parts catalog
          </h2>
          <p className="max-w-2xl text-sm leading-5 text-ink-600">
            Reusable part specs you can use when logging physical parts.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            size="sm"
            onClick={onAddCatalog}
            className="w-full whitespace-nowrap sm:w-auto"
          >
            Add catalog part
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="surface-note px-3 py-2.5">
          <p className="section-kicker text-[0.66rem] text-ink-500">Catalog</p>
          <p className="mt-1 text-xl font-semibold leading-7 text-ink-900">
            {catalog.length}
          </p>
          <p className="text-sm leading-5 text-ink-600">
            {pluralize(catalog.length, 'part type', 'part types')}
          </p>
        </div>
        <div className="surface-note px-3 py-2.5">
          <p className="section-kicker text-[0.66rem] text-ink-500">
            Physical parts
          </p>
          <p className="mt-1 text-xl font-semibold leading-7 text-ink-900">
            {instances.length}
          </p>
          <p className="text-sm leading-5 text-ink-600">
            tracked in Inventory
          </p>
        </div>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="space-y-3 py-5 md:py-6">
            <p className="text-sm leading-5 text-ink-600">
              No catalog parts yet. Add a reusable spec to start tracking
              physical parts.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={onAddCatalog}
              className="w-full sm:w-auto"
            >
              Add catalog part
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {catalogGroups.length > 0 ? (
        <div className="space-y-4">
          {catalogGroups.map((group) => (
            <section key={group.category.key} className="space-y-2">
              <p className="section-kicker text-[0.66rem] text-ink-500">
                {group.category.label}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map((item) => {
                  const itemInstances = instances.filter(
                    (instance) => instance.catalogItemId === item.id
                  );
                  const attributes = formatAttributes(item.attributes);

                  return (
                    <Card key={item.id}>
                      <CardContent className="space-y-2.5 py-3.5 md:py-4">
                        <div className="min-w-0">
                          <p className="break-words text-base font-semibold leading-6 text-ink-900">
                            {itemTitle(item)}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm leading-5 text-ink-600">
                            <span>
                              {getGearPartCategory(item.category).label}
                            </span>
                            {typeof item.weightGrams === 'number' ? (
                              <span>{item.weightGrams} g</span>
                            ) : null}
                            {attributes ? <span>{attributes}</span> : null}
                          </div>
                          {item.notes ? (
                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink-600">
                              {item.notes}
                            </p>
                          ) : null}
                        </div>
                        <p className="section-kicker border-t border-[color:var(--border-soft)] pt-2 text-[0.66rem] text-ink-500">
                          {statusCounts(itemInstances)}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
