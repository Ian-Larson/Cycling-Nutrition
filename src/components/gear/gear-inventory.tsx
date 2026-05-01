import { useMemo, useState } from 'react';
import { Card, CardContent, Chip, DividedRowList } from '@/components/ui';
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
  installed: 'bg-success-100 text-success-700',
  removed: 'bg-warning-100 text-warning-700',
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

  const ringLabel =
    attributes.drivetrainType === '2x' && attributes.innerRing
      ? `${attributes.outerRing}-${attributes.innerRing}T`
      : `${attributes.outerRing}T`;
  return [attributes.drivetrainType, ringLabel].filter(Boolean).join(' ');
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
        <Chip
          size="sm"
          tone="subtle"
          selected={allSelected}
          disabled={allSelected}
          onClick={onClear}
          aria-label={allSelected ? 'All selected' : 'Clear filter'}
        >
          {allSelected ? (
            'All'
          ) : (
            <>
              <svg
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
                className="h-3 w-3"
              >
                <path
                  d="m3 3 6 6M9 3l-6 6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              Clear
            </>
          )}
        </Chip>
        {options.map((option) => (
          <Chip
            key={option.value}
            size="sm"
            tone="subtle"
            selected={selected.has(option.value)}
            onClick={() => onToggle(option.value)}
          >
            {option.label}
            <span className="ml-1 text-[0.66rem] text-ink-500 tabular-nums">
              {option.count}
            </span>
          </Chip>
        ))}
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
                  <DividedRowList
                    items={group.instances}
                    getKey={(instance) => instance.id}
                    renderItem={(instance) => {
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

                      const summaryParts: string[] = [];
                      if (attributes) summaryParts.push(attributes);
                      if (catalogItem?.weightGrams) {
                        summaryParts.push(`${catalogItem.weightGrams} g`);
                      }
                      summaryParts.push(
                        lifetimeMiles !== null
                          ? formatMileage(lifetimeMiles)
                          : 'Never installed'
                      );
                      if (installedBike) summaryParts.push(installedBike.name);
                      if (dateEntry) {
                        summaryParts.push(`${dateEntry.label} ${dateEntry.value}`);
                      }

                      return (
                        <div className="flex items-start justify-between gap-2 px-3 py-2 md:px-4 md:py-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold leading-6 text-ink-900">
                                {title}
                              </span>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[instance.status]}`}
                              >
                                {STATUS_LABELS[instance.status]}
                              </span>
                            </div>
                            {!catalogItem ? (
                              <p className="mt-0.5 truncate text-xs leading-5 text-error-700">
                                Catalog part unavailable
                              </p>
                            ) : null}
                            <p className="mt-0.5 truncate text-xs leading-5 text-ink-600">
                              {summaryParts.join(' · ')}
                            </p>
                          </div>
                          <div className="-mr-1 shrink-0 pt-0.5">
                            <OverflowMenu
                              label={`${title} actions`}
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
                      );
                    }}
                  />
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
