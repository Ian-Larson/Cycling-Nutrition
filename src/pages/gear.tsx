import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '@/components/layout/page-intro';
import { useStore } from '@/store';
import { useStravaGear } from '@/hooks/use-strava-gear';
import { BikePillRow } from '@/components/gear/bike-pill-row';
import { GearTabs } from '@/components/gear/gear-tabs';
import { Button } from '@/components/ui';

export function GearPage() {
  const bikes = useStore((s) => s.bikes);
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
          <Button variant="primary" size="sm" disabled>
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
      <div className="pt-4 text-sm text-ink-700">
        {tab === 'due' ? 'Due list coming soon' : 'History coming soon'}
      </div>
    </div>
  );
}
