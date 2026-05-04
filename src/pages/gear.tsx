import { useEffect, useMemo, useRef, useState } from 'react';
import { PageIntro } from '@/components/layout/page-intro';
import { useStore } from '@/store';
import { useStravaGear } from '@/hooks/use-strava-gear';
import { BikeRailCard } from '@/components/gear/bike-rail-card';
import { ActiveSetupList } from '@/components/gear/active-setup-list';
import { ServiceTimeline } from '@/components/gear/service-timeline';
import { InstallPartSheet } from '@/components/gear/install-part-sheet';
import { LogGearServiceSheet } from '@/components/gear/log-gear-service-sheet';
import { RemovePartSheet } from '@/components/gear/remove-part-sheet';
import { EditServiceEventSheet } from '@/components/gear/edit-service-event-sheet';
import { GearShelf } from '@/components/gear/gear-shelf';
import { AddPartSheet } from '@/components/gear/add-part-sheet';
import { deriveActiveSetup } from '@/lib/gear/derive-active-setup';
import { deriveGearDue } from '@/lib/gear/derive-gear-due';
import { deriveGarageStatus } from '@/lib/gear/garage-status';
import { Button, Card, CardContent, SectionPanel } from '@/components/ui';
import type { GarageSectionKey } from '@/store';
import type {
  Bike,
  BikeSlotKey,
  GearInstallRecord,
  GearServiceTypeKey,
} from '@/types/gear';
import type { ActiveSetupRow } from '@/lib/gear/derive-active-setup';
import type { GearDueItem } from '@/lib/gear/derive-gear-due';
import type { GarageStatus } from '@/lib/gear/garage-status';

