import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import {
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DividedRowList,
  Input,
} from '@/components/ui';
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

interface GearShelfProps {
  catalog: GearPartCatalogItem[];
  instances: GearPartInstance[];
  installRecords: GearInstallRecord[];
  bikes: Bike[];
  onAddPart: () => void;
  onEdit: (instanceId: string) => void;
}

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

const HISTORY_STATUSES: GearPartInstanceStatus[] = ['removed', 'retired'];
const SEARCH_THRESHOLD = 8;

function formatDate(dateIso?: string): string | null {
  if (!dateIso) return null;
  const date = new Date(`${dateIso}T00:00:00`);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatMileage(miles: number): string {
  return `${Math.round(miles).toLocaleString('en-US')} mi`;
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
      .join(' · ');
  }

  if (attributes.category === 'brake_pad') {
    return [attributes.compound, attributes.padShape].filter(Boolean).join(' · ');
  }

  if (attributes.category === 'cassette') {
    return [
      attributes.range,
      attributes.speedCount && `${attributes.speedCount}-speed`,
    ]
      .filter(Boolean)
      .join(' · ');
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

function instanceTitle(
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

function searchableText(
  instance: GearPartInstance,
  catalogItem: GearPartCatalogItem | undefined
): string {
  const parts: string[] = [];
  if (instance.label) parts.push(instance.label);
  if (catalogItem) {
    if (catalogItem.brand) parts.push(catalogItem.brand);
    if (catalogItem.model) parts.push(catalogItem.model);
  }
  return parts.join(' ').toLowerCase();
}

interface RowProps {
  instance: GearPartInstance;
  catalogItem: GearPartCatalogItem | undefined;
  installRecords: GearInstallRecord[];
  bikes: Bike[];
  pulsed: boolean;
  demoted?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function ShelfRow({
  instance,
  catalogItem,
  installRecords,
  bikes,
  pulsed,
  demoted,
  onEdit,
  onDelete,
}: RowProps) {
  const activeInstall = findActiveInstall(instance, installRecords);
  const latestRemoval = findLatestRemoval(instance, installRecords);
  const installedBike = activeInstall
    ? bikes.find((b) => b.id === activeInstall.bikeId) ?? null
    : null;
  const attributes = catalogItem ? formatAttributes(catalogItem.attributes) : null;
  const lifetimeMiles = computePartLifetimeMileage({
    instance,
    installRecords,
    bikes,
  });

  const title = instanceTitle(instance, catalogItem);

  let dateEntry: { label: string; value: string } | null = null;
  if (instance.status === 'installed' && activeInstall?.installedDateIso) {
    const value = formatDate(activeInstall.installedDateIso);
    if (value) dateEntry = { label: 'Installed', value };
  } else if (instance.status === 'retired' && instance.retiredDateIso) {
    const value = formatDate(instance.retiredDateIso);
    if (value) dateEntry = { label: 'Retired', value };
  } else if (instance.status === 'removed' && latestRemoval?.removedDateIso) {
    const value = formatDate(latestRemoval.removedDateIso);
    if (value) dateEntry = { label: 'Removed', value };
  } else if (instance.acquiredDateIso) {
    const value = formatDate(instance.acquiredDateIso);
    if (value) dateEntry = { label: 'Acquired', value };
  }

  const summaryParts: string[] = [];
  if (attributes) summaryParts.push(attributes);
  if (catalogItem?.weightGrams) summaryParts.push(`${catalogItem.weightGrams} g`);
  summaryParts.push(
    lifetimeMiles !== null ? formatMileage(lifetimeMiles) : 'Never installed'
  );
  if (installedBike) summaryParts.push(installedBike.name);
  if (dateEntry) summaryParts.push(`${dateEntry.label} ${dateEntry.value}`);

  return (
    <div
      className={clsx(
        'flex items-start justify-between gap-2 px-3 py-2 md:px-4 md:py-2.5',
        pulsed && 'animate-saved-row rounded-md',
        demoted && 'opacity-85'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'truncate text-sm font-semibold leading-6',
              demoted ? 'text-ink-700' : 'text-ink-900'
            )}
          >
            {title}
          </span>
          <span
            className={clsx(
              'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
              STATUS_CLASSES[instance.status]
            )}
          >
            {STATUS_LABELS[instance.status]}
          </span>
        </div>
        {!catalogItem ? (
          <p className="mt-0.5 truncate text-xs leading-5 text-error-700">
            Catalog part unavailable
          </p>
        ) : null}
        <p
          className={clsx(
            'mt-0.5 truncate text-xs leading-5',
            demoted ? 'text-ink-500' : 'text-ink-600'
          )}
        >
          {summaryParts.join(' · ')}
        </p>
      </div>
      <div className="-mr-1 shrink-0 pt-0.5">
        <OverflowMenu
          label={`${title} actions`}
          items={[
            { label: 'Edit', onSelect: onEdit },
            { label: 'Delete', tone: 'danger', onSelect: onDelete },
          ]}
        />
      </div>
    </div>
  );
}

interface CategoryGroup {
  category: GearPartCategory;
  instances: GearPartInstance[];
}

function groupByCategory(
  instances: GearPartInstance[],
  catalogById: Map<string, GearPartCatalogItem>
): CategoryGroup[] {
  return GEAR_PART_CATEGORIES.map(({ key }) => {
    const matching = instances.filter((instance) => {
      const item = catalogById.get(instance.catalogItemId);
      return item?.category === key;
    });
    const sorted = [...matching].sort((a, b) => b.createdAt - a.createdAt);
    return { category: key, instances: sorted };
  }).filter((group) => group.instances.length > 0);
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function GearShelf({
  catalog,
  instances,
  installRecords,
  bikes,
  onAddPart,
  onEdit,
}: GearShelfProps) {
  const deleteGearPartInstance = useStore((s) => s.deleteGearPartInstance);

  const [categoryFilter, setCategoryFilter] = useState<
    ReadonlySet<GearPartCategory>
  >(new Set());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pulsed, setPulsed] = useState<{ id: string; token: number } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GearPartInstance | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const lastInstanceIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    };
  }, []);

  const triggerPulse = useCallback((instanceId: string) => {
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    setPulsed((prev) => ({ id: instanceId, token: (prev?.token ?? 0) + 1 }));
    pulseTimerRef.current = window.setTimeout(() => {
      setPulsed(null);
      pulseTimerRef.current = null;
    }, 700);
  }, []);

  // Pulse newly-arrived instances. Skip the initial mount so existing items don't all flash.
  useEffect(() => {
    const previous = lastInstanceIdsRef.current;
    const current = new Set(instances.map((i) => i.id));
    if (previous.size > 0) {
      const newOnes = [...current].filter((id) => !previous.has(id));
      if (newOnes.length === 1) triggerPulse(newOnes[0]);
    }
    lastInstanceIdsRef.current = current;
  }, [instances, triggerPulse]);

  const catalogById = useMemo(
    () => new Map(catalog.map((item) => [item.id, item])),
    [catalog]
  );

  const totalsByStatus = useMemo(() => {
    const counts: Record<GearPartInstanceStatus, number> = {
      spare: 0,
      installed: 0,
      removed: 0,
      retired: 0,
    };
    for (const instance of instances) counts[instance.status] += 1;
    return counts;
  }, [instances]);

  const sparesAll = useMemo(
    () => instances.filter((i) => i.status === 'spare'),
    [instances]
  );
  const historyAll = useMemo(
    () =>
      instances.filter((i) => HISTORY_STATUSES.includes(i.status)),
    [instances]
  );

  const searchTerm = search.trim().toLowerCase();
  const matchesSearch = useCallback(
    (instance: GearPartInstance) => {
      if (searchTerm.length === 0) return true;
      return searchableText(instance, catalogById.get(instance.catalogItemId)).includes(
        searchTerm
      );
    },
    [searchTerm, catalogById]
  );

  const passesCategory = useCallback(
    (instance: GearPartInstance) => {
      if (categoryFilter.size === 0) return true;
      const item = catalogById.get(instance.catalogItemId);
      if (!item) return false;
      return categoryFilter.has(item.category);
    },
    [catalogById, categoryFilter]
  );

  const filteredSpares = useMemo(
    () => sparesAll.filter((i) => passesCategory(i) && matchesSearch(i)),
    [sparesAll, passesCategory, matchesSearch]
  );

  const filteredHistory = useMemo(
    () => historyAll.filter((i) => passesCategory(i) && matchesSearch(i)),
    [historyAll, passesCategory, matchesSearch]
  );

  const sparesGroups = useMemo(
    () => groupByCategory(filteredSpares, catalogById),
    [filteredSpares, catalogById]
  );

  const historyRows = useMemo(() => {
    return [...filteredHistory].sort((a, b) => {
      const aDate = a.retiredDateIso ?? '';
      const bDate = b.retiredDateIso ?? '';
      if (aDate !== bDate) return bDate.localeCompare(aDate);
      return b.createdAt - a.createdAt;
    });
  }, [filteredHistory]);

  const categoryChipOptions = useMemo(() => {
    const counts = new Map<GearPartCategory, number>();
    const visible = historyOpen
      ? [...sparesAll, ...historyAll]
      : sparesAll;
    for (const instance of visible) {
      const item = catalogById.get(instance.catalogItemId);
      if (!item) continue;
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return GEAR_PART_CATEGORIES.map((c) => ({
      value: c.key,
      label: c.label,
      count: counts.get(c.key) ?? 0,
    })).filter((o) => o.count > 0);
  }, [sparesAll, historyAll, historyOpen, catalogById]);

  const totalInstances = instances.length;
  const showSearch = totalInstances >= SEARCH_THRESHOLD;
  const sparesVisibleCount = filteredSpares.length;
  const historyVisibleCount = filteredHistory.length;
  const filtersApplied = categoryFilter.size > 0 || searchTerm.length > 0;

  const toggleCategory = (value: GearPartCategory) => {
    setCategoryFilter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const clearFilters = () => {
    setCategoryFilter(new Set());
    setSearch('');
  };

  const closeDelete = () => {
    setPendingDelete(null);
    setDeleteError(null);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    try {
      deleteGearPartInstance(pendingDelete.id);
      closeDelete();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Could not delete this part.'
      );
    }
  };

  const pendingDeleteCatalog = pendingDelete
    ? catalogById.get(pendingDelete.catalogItemId)
    : undefined;
  const pendingDeleteTitle = pendingDelete
    ? instanceTitle(pendingDelete, pendingDeleteCatalog)
    : '';

  // ── EMPTY: nothing in inventory at all ──────────────────────────────────
  if (totalInstances === 0) {
    return (
      <div className="space-y-3">
        <div className="border-y border-dashed border-[color:var(--border-soft)] px-4 py-4 text-center">
          <p className="text-sm leading-5 text-ink-700">
            No parts yet.
          </p>
          <div className="mt-3 flex justify-center">
            <Button variant="primary" size="sm" onClick={onAddPart}>
              + Add part
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showSearch ? (
        <div className="relative">
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search shelf · brand, model, label"
            aria-label="Search shelf"
            className="pl-9"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
              <circle
                cx="7"
                cy="7"
                r="4.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="m13.5 13.5-3-3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>
      ) : null}

      {categoryChipOptions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip
            size="sm"
            tone="subtle"
            selected={categoryFilter.size === 0}
            disabled={categoryFilter.size === 0}
            onClick={() => setCategoryFilter(new Set())}
          >
            All
          </Chip>
          {categoryChipOptions.map((option) => (
            <Chip
              key={option.value}
              size="sm"
              tone="subtle"
              selected={categoryFilter.has(option.value)}
              onClick={() => toggleCategory(option.value)}
            >
              {option.label}
              <span className="ml-1 text-[0.66rem] text-ink-500 tabular-nums">
                {option.count}
              </span>
            </Chip>
          ))}
        </div>
      ) : null}

      {searchTerm.length > 0 ? (
        <p className="text-xs leading-5 text-ink-500 tabular-nums">
          {historyOpen
            ? `${sparesVisibleCount + historyVisibleCount} of ${
                sparesAll.length + historyAll.length
              } match`
            : `${sparesVisibleCount} of ${sparesAll.length} ${pluralize(
                sparesAll.length,
                'spare',
                'spares'
              ).replace(/^\d+\s/, '')} match`}
        </p>
      ) : null}

      {/* ── SPARES ─────────────────────────────────────────────────────── */}
      {sparesAll.length === 0 ? (
        <p className="text-sm leading-5 text-ink-600">
          No spares.
          {totalsByStatus.removed + totalsByStatus.retired > 0
            ? ' History has removed parts.'
            : ''}
        </p>
      ) : sparesGroups.length === 0 ? (
        <div className="border-y border-[color:var(--border-soft)] px-4 py-4 text-center">
          <p className="text-sm leading-5 text-ink-600">
            No spares match your filters.
          </p>
          {filtersApplied ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 text-xs font-medium text-brand-700 hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {sparesGroups.map((group) => (
            <section key={group.category} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="section-kicker text-[0.66rem] text-ink-500">
                  {getGearPartCategory(group.category).label}
                </p>
                <p className="text-xs text-ink-500 tabular-nums">
                  {pluralize(group.instances.length, 'spare', 'spares')}
                </p>
              </div>
              <DividedRowList
                variant="plain"
                items={group.instances}
                getKey={(instance) => instance.id}
                renderItem={(instance) => (
                  <ShelfRow
                    instance={instance}
                    catalogItem={catalogById.get(instance.catalogItemId)}
                    installRecords={installRecords}
                    bikes={bikes}
                    pulsed={pulsed?.id === instance.id}
                    onEdit={() => onEdit(instance.id)}
                    onDelete={() => setPendingDelete(instance)}
                  />
                )}
              />
            </section>
          ))}
        </div>
      )}

      {/* ── HISTORY ────────────────────────────────────────────────────── */}
      {historyAll.length > 0 ? (
        <div className="border-t border-[color:var(--border-soft)] pt-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
            className="inline-flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-shell-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink-700">
                {historyOpen ? 'Hide history' : 'Show history'}
              </span>
              <span className="text-xs text-ink-500 tabular-nums">
                ({historyAll.length})
              </span>
            </span>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
              className={clsx(
                'h-4 w-4 text-ink-500 transition-transform duration-200',
                historyOpen && 'rotate-180'
              )}
            >
              <path
                d="M5 7.5 10 12.5 15 7.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {historyOpen ? (
            <div className="mt-3">
              {historyRows.length === 0 ? (
                <p className="text-sm leading-5 text-ink-500">
                  No history matches your filters.
                </p>
              ) : (
                <DividedRowList
                  variant="plain"
                  items={historyRows}
                  getKey={(instance) => instance.id}
                  renderItem={(instance) => (
                    <ShelfRow
                      instance={instance}
                      catalogItem={catalogById.get(instance.catalogItemId)}
                      installRecords={installRecords}
                      bikes={bikes}
                      pulsed={pulsed?.id === instance.id}
                      demoted
                      onEdit={() => onEdit(instance.id)}
                      onDelete={() => setPendingDelete(instance)}
                    />
                  )}
                />
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={pendingDelete !== null}
        onClose={closeDelete}
        size="sm"
        ariaLabelledBy="delete-shelf-instance-title"
      >
        <DialogHeader
          titleId="delete-shelf-instance-title"
          title="Delete this part?"
          description={
            pendingDelete
              ? `This removes "${pendingDeleteTitle}" and any of its install records from your shelf. The catalog entry stays.`
              : undefined
          }
          onClose={closeDelete}
        />
        {deleteError ? (
          <DialogContent>
            <p className="rounded-lg bg-error-100 px-3 py-2 text-sm text-error-700">
              {deleteError}
            </p>
          </DialogContent>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={closeDelete}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
