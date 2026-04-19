import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Card, CardContent } from '@/components/ui';
import {
  GEAR_PART_CATEGORIES,
  getGearPartCategory,
} from '@/lib/gear/constants';
import { computePartLifetimeMileage } from '@/lib/gear/part-mileage';
import type {
  Bike,
  GearInstallRecord,
  GearPartAttributes,
  GearPartCatalogItem,
  GearPartCategory,
  GearPartInstance,
  GearPartInstanceStatus,
} from '@/types/gear';
import { useStore } from '@/store';
import { OverflowMenu } from './overflow-menu';

interface GearInventoryProps {
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  installRecords: GearInstallRecord[];
  bikes: Bike[];
  onEdit: (instanceId: string) => void;
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
  });
}

function formatMileage(miles: number): string {
  const rounded = Math.round(miles);
  return `${rounded.toLocaleString('en-US')} mi`;
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

function findActiveInstall(
  instance: GearPartInstance,
  installRecords: GearInstallRecord[]
): GearInstallRecord | null {
  if (instance.status !== 'installed') return null;
  return (
    installRecords.find(
      (record) =>
        record.partInstanceId === instance.id &&
        record.removedDateIso === undefined
    ) ?? null
  );
}

function findLatestRemoval(
  instance: GearPartInstance,
  installRecords: GearInstallRecord[]
): GearInstallRecord | null {
  let latest: GearInstallRecord | null = null;
  for (const record of installRecords) {
    if (record.partInstanceId !== instance.id) continue;
    if (!record.removedDateIso) continue;
    if (!latest || record.removedDateIso > latest.removedDateIso!) {
      latest = record;
    }
  }
  return latest;
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

interface ChipRowProps<T extends string> {
  label: string;
  options: Array<{ value: T; label: string; count: number }>;
  selected: ReadonlySet<T>;
  onToggle: (value: T) => void;
  onClear: () => void;
}

function ChipRow<T extends string>({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: ChipRowProps<T>) {
  if (options.length === 0) return null;
  const allSelected = selected.size === 0;
  return (
    <div className="space-y-1">
      <p className="section-kicker text-[0.66rem] text-ink-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onClear}
          className={clsx(
            'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
            allSelected
              ? 'bg-brand-100 text-brand-900'
              : 'bg-shell-100 text-ink-700 hover:bg-shell-200'
          )}
        >
          All
        </button>
        {options.map((option) => {
          const active = selected.has(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={clsx(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                active
                  ? 'bg-brand-100 text-brand-900'
                  : 'bg-shell-100 text-ink-700 hover:bg-shell-200'
              )}
            >
              {option.label}
              <span className="ml-1 text-[0.66rem] text-ink-500">
                {option.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GearInventory({
  catalog,
  instances,
  installRecords,
  bikes,
  onEdit,
}: GearInventoryProps) {
  const deleteGearPartInstance = useStore((s) => s.deleteGearPartInstance);
  const [categoryFilter, setCategoryFilter] = useState<
    ReadonlySet<GearPartCategory>
  >(new Set());
  const [statusFilter, setStatusFilter] = useState<
    ReadonlySet<GearPartInstanceStatus>
  >(new Set());

  const catalogById = useMemo(
    () => new Map(catalog.map((item) => [item.id, item])),
    [catalog]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<GearPartCategory, number>();
    for (const instance of instances) {
      const catalogItem = catalogById.get(instance.catalogItemId);
      if (!catalogItem) continue;
      counts.set(
        catalogItem.category,
        (counts.get(catalogItem.category) ?? 0) + 1
      );
    }
    return counts;
  }, [instances, catalogById]);

  const statusCounts = useMemo(() => {
    const counts = new Map<GearPartInstanceStatus, number>();
    for (const instance of instances) {
      counts.set(instance.status, (counts.get(instance.status) ?? 0) + 1);
    }
    return counts;
  }, [instances]);

  const summaryCounts = STATUS_ORDER.map((status) => ({
    status,
    count: statusCounts.get(status) ?? 0,
  }));

  const filtered = useMemo(() => {
    return instances.filter((instance) => {
      const catalogItem = catalogById.get(instance.catalogItemId);
      if (categoryFilter.size > 0) {
        if (!catalogItem) return false;
        if (!categoryFilter.has(catalogItem.category)) return false;
      }
      if (statusFilter.size > 0 && !statusFilter.has(instance.status)) {
        return false;
      }
      return true;
    });
  }, [instances, categoryFilter, statusFilter, catalogById]);

  const categoryGroups = GEAR_PART_CATEGORIES.map((category) => {
    const matchingCatalogIds = new Set(
      catalog
        .filter((item) => item.category === category.key)
        .map((item) => item.id)
    );
    const groupInstances = filtered.filter((instance) =>
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

  const handleDelete = (instance: GearPartInstance) => {
    const label = instanceLabel(instance, catalogById.get(instance.catalogItemId));
    const confirmed = window.confirm(
      `Delete "${label}"? This removes the part from inventory.`
    );
    if (!confirmed) return;
    try {
      deleteGearPartInstance(instance.id);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not delete this part.';
      window.alert(message);
    }
  };

  const toggleCategory = (value: GearPartCategory) => {
    setCategoryFilter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const toggleStatus = (value: GearPartInstanceStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const isEmpty = instances.length === 0;

  return (
    <div className="space-y-4 md:space-y-5">
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

      {isEmpty ? (
        <Card>
          <CardContent className="space-y-3 py-5 md:py-6">
            <p className="text-sm leading-5 text-ink-600">
              No parts in inventory yet. Tap <strong>+ Add part</strong> to
              track one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            <ChipRow
              label="Category"
              options={GEAR_PART_CATEGORIES.map((c) => ({
                value: c.key,
                label: c.label,
                count: categoryCounts.get(c.key) ?? 0,
              })).filter((o) => o.count > 0)}
              selected={categoryFilter}
              onToggle={toggleCategory}
              onClear={() => setCategoryFilter(new Set())}
            />
            <ChipRow
              label="Status"
              options={STATUS_ORDER.map((status) => ({
                value: status,
                label: STATUS_LABELS[status],
                count: statusCounts.get(status) ?? 0,
              })).filter((o) => o.count > 0)}
              selected={statusFilter}
              onToggle={toggleStatus}
              onClear={() => setStatusFilter(new Set())}
            />
          </div>

          {categoryGroups.length === 0 ? (
            <Card>
              <CardContent className="py-5 md:py-6">
                <p className="text-sm leading-5 text-ink-600">
                  No parts match the current filters.
                </p>
              </CardContent>
            </Card>
          ) : (
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
                      const catalogItem = catalogById.get(
                        instance.catalogItemId
                      );
                      const activeInstall = findActiveInstall(
                        instance,
                        installRecords
                      );
                      const latestRemoval = findLatestRemoval(
                        instance,
                        installRecords
                      );
                      const installedBike = activeInstall
                        ? bikes.find((b) => b.id === activeInstall.bikeId) ?? null
                        : null;
                      const attributes = catalogItem
                        ? formatAttributes(catalogItem.attributes)
                        : null;
                      const lifetimeMiles = computePartLifetimeMileage({
                        instance,
                        installRecords,
                        bikes,
                      });

                      const title = instance.label
                        ? instance.label
                        : catalogItem
                          ? catalogTitle(catalogItem)
                          : 'Physical part';

                      let dateEntry: { label: string; value: string } | null = null;
                      if (
                        instance.status === 'installed' &&
                        activeInstall?.installedDateIso
                      ) {
                        const value = formatDate(activeInstall.installedDateIso);
                        if (value) dateEntry = { label: 'Installed', value };
                      } else if (
                        instance.status === 'retired' &&
                        instance.retiredDateIso
                      ) {
                        const value = formatDate(instance.retiredDateIso);
                        if (value) dateEntry = { label: 'Retired', value };
                      } else if (
                        instance.status === 'removed' &&
                        latestRemoval?.removedDateIso
                      ) {
                        const value = formatDate(latestRemoval.removedDateIso);
                        if (value) dateEntry = { label: 'Removed', value };
                      } else if (instance.acquiredDateIso) {
                        const value = formatDate(instance.acquiredDateIso);
                        if (value) dateEntry = { label: 'Acquired', value };
                      }

                      return (
                        <Card key={instance.id}>
                          <CardContent className="space-y-3 py-3.5 md:py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="break-words text-base font-semibold leading-6 text-ink-900">
                                  {title}
                                </p>
                                {!catalogItem ? (
                                  <p className="text-sm leading-5 text-rose-700">
                                    Catalog part unavailable
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 items-start gap-1">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[instance.status]}`}
                                >
                                  {STATUS_LABELS[instance.status]}
                                </span>
                                <OverflowMenu
                                  items={[
                                    {
                                      label: 'Edit',
                                      onSelect: () => onEdit(instance.id),
                                    },
                                    {
                                      label: 'Delete',
                                      tone: 'danger',
                                      onSelect: () => handleDelete(instance),
                                    },
                                  ]}
                                />
                              </div>
                            </div>

                            {attributes || catalogItem?.weightGrams ? (
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-sm leading-5 text-ink-600">
                                {attributes ? <span>{attributes}</span> : null}
                                {catalogItem?.weightGrams ? (
                                  <>
                                    {attributes ? (
                                      <span aria-hidden="true" className="text-ink-400">
                                        ·
                                      </span>
                                    ) : null}
                                    <span>{catalogItem.weightGrams} g</span>
                                  </>
                                ) : null}
                              </div>
                            ) : null}

                            <dl className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[color:var(--border-soft)] pt-2.5 text-sm leading-5">
                              {lifetimeMiles !== null ? (
                                <div className="flex items-baseline gap-1.5">
                                  <dt className="section-kicker text-[0.66rem] text-ink-500">
                                    Miles
                                  </dt>
                                  <dd className="font-medium tabular-nums text-ink-900">
                                    {formatMileage(lifetimeMiles)}
                                  </dd>
                                </div>
                              ) : null}
                              {installedBike ? (
                                <div className="flex items-baseline gap-1.5">
                                  <dt className="section-kicker text-[0.66rem] text-ink-500">
                                    Bike
                                  </dt>
                                  <dd className="text-ink-700">{installedBike.name}</dd>
                                </div>
                              ) : null}
                              {dateEntry ? (
                                <div className="flex items-baseline gap-1.5">
                                  <dt className="section-kicker text-[0.66rem] text-ink-500">
                                    {dateEntry.label}
                                  </dt>
                                  <dd className="text-ink-700">{dateEntry.value}</dd>
                                </div>
                              ) : null}
                            </dl>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