function todayIso(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isInstallActive(record: GearInstallRecord): boolean {
  return (
    record.removedAtMileageMi === undefined &&
    record.removedDateIso === undefined
  );
}

function describeActiveSetup(
  selectedBike: Bike | null,
  selectedBikeIdForView: string | null,
  installedCount: number
): string {
  if (selectedBikeIdForView === null) return 'Pick a bike to see installed parts';
  if (selectedBike === null) return 'Choose a bike';
  if (installedCount === 0) return 'No parts installed yet';
  return `${installedCount} ${installedCount === 1 ? 'part' : 'parts'} installed`;
}

function describeService(
  status: GarageStatus,
  selectedBikeId: string | null,
  hasAnyHistory: boolean
): string {
  if (!status.hasAttention) {
    if (!hasAnyHistory) return 'No history yet';
    return 'All clear';
  }

  if (selectedBikeId === null) {
    const total =
      status.garageWideCounts.overdue + status.garageWideCounts.soon;
    return `${total} due across your garage`;
  }

  const thisBikeTotal =
    status.thisBikeCounts.overdue + status.thisBikeCounts.soon;
  const elsewhereOverdue = status.elsewhereCounts.overdue;
  const elsewhereSoon = status.elsewhereCounts.soon;
  const elsewhereTotal = elsewhereOverdue + elsewhereSoon;

  const elsewhereSuffix =
    elsewhereOverdue > 0
      ? `${elsewhereOverdue} overdue elsewhere`
      : `${elsewhereSoon} due soon elsewhere`;

  if (thisBikeTotal === 0) return elsewhereSuffix;
  if (elsewhereTotal === 0) {
    return `${thisBikeTotal} due on this bike`;
  }
  return `${thisBikeTotal} due on this bike, ${elsewhereSuffix}`;
}

interface AllBikesActiveStackProps {
  bikes: Bike[];
  installRecords: GearInstallRecord[];
  perBikeUrgency: GarageStatus['perBikeUrgency'];
  onSelectBike: (bikeId: string) => void;
}

function AllBikesActiveStack({
  bikes,
  installRecords,
  perBikeUrgency,
  onSelectBike,
}: AllBikesActiveStackProps) {
  if (bikes.length === 0) {
    return (
      <Card>
        <CardContent className="py-5 md:py-6">
          <p className="text-sm leading-5 text-ink-600">
            Add a bike to start tracking gear and service.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {bikes.map((bike) => {
        const installedCount = installRecords.filter(
          (record) => record.bikeId === bike.id && isInstallActive(record)
        ).length;
        const urgency = perBikeUrgency[bike.id] ?? null;
        const urgencyLabel =
          urgency === 'overdue'
            ? 'Service overdue'
            : urgency === 'soon'
              ? 'Service due soon'
              : null;
        return (
          <li key={bike.id}>
            <button
              type="button"
              onClick={() => onSelectBike(bike.id)}
              aria-label={`View active setup for ${bike.name}`}
              className="surface-note group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-shell-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100 md:px-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-5 text-ink-900">
                  {bike.name}
                  {bike.isPrimary ? (
                    <span className="ml-1.5 align-middle text-xs font-normal text-ink-500">
                      ·primary
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 truncate text-xs leading-5 text-ink-600 tabular-nums">
                  {installedCount}{' '}
                  {installedCount === 1 ? 'part' : 'parts'} installed
                  {urgencyLabel ? ` · ${urgencyLabel.toLowerCase()}` : ''}
                </p>
              </div>
              <span
                aria-hidden
                className="text-ink-500 transition-colors group-hover:text-ink-700"
              >
                →
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function GearPage() {
  const bikes = useStore((s) => s.bikes);
  const gearPartCatalog = useStore((s) => s.gearPartCatalog);
  const gearPartInstances = useStore((s) => s.gearPartInstances);
  const gearInstallRecords = useStore((s) => s.gearInstallRecords);
  const gearServiceEvents = useStore((s) => s.gearServiceEvents);
  const installGearPart = useStore((s) => s.installGearPart);
  const removeGearPart = useStore((s) => s.removeGearPart);
  const logGearServiceEvent = useStore((s) => s.logGearServiceEvent);
  const upsertBikesFromStrava = useStore((s) => s.upsertBikesFromStrava);
  const {
    bikes: stravaBikes,
    isFetching,
    error,
    lastSyncedAt,
    refresh,
  } = useStravaGear();

  const primaryBikeId = useMemo(
    () => bikes.find((b) => b.isPrimary)?.id ?? null,
    [bikes]
  );
  const selectedBikeId = useStore((s) => s.gearSelectedBikeId);
  const setGearSelectedBikeId = useStore((s) => s.setGearSelectedBikeId);
  const sectionsOpen = useStore((s) => s.gearSectionsOpen);
  const toggleGearSection = useStore((s) => s.toggleGearSection);

  const [installSlotKey, setInstallSlotKey] = useState<BikeSlotKey | null>(null);
  const [removeInstallId, setRemoveInstallId] = useState<string | null>(null);
  const [serviceContext, setServiceContext] = useState<{
    bikeId?: string;
    slotKey?: BikeSlotKey;
    partInstanceId?: string;
    typeKey?: GearServiceTypeKey;
  } | null>(null);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [editPartInstanceId, setEditPartInstanceId] = useState<string | null>(null);

  const selectedBikeIdForView = useMemo(() => {
    if (selectedBikeId && bikes.some((bike) => bike.id === selectedBikeId)) {
      return selectedBikeId;
    }
    if (selectedBikeId === null) return null;
    return primaryBikeId;
  }, [bikes, primaryBikeId, selectedBikeId]);
  const selectedBike = useMemo(
    () => bikes.find((bike) => bike.id === selectedBikeIdForView) ?? null,
    [bikes, selectedBikeIdForView]
  );

  const currentTodayIso = useMemo(() => todayIso(), []);

  const activeRows = useMemo(
    () =>
      selectedBike
        ? deriveActiveSetup({
            bike: selectedBike,
            catalog: gearPartCatalog,
            instances: gearPartInstances,
            installRecords: gearInstallRecords,
            serviceEvents: gearServiceEvents,
            today: currentTodayIso,
          })
        : [],
    [
      currentTodayIso,
      gearInstallRecords,
      gearPartCatalog,
      gearPartInstances,
      gearServiceEvents,
      selectedBike,
    ]
  );

  const dueItems = useMemo(
    () =>
      deriveGearDue({
        bikes,
        installRecords: gearInstallRecords,
        serviceEvents: gearServiceEvents,
        today: currentTodayIso,
      }),
    [bikes, currentTodayIso, gearInstallRecords, gearServiceEvents]
  );

  const garageStatus = useMemo(
    () =>
      deriveGarageStatus({
        bikes,
        dueItems,
        selectedBikeId: selectedBikeIdForView,
      }),
    [bikes, dueItems, selectedBikeIdForView]
  );

  const filteredDueItems = useMemo(
    () =>
      selectedBikeIdForView
        ? dueItems.filter((d) => d.bikeId === selectedBikeIdForView)
        : dueItems,
    [dueItems, selectedBikeIdForView]
  );

  const filteredServiceEvents = useMemo(
    () =>
      selectedBikeIdForView
        ? gearServiceEvents.filter(
            (event) => event.bikeId === selectedBikeIdForView
          )
        : gearServiceEvents,
    [gearServiceEvents, selectedBikeIdForView]
  );

  const filteredInstallRecords = useMemo(
    () =>
      selectedBikeIdForView
        ? gearInstallRecords.filter(
            (record) => record.bikeId === selectedBikeIdForView
          )
        : gearInstallRecords,
    [gearInstallRecords, selectedBikeIdForView]
  );

  const activeInstalledCount = activeRows.filter(
    (row) => row.installRecord !== null
  ).length;

  const shelfSparesCount = useMemo(
    () => gearPartInstances.filter((i) => i.status === 'spare').length,
    [gearPartInstances]
  );
  const shelfHistoryCount = useMemo(
    () =>
      gearPartInstances.filter(
        (i) => i.status === 'removed' || i.status === 'retired'
      ).length,
    [gearPartInstances]
  );

  const hasAnyHistory =
    gearServiceEvents.length > 0 || gearInstallRecords.length > 0;

  const activeSummary = describeActiveSetup(
    selectedBike,
    selectedBikeIdForView,
    activeInstalledCount
  );
  const serviceSummary = describeService(
    garageStatus,
    selectedBikeIdForView,
    hasAnyHistory
  );
  const shelfSummary = (() => {
    if (shelfSparesCount === 0 && shelfHistoryCount === 0) {
      return 'Track spares, retired parts, and what’s come off the bike.';
    }
    const sparesPiece =
      shelfSparesCount === 0
        ? 'Nothing on the shelf'
        : `${shelfSparesCount} ${shelfSparesCount === 1 ? 'spare' : 'spares'}`;
    return `${sparesPiece} · across your garage`;
  })();

  // Mirror fresh Strava bikes into the store whenever they arrive.
  useEffect(() => {
    if (stravaBikes && stravaBikes.length > 0) {
      upsertBikesFromStrava(stravaBikes);
    }
  }, [stravaBikes, upsertBikesFromStrava]);

  // Seed the selection with the primary bike on first mount only. A user who
  // explicitly picks "All bikes" stays on null until they pick a bike.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (primaryBikeId === null) return;
    if (!bikes.some((b) => b.id === primaryBikeId)) return;
    if (useStore.getState().gearSelectedBikeId === null) {
      setGearSelectedBikeId(primaryBikeId);
    }
    seededRef.current = true;
  }, [bikes, primaryBikeId, setGearSelectedBikeId]);

  const handleRefresh = () => {
    void refresh();
  };

  const handleSelectBike = (bikeId: string | null) => {
    setGearSelectedBikeId(bikeId);
  };

  const togglePanel = (section: GarageSectionKey) => {
    toggleGearSection(section);
  };

  const handleQueueService = (context: {
    bikeId?: string;
    slotKey?: BikeSlotKey;
    partInstanceId?: string;
    typeKey?: GearServiceTypeKey;
  }) => {
    setServiceContext(context);
  };

  const handleQueueInstall = (slotKey: BikeSlotKey) => {
    setInstallSlotKey(slotKey);
  };

  const handleQueueRemove = (row: ActiveSetupRow) => {
    setRemoveInstallId(row.installRecord?.id ?? null);
  };

  const handleQueueDueService = (item: GearDueItem) => {
    handleQueueService({
      bikeId: item.event.bikeId,
      slotKey: item.event.slotKey,
      partInstanceId: item.event.partInstanceId,
      typeKey: item.event.typeKey,
    });
  };

  const handleSelectBikeFromStack = (bikeId: string) => {
    setGearSelectedBikeId(bikeId);
    if (!sectionsOpen.active) toggleGearSection('active');
  };

  const removeInstallRecord =
    gearInstallRecords.find((record) => record.id === removeInstallId) ?? null;
  const removeInstance =
    removeInstallRecord === null
      ? null
      : gearPartInstances.find(
          (instance) => instance.id === removeInstallRecord.partInstanceId
        ) ?? null;
  const removeCatalogItem =
    removeInstance === null
      ? null
      : gearPartCatalog.find(
          (item) => item.id === removeInstance.catalogItemId
        ) ?? null;
  const serviceBike =
    serviceContext?.bikeId === undefined
      ? selectedBike
      : bikes.find((bike) => bike.id === serviceContext.bikeId) ?? selectedBike;

  const metaPieces: string[] = [];
  if (shelfSparesCount > 0) {
    metaPieces.push(
      `${shelfSparesCount} ${shelfSparesCount === 1 ? 'spare' : 'spares'}`
    );
  }
  if (shelfHistoryCount > 0) {
    metaPieces.push(`${shelfHistoryCount} in history`);
  }
  const metaLabel = metaPieces.join(' · ');

  return (
    <div className="page-shell space-y-4 md:space-y-6">
      <PageIntro
        title="Garage"
        description="Installed parts, service schedule, shelf."
        meta={
          metaLabel ? (
            <a
              href="#shelf"
              onClick={(event) => {
                event.preventDefault();
                if (!sectionsOpen.shelf) toggleGearSection('shelf');
                window.history.replaceState(null, '', '#shelf');
                requestAnimationFrame(() => {
                  document
                    .getElementById('shelf')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }}
              className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-brand-700 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-100"
            >
              {metaLabel}
              <span aria-hidden>↓</span>
            </a>
          ) : null
        }
      />

      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start lg:gap-5 lg:space-y-0 xl:gap-6">
        <aside className="space-y-3 lg:order-2 lg:sticky lg:top-[5.25rem]">
          <BikeRailCard
            bikes={bikes}
            selectedBike={selectedBike}
            selectedBikeId={selectedBikeIdForView}
            perBikeUrgency={garageStatus.perBikeUrgency}
            worstAcrossGarage={garageStatus.worstAcrossGarage}
            installRecords={gearInstallRecords}
            instances={gearPartInstances}
            catalog={gearPartCatalog}
            onSelectBike={handleSelectBike}
            onRefresh={handleRefresh}
            isRefreshing={isFetching}
            lastSyncedAt={lastSyncedAt}
            stravaError={error}
          />
        </aside>

        <section className="min-w-0 space-y-3 md:space-y-4 lg:order-1">
          <SectionPanel
            id="active"
            title="Active setup"
            subtitle={activeSummary}
            open={sectionsOpen.active}
            onToggle={() => togglePanel('active')}
          >
            {selectedBike ? (
              <ActiveSetupList
                rows={activeRows}
                onInstall={handleQueueInstall}
                onRemove={handleQueueRemove}
                onService={(row) =>
                  handleQueueService({
                    bikeId: selectedBike.id,
                    slotKey: row.slotKey,
                    partInstanceId: row.instance?.id,
                    typeKey: row.latestService?.typeKey,
                  })
                }
              />
            ) : selectedBikeIdForView === null ? (
              <AllBikesActiveStack
                bikes={bikes}
                installRecords={gearInstallRecords}
                perBikeUrgency={garageStatus.perBikeUrgency}
                onSelectBike={handleSelectBikeFromStack}
              />
            ) : (
              <Card>
                <CardContent className="py-5 md:py-6">
                  <p className="text-sm leading-5 text-ink-600">
                    Choose a bike to view its active setup.
                  </p>
                </CardContent>
              </Card>
            )}
          </SectionPanel>

          <SectionPanel
            id="service"
            title="Service"
            subtitle={serviceSummary}
            open={sectionsOpen.service}
            onToggle={() => togglePanel('service')}
          >
            <ServiceTimeline
              dueItems={filteredDueItems}
              events={filteredServiceEvents}
              installRecords={filteredInstallRecords}
              bikes={bikes}
              catalog={gearPartCatalog}
              instances={gearPartInstances}
              showBikeName={selectedBikeIdForView === null}
              onLogService={handleQueueDueService}
              onEditEvent={(id) => setEditEventId(id)}
            />
          </SectionPanel>

          <SectionPanel
            id="shelf"
            title="Shelf"
            subtitle={shelfSummary}
            open={sectionsOpen.shelf}
            onToggle={() => togglePanel('shelf')}
            actions={
              gearPartInstances.length > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAddPartOpen(true)}
                >
                  + Add part
                </Button>
              ) : null
            }
          >
            <GearShelf
              catalog={gearPartCatalog}
              instances={gearPartInstances}
              installRecords={gearInstallRecords}
              bikes={bikes}
              onAddPart={() => setAddPartOpen(true)}
              onEdit={(id) => setEditPartInstanceId(id)}
            />
          </SectionPanel>
        </section>
      </div>

      <InstallPartSheet
        open={installSlotKey !== null}
        onClose={() => setInstallSlotKey(null)}
        bikeId={selectedBikeIdForView}
        slotKey={installSlotKey}
        catalog={gearPartCatalog}
        instances={gearPartInstances}
        installRecords={gearInstallRecords}
        currentMileageMi={selectedBike?.cachedOdometerMi ?? null}
        onInstall={(input) => {
          installGearPart(input);
          setInstallSlotKey(null);
        }}
      />

      <RemovePartSheet
        open={removeInstallId !== null}
        onClose={() => setRemoveInstallId(null)}
        installRecord={removeInstallRecord}
        instance={removeInstance}
        catalogItem={removeCatalogItem}
        currentMileageMi={selectedBike?.cachedOdometerMi ?? null}
        onRemove={(input) => {
          removeGearPart(input);
          setRemoveInstallId(null);
        }}
      />

      <LogGearServiceSheet
        open={serviceContext !== null}
        onClose={() => setServiceContext(null)}
        bikes={bikes}
        catalog={gearPartCatalog}
        instances={gearPartInstances}
        installRecords={gearInstallRecords}
        initialContext={serviceContext}
        currentMileageMi={serviceBike?.cachedOdometerMi ?? null}
        onSave={(event) => {
          logGearServiceEvent(event);
          setServiceContext(null);
        }}
      />

      <AddPartSheet
        open={addPartOpen || editPartInstanceId !== null}
        instanceId={editPartInstanceId}
        onClose={() => {
          setAddPartOpen(false);
          setEditPartInstanceId(null);
        }}
      />

      <EditServiceEventSheet
        open={editEventId !== null}
        event={
          editEventId
            ? gearServiceEvents.find((e) => e.id === editEventId) ?? null
            : null
        }
        bikes={bikes}
        catalog={gearPartCatalog}
        instances={gearPartInstances}
        installRecords={gearInstallRecords}
        onClose={() => setEditEventId(null)}
      />
    </div>
  );
}
