import { Button, Card, CardContent } from '@/components/ui';
import {
  GEAR_PART_CATEGORIES,
  getGearPartCategory,
} from '@/lib/gear/constants';
import type {
  Bike,
  GearInstallRecord,
  GearPartAttributes,
  GearPartCatalogItem,
  GearPartInstance,
  GearPartInstanceStatus,
} from '@/types/gear';

interface GearInventoryProps {
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  installRecords: GearInstallRecord[];
  bikes: Bike[];
  onAddInstance: () => void;
  onAddCatalog: () => void;
}

const STATUS_ORDER: GearPartInstanceStatus[] = [
  'spare',
  'installed',
  'removed',
  'retired',
];

const STATUS_LABELS: Record<GearPartInstanceStatus, string> = {
  spare: 'Spare',
  installed: 'Installed',
  removed: 'Removed',
  retired: 'Retired',
};

const STATUS_CLASSES: Record<GearPartInstanceStatus, string> = {
  spare: 'bg-brand-100 text-brand-800',
  installed: 'bg-emerald-100 text-emerald-800',
  removed: 'bg-amber-100 text-amber-800',
  retired: 'bg-shell-200 text-ink-600',
};

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
    return [
      attributes.range,
      attributes.speedCount && `${attributes.speedCount}-speed`,
    ]
      .filter(Boolean)
      .join(' - ');
  }

  return [
    attributes.toothCount && `${attributes.toothCount}T`,
    attributes.position,
    attributes.mount,
  ]
    .filter(Boolean)
    .join(' - ');
}

function catalogTitle(item: GearPartCatalogItem): string {
  return [item.brand, item.model].filter(Boolean).join(' ') || item.model;
}

function instanceLabel(
  instance: GearPartInstance,
  catalogItem: GearPartCatalogItem | undefined
): string {
  if (instance.label) return instance.label;
  if (catalogItem) return catalogTitle(catalogItem);
  return 'Physical part';
}

function installedBikeName(
  instance: GearPartInstance,
  installRecords: GearInstallRecord[],
  bikes: Bike[]
): string | null {
  if (instance.status !== 'installed') return null;
  const active = installRecords.find(
    (record) =>
      record.partInstanceId === instance.id && record.removedDateIso === undefined
  );
  if (!active) return null;
  const bike = bikes.find((b) => b.id === active.bikeId);
  return bike?.name ?? null;
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function GearInventory({
  catalog,
  instances,
  installRecords,
  bikes,
  onAddInstance,
  onAddCatalog,
}: GearInventoryProps) {
  const catalogById = new Map(catalog.map((item) => [item.id, item]));
  const summaryCounts = STATUS_ORDER.map((status) => ({
    status,
    count: instances.filter((instance) => instance.status === status).length,
  }));
  const categoryGroups = GEAR_PART_CATEGORIES.map((category) => {
    const matchingCatalogIds = new Set(
      catalog
        .filter((item) => item.category === category.key)
        .map((item) => item.id)
    );
    const groupInstances = instances.filter((instance) =>
      matchingCatalogIds.has(instance.catalogItemId)
    );
    const sorted = [...groupInstances].sort((a, b) => {
      const statusDiff =
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      if (statusDiff !== 0) return statusDiff;
      return b.createdAt - a.createdAt;
    });
    return { category, instances: sorted };
  }).filter((group) => group.instances.length > 0);

  const needsCatalog = catalog.length === 0;
  const isEmpty = instances.length === 0;

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-7 text-ink-900">
            Inventory
          </h2>
          <p className="max-w-2xl text-sm leading-5 text-ink-600">
            Physical parts you own, ready to pair with a bike.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            size="sm"
            onClick={onAddInstance}
            disabled={needsCatalog}
            className="w-full whitespace-nowrap sm:w-auto"
          >
            Add inventory part
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="surface-note px-3 py-2.5">
          <p className="section-kicker text-[0.66rem] text-ink-500">Total</p>
          <p className="mt-1 text-xl font-semibold leading-7 text-ink-900">
            {instances.length}
          </p>
          <p className="text-sm leading-5 text-ink-600">
            {pluralize(instances.length, 'part', 'parts')}
          </p>
        </div>
        {summaryCounts.map(({ status, count }) => (
          <div key={status} className="surface-note px-3 py-2.5">
            <p className="section-kicker text-[0.66rem] text-ink-500">
              {STATUS_LABELS[status]}
            </p>
            <p className="mt-1 text-xl font-semibold leading-7 text-ink-900">
              {count}
            </p>
          </div>
        ))}
      </div>

      {needsCatalog ? (
        <Card>
          <CardContent className="space-y-3 py-5 md:py-6">
            <p className="text-sm leading-5 text-ink-600">
              Add a catalog part first so you can track physical parts against
              a reusable spec.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onAddCatalog}
              className="w-full sm:w-auto"
            >
              Add catalog part
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!needsCatalog && isEmpty ? (
        <Card>
          <CardContent className="space-y-3 py-5 md:py-6">
            <p className="text-sm leading-5 text-ink-600">
              No parts in inventory yet. Add one so you can install it on a
              bike.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={onAddInstance}
              className="w-full sm:w-auto"
            >
              Add inventory part
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {categoryGroups.length > 0 ? (
        <div className="space-y-4">
          {categoryGroups.map((group) => (
            <section key={group.category.key} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="section-kicker text-[0.66rem] text-ink-500">
                  {getGearPartCategory(group.category.key).label}
                </p>
                <p className="text-xs text-ink-500">
                  {pluralize(group.instances.length, 'part', 'parts')}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {group.instances.map((instance) => {
                  const catalogItem = catalogById.get(instance.catalogItemId);
                  const acquiredDate = formatDate(instance.acquiredDateIso);
                  const retiredDate = formatDate(instance.retiredDateIso);
                  const bikeName = installedBikeName(
                    instance,
                    installRecords,
                    bikes
                  );
                  const attributes = catalogItem
                    ? formatAttributes(catalogItem.attributes)
                    : null;

                  return (
                    <Card key={instance.id}>
                      <CardContent className="space-y-2.5 py-3.5 md:py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-base font-semibold leading-6 text-ink-900">
                              {instanceLabel(instance, catalogItem)}
                            </p>
                            {catalogItem ? (
                              <p className="text-sm leading-5 text-ink-600">
                                {catalogTitle(catalogItem)}
                              </p>
                            ) : (
                              <p className="text-sm leading-5 text-rose-700">
                                Catalog part unavailable
                              </p>
                            )}
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[instance.status]}`}
                          >
                            {STATUS_LABELS[instance.status]}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-[color:var(--border-soft)] pt-2 text-sm leading-5 text-ink-600">
                          {attributes ? <span>{attributes}</span> : null}
                          {catalogItem?.weightGrams ? (
                            <span>{catalogItem.weightGrams} g</span>
                          ) : null}
                          {bikeName ? <span>on {bikeName}</span> : null}
                          {acquiredDate ? (
                            <span>acquired {acquiredDate}</span>
                          ) : null}
                          {retiredDate ? (
                            <span>retired {retiredDate}</span>
                          ) : null}
                        </div>

                        {instance.notes ? (
                          <p className="line-clamp-2 text-sm leading-5 text-ink-600">
                            {instance.notes}
                          </p>
                        ) : null}
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
