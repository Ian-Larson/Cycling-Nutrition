import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '@/components/layout/page-intro';
import { useStore } from '@/store';
import { useStravaGear } from '@/hooks/use-strava-gear';
import { BikePillRow } from '@/components/gear/bike-pill-row';
import { GearTabs } from '@/components/gear/gear-tabs';
import { DueList } from '@/components/gear/due-list';
import { HistoryList } from '@/components/gear/history-list';
import { LogServiceSheet } from '@/components/gear/log-service-sheet';
import { deriveDue } from '@/lib/gear/derive-due';
import { Button } from '@/components/ui';
import type { ServiceTypeKey } from '@/types/gear';

export function GearPage() {
  const bikes = useStore((s) => s.bikes);
  const serviceEntries = useStore((s) => s.serviceEntries);
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
  const [tab, setTab] = useState<'due' | 'history'>('due');
  const [sheetState, setSheetState] = useState<{
    open: boolean;
    preselectedTypeKey?: ServiceTypeKey;
    preselectedBikeId?: string;
  }>({ open: false });

  const dueItems = useMemo(
    () => deriveDue(bikes, serviceEntries),
    [bikes, serviceEntries]
  );
  const filteredDueItems = useMemo(
    () =>
      selectedBikeId
        ? dueItems.filter((d) => d.bikeId === selectedBikeId)
        : dueItems,
    [dueItems, selectedBikeId]
  );
  const filteredEntries = useMemo(
    () =>
      selectedBikeId
        ? serviceEntries.filter((e) => e.bikeId === selectedBikeId)
        : serviceEntries,
    [serviceEntries, selectedBikeId]
  );

  // Mirror fresh Strava bikes into the store whenever they arrive.
  useEffect(() => {
    if (stravaBikes && stravaBikes.length > 0) {
      upsertBikesFromStrava(stravaBikes);
    }
  }, [stravaBikes, upsertBikesFromStrava]);

  const handleRefresh = () => {
    void refresh();
  };

  return (
    <div className="page-shell">
      <PageIntro
        title="Gear"
        description="Track maintenance and service intervals for your bikes."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setSheetState({ open: true })}
          >
            + Log service
          </Button>
        }
      />
      <BikePillRow
        bikes={bikes}
        selectedBikeId={selectedBikeId}
        onSelect={setSelectedBikeId}
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
        lastSyncedAt={lastSyncedAt}
        stravaError={error}
      />
      <GearTabs value={tab} onChange={setTab} />
      <div className="pt-4">
        {tab === 'due' ? (
          <DueList
            items={filteredDueItems}
            bikes={bikes}
            onLog={(bikeId, typeKey) =>
              setSheetState({
                open: true,
                preselectedTypeKey: typeKey,
                preselectedBikeId: bikeId,
              })
            }
          />
        ) : (
          <HistoryList entries={filteredEntries} bikes={bikes} />
        )}
      </div>
      <LogServiceSheet
        open={sheetState.open}
        onClose={() => setSheetState({ open: false })}
        bikes={bikes}
        entries={serviceEntries}
        preselectedTypeKey={sheetState.preselectedTypeKey}
        preselectedBikeId={sheetState.preselectedBikeId}
        stravaBikes={stravaBikes}
        onRefreshStrava={handleRefresh}
        isStravaRefreshing={isFetching}
        stravaLastSyncedAt={lastSyncedAt}
      />
    </div>
  );
}
