import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '@/components/layout/page-intro';
import { useStore } from '@/store';
import { useStravaGear } from '@/hooks/use-strava-gear';
import { BikePillRow } from '@/components/gear/bike-pill-row';
import { BikeSystemCard } from '@/components/gear/bike-system-card';
import { GearSubNav } from '@/components/gear/gear-sub-nav';
import { GearTabs, type GearTabValue } from '@/components/gear/gear-tabs';
import { ActiveSetupList } from '@/components/gear/active-setup-list';
import { GearDueList } from '@/components/gear/gear-due-list';
import { GearDuePreviewBand } from '@/components/gear/gear-due-preview-band';
import { InstallPartSheet } from '@/components/gear/install-part-sheet';
import { LogGearServiceSheet } from '@/components/gear/log-gear-service-sheet';
import { RemovePartSheet } from '@/components/gear/remove-part-sheet';
import { GearHistoryTable } from '@/components/gear/gear-history-table';
import { EditServiceEventSheet } from '@/components/gear/edit-service-event-sheet';
import { deriveActiveSetup } from '@/lib/gear/derive-active-setup';
import { deriveGearDue } from '@/lib/gear/derive-gear-due';
import { Card, CardContent } from '@/components/ui';
import type { BikeSlotKey, GearServiceTypeKey } from '@/types/gear';
import type { ActiveSetupRow } from '@/lib/gear/derive-active-setup';
import type { GearDueItem } from '@/lib/gear/derive-gear-due';

function todayIso(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const [tab, setTab] = useState<GearTabValue>('active');
  const [installSlotKey, setInstallSlotKey] = useState<BikeSlotKey | null>(null);
  const [removeInstallId, setRemoveInstallId] = useState<string | null>(null);
  const [serviceContext, setServiceContext] = useState<{
    bikeId?: string;
    slotKey?: BikeSlotKey;
    partInstanceId?: string;
    typeKey?: GearServiceTypeKey;
  } | null>(null);
  const [editEventId, setEditEventId] = useState<string | null>(null);

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
        ? gearServiceEvents.filter((event) => event.bikeId === selectedBikeIdForView)
        : gearServiceEvents,
    [gearServiceEvents, selectedBikeIdForView]
  );
  const activeInstalledCount = activeRows.filter(
    (row) => row.installRecord !== null
  ).length;
  const activeCountLabel = {
    active: selectedBike
      ? `${activeInstalledCount} ${activeInstalledCount === 1 ? 'part' : 'parts'} installed`
      : 'Choose a bike',
    due: `${filteredDueItems.length} ${
      filteredDueItems.length === 1 ? 'item' : 'items'
    } due`,
    history: `${filteredServiceEvents.length} ${
      filteredServiceEvents.length === 1 ? 'service' : 'services'
    } logged`,
  }[tab];

  // Mirror fresh Strava bikes into the store whenever they arrive.
  useEffect(() => {
    if (stravaBikes && stravaBikes.length > 0) {
      upsertBikesFromStrava(stravaBikes);
    }
  }, [stravaBikes, upsertBikesFromStrava]);

  // Seed the selection with the primary bike on first mount so a brand-new
  // user doesn't land on "All bikes". Only seed when nothing is stored yet;
  // a user who explicitly picks "All bikes" stays on null.
  useEffect(() => {
    if (selectedBikeId !== null) return;
    if (primaryBikeId === null) return;
    const stored = useStore.getState().gearSelectedBikeId;
    if (stored === null && !bikes.some((b) => b.id === primaryBikeId)) return;
    if (stored === null) setGearSelectedBikeId(primaryBikeId);
  }, [bikes, primaryBikeId, selectedBikeId, setGearSelectedBikeId]);

  const handleRefresh = () => {
    void refresh();
  };

  const handleSelectBike = (bikeId: string | null) => {
    setGearSelectedBikeId(bikeId);
  };

  const handleTabChange = (nextTab: GearTabValue) => {
    setTab(nextTab);
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

  return (
    <div
      className="page-shell max-w-6xl space-y-4 md:space-y-6"
    >
      <PageIntro
        title="Garage"
        description="Track installed parts, due service, spare inventory, and maintenance history."
      />

      <GearSubNav />

      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,18rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <aside className="space-y-3 lg:sticky lg:top-20">
          <div className="surface-note p-3 md:p-4">
            <BikePillRow
              bikes={bikes}
              selectedBikeId={selectedBikeIdForView}
              onSelect={handleSelectBike}
              onRefresh={handleRefresh}
              isRefreshing={isFetching}
              lastSyncedAt={lastSyncedAt}
              stravaError={error}
            />
          </div>
          {selectedBike ? (
            <BikeSystemCard
              bike={selectedBike}
              installRecords={gearInstallRecords}
              instances={gearPartInstances}
              catalog={gearPartCatalog}
            />
          ) : null}
        </aside>

        <section className="min-w-0 space-y-3 md:space-y-4">
          {tab !== 'due' ? (
            <GearDuePreviewBand
              items={filteredDueItems}
              bikes={bikes}
              onLogService={handleQueueDueService}
              onViewAll={() => setTab('due')}
              selectedBikeId={selectedBikeIdForView}
            />
          ) : null}
          <div className="flex flex-col gap-2 border-b border-[color:var(--border-soft)] pb-3 sm:flex-row sm:items-center sm:justify-between md:pb-4">
            <GearTabs value={tab} onChange={handleTabChange} />
            <p className="section-kicker text-[0.68rem] text-ink-500">
              {activeCountLabel}
            </p>
          </div>

          {tab === 'active' && !selectedBike ? (
            <Card>
              <CardContent className="py-5 md:py-6">
                <p className="text-sm leading-5 text-ink-600">
                  Choose a bike to view its active setup.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {tab === 'active' && selectedBike ? (
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
          ) : null}

          {tab === 'due' ? (
            <GearDueList
              items={filteredDueItems}
              bikes={bikes}
              onLogService={handleQueueDueService}
            />
          ) : null}

          {tab === 'history' ? (
            <GearHistoryTable
              events={filteredServiceEvents}
              installRecords={
                selectedBikeIdForView
                  ? gearInstallRecords.filter(
                      (record) => record.bikeId === selectedBikeIdForView
                    )
                  : gearInstallRecords
              }
              bikes={bikes}
              catalog={gearPartCatalog}
              instances={gearPartInstances}
              onEditEvent={(id) => setEditEventId(id)}
            />
          ) : null}
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
