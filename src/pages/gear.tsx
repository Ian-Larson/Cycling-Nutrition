import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '@/components/layout/page-intro';
import { useStore } from '@/store';
import { useStravaGear } from '@/hooks/use-strava-gear';
import { BikePillRow } from '@/components/gear/bike-pill-row';
import { GearTabs, type GearTabValue } from '@/components/gear/gear-tabs';
import { ActiveSetupList } from '@/components/gear/active-setup-list';
import { GearDueList } from '@/components/gear/gear-due-list';
import { PartCatalogForm } from '@/components/gear/part-catalog-form';
import { PartInstanceForm } from '@/components/gear/part-instance-form';
import { PartsInventory } from '@/components/gear/parts-inventory';
import { GearHistoryList } from '@/components/gear/gear-history-list';
import { deriveActiveSetup } from '@/lib/gear/derive-active-setup';
import { deriveGearDue } from '@/lib/gear/derive-gear-due';
import { Button, Card, CardContent } from '@/components/ui';
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

function activePartLabel(row: ActiveSetupRow): string {
  return row.instance?.label ?? row.catalogItem?.model ?? row.slotLabel;
}

export function GearPage() {
  const bikes = useStore((s) => s.bikes);
  const gearPartCatalog = useStore((s) => s.gearPartCatalog);
  const gearPartInstances = useStore((s) => s.gearPartInstances);
  const gearInstallRecords = useStore((s) => s.gearInstallRecords);
  const gearServiceEvents = useStore((s) => s.gearServiceEvents);
  const addGearPartCatalogItem = useStore((s) => s.addGearPartCatalogItem);
  const addGearPartInstances = useStore((s) => s.addGearPartInstances);
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
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(
    primaryBikeId
  );
  const [hasUserSelectedBike, setHasUserSelectedBike] = useState(false);
  const [tab, setTab] = useState<GearTabValue>('active');
  const [partsMode, setPartsMode] = useState<'list' | 'catalog' | 'instances'>(
    'list'
  );
  const [installSlotKey, setInstallSlotKey] = useState<BikeSlotKey | null>(null);
  const [removeInstallId, setRemoveInstallId] = useState<string | null>(null);
  const [serviceContext, setServiceContext] = useState<{
    bikeId?: string;
    slotKey?: BikeSlotKey;
    partInstanceId?: string;
    typeKey?: GearServiceTypeKey;
  } | null>(null);
  const [futureActionNotice, setFutureActionNotice] = useState<string | null>(
    null
  );

  const selectedBikeIdForView = useMemo(() => {
    if (selectedBikeId && bikes.some((bike) => bike.id === selectedBikeId)) {
      return selectedBikeId;
    }

    if (!hasUserSelectedBike && primaryBikeId) {
      return primaryBikeId;
    }

    if (selectedBikeId && primaryBikeId) {
      return primaryBikeId;
    }

    return null;
  }, [bikes, hasUserSelectedBike, primaryBikeId, selectedBikeId]);
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
  const inventoryCount = gearPartInstances.length;
  const activeCountLabel = {
    active: selectedBike
      ? `${activeInstalledCount} ${activeInstalledCount === 1 ? 'part' : 'parts'} installed`
      : 'Choose a bike',
    due: `${filteredDueItems.length} ${
      filteredDueItems.length === 1 ? 'item' : 'items'
    } due`,
    parts: `${inventoryCount} ${
      inventoryCount === 1 ? 'physical part' : 'physical parts'
    }`,
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

  const handleRefresh = () => {
    void refresh();
  };

  const handleSelectBike = (bikeId: string | null) => {
    setHasUserSelectedBike(true);
    setSelectedBikeId(bikeId);
  };

  const handleTabChange = (nextTab: GearTabValue) => {
    setTab(nextTab);
    if (nextTab !== 'parts') {
      setPartsMode('list');
    }
  };

  const handleQueueService = (context: {
    bikeId?: string;
    slotKey?: BikeSlotKey;
    partInstanceId?: string;
    typeKey?: GearServiceTypeKey;
    label?: string;
  }) => {
    const { label, ...nextContext } = context;
    setServiceContext(nextContext);
    setFutureActionNotice(
      label ? `Service flow is next. ${label} is selected.` : 'Service flow is next.'
    );
  };

  const handleQueueInstall = (slotKey: BikeSlotKey) => {
    const row = activeRows.find((candidate) => candidate.slotKey === slotKey);
    setInstallSlotKey(slotKey);
    setFutureActionNotice(
      row
        ? `Install flow is next. ${row.slotLabel} is selected.`
        : 'Install flow is next.'
    );
  };

  const handleQueueRemove = (row: ActiveSetupRow) => {
    setRemoveInstallId(row.installRecord?.id ?? null);
    setFutureActionNotice(
      `Remove flow is next. ${activePartLabel(row)} is selected.`
    );
  };

  const handleQueueDueService = (item: GearDueItem) => {
    handleQueueService({
      bikeId: item.event.bikeId,
      slotKey: item.event.slotKey,
      partInstanceId: item.event.partInstanceId,
      typeKey: item.event.typeKey,
      label: item.label,
    });
  };

  return (
    <div
      className="page-shell max-w-6xl space-y-4 md:space-y-6"
      data-install-slot-key={installSlotKey ?? undefined}
      data-remove-install-id={removeInstallId ?? undefined}
      data-service-bike-id={serviceContext?.bikeId ?? undefined}
      data-service-slot-key={serviceContext?.slotKey ?? undefined}
      data-service-part-instance-id={serviceContext?.partInstanceId ?? undefined}
      data-service-type-key={serviceContext?.typeKey ?? undefined}
    >
      <PageIntro
        title="Gear"
        description="Track installed parts, due service, spare inventory, and maintenance history."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              handleQueueService({
                ...(selectedBikeIdForView ? { bikeId: selectedBikeIdForView } : {}),
                label: selectedBike?.name,
              })
            }
          >
            + Log service
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,18rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <aside className="surface-note p-3 md:p-4 lg:sticky lg:top-20">
          <BikePillRow
            bikes={bikes}
            selectedBikeId={selectedBikeIdForView}
            onSelect={handleSelectBike}
            onRefresh={handleRefresh}
            isRefreshing={isFetching}
            lastSyncedAt={lastSyncedAt}
            stravaError={error}
          />
        </aside>

        <section className="min-w-0 space-y-3 md:space-y-4">
          <div className="flex flex-col gap-2 border-b border-[color:var(--border-soft)] pb-3 sm:flex-row sm:items-center sm:justify-between md:pb-4">
            <GearTabs value={tab} onChange={handleTabChange} />
            <p className="section-kicker text-[0.68rem] text-ink-500">
              {activeCountLabel}
            </p>
          </div>

          {futureActionNotice ? (
            <div
              role="status"
              className="surface-note border-brand-200 px-3 py-2 text-sm leading-5 text-ink-700"
            >
              {futureActionNotice}
            </div>
          ) : null}

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
                  label: activePartLabel(row),
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

          {tab === 'parts' && partsMode === 'list' ? (
            <PartsInventory
              catalog={gearPartCatalog}
              instances={gearPartInstances}
              onAddCatalog={() => setPartsMode('catalog')}
              onAddInstances={() => setPartsMode('instances')}
            />
          ) : null}

          {tab === 'parts' && partsMode === 'catalog' ? (
            <Card>
              <CardContent className="space-y-4 py-4 md:py-5">
                <div>
                  <p className="text-base font-semibold leading-6 text-ink-900">
                    Add catalog part
                  </p>
                  <p className="text-sm leading-5 text-ink-600">
                    Save specs for a reusable part type.
                  </p>
                </div>
                <PartCatalogForm
                  onSubmit={(payload) => {
                    addGearPartCatalogItem(payload);
                    setPartsMode('list');
                  }}
                  onCancel={() => setPartsMode('list')}
                />
              </CardContent>
            </Card>
          ) : null}

          {tab === 'parts' && partsMode === 'instances' ? (
            <Card>
              <CardContent className="space-y-4 py-4 md:py-5">
                <div>
                  <p className="text-base font-semibold leading-6 text-ink-900">
                    Add physical parts
                  </p>
                  <p className="text-sm leading-5 text-ink-600">
                    Log spare or newly acquired parts.
                  </p>
                </div>
                <PartInstanceForm
                  catalog={gearPartCatalog}
                  onSubmit={(input) => {
                    addGearPartInstances(input);
                    setPartsMode('list');
                  }}
                  onCancel={() => setPartsMode('list')}
                />
              </CardContent>
            </Card>
          ) : null}

          {tab === 'history' ? (
            <GearHistoryList
              events={filteredServiceEvents}
              bikes={bikes}
              catalog={gearPartCatalog}
              instances={gearPartInstances}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
